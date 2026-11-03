"""Scénarios de bout en bout — parcours réels de l'application (preuve de test pour le jury).

Chaque test rejoue une action concrète de la démo, sans dépendance externe (base SQLite
en mémoire, aucun secret LLM/Telegram requis) :

  • Un client passe une commande depuis la vitrine (retrait puis livraison géolocalisée).
  • Un client discute avec le chatbot IA, qui consulte le catalogue et crée la commande.
  • Un client crée un compte web et retrouve ses commandes.
  • Les garde-fous « zéro hallucination » (produit inconnu, stock insuffisant) sont respectés.
  • Le badge « best-seller » de la vitrine reflète les vraies ventes.

Ils s'exécutent avec : `pytest` (tout au vert = application vérifiée de bout en bout).
"""
from app import livraison, models
from app.ai import engine

# Coordonnées d'un point de Casablanca (quartier Maârif) pour le scénario de livraison.
CASA_LAT, CASA_LNG = 33.5883, -7.6114


# ====================================================================
#  Scénario 1 — Un client passe une commande depuis la vitrine (retrait)
# ====================================================================

def test_client_passe_commande_retrait_depuis_la_vitrine(client, seed):
    """Parcours nominal : panier → commande → n° de suivi, stock décrémenté, vrai total."""
    r = client.post("/api/commander", json={
        "mode": "retrait", "nom": "Yasmine",
        "lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 2}],
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total"] == 4400.0          # 2 × 2200 DH, calculé côté serveur
    assert data["mode"] == "retrait"
    assert data["suivi_url"] == f"/suivi?id={data['numero']}"

    # Le stock réel a bien été décrémenté (10 − 2), visible sur la vitrine publique.
    vitrine = client.get("/api/vitrine").json()
    sac = next(p for p in vitrine["produits"] if p["nom"] == "Sac à main cuir grainé chocolat")
    assert sac["stock"] == 8


def test_suivi_de_commande_est_public_et_liste_les_lignes(client, seed):
    """La page de suivi (polling) renvoie l'état d'avancement sans authentification."""
    numero = client.post("/api/commander", json={
        "mode": "retrait", "lignes": [{"produit": "Montre ovale dorée", "quantite": 4}],
    }).json()["numero"]

    r = client.get(f"/api/commande/{numero}/suivi")
    assert r.status_code == 200
    suivi = r.json()
    assert suivi["mode"] == "retrait"
    assert suivi["etape_courante"] == 0                    # « Commande reçue »
    assert suivi["etapes"][0]["faite"] is True
    assert {"produit": "Montre ovale dorée", "quantite": 4} in suivi["lignes"]


# ====================================================================
#  Scénario 2 — Commande en livraison + suivi géolocalisé du livreur
# ====================================================================

def test_commande_livraison_puis_livraison_demarree_et_livree(client, seed, login, monkeypatch):
    """Commande en livraison → le commerçant lance la livraison → l'app chauffeur poste
    sa position → l'étape passe à « en route » puis « livrée » (moteur de livraison réel)."""
    # Pas de notification externe pendant le test (contrat best-effort).
    monkeypatch.setattr(livraison, "notifier_client", lambda *a, **k: None)

    numero = client.post("/api/commander", json={
        "mode": "livraison", "nom": "Karim", "telephone": "0612345678",
        "adresse": "Maârif, Casablanca", "lat": CASA_LAT, "lng": CASA_LNG,
        "lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 1}],
    }).json()["numero"]

    headers = login("admin@smartshop.ma", "admin123")

    # Le commerçant confie la commande au livreur (simulation=false : pas de thread en test).
    r = client.post(f"/api/commandes/{numero}/livraison/demarrer?simulation=false", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["suivi_livraison"] == "en_route"

    # L'app chauffeur poste sa position À l'adresse du client → étape « livrée ».
    r = client.post(f"/api/commandes/{numero}/livreur/position", headers=headers,
                    json={"lat": CASA_LAT, "lng": CASA_LNG})
    assert r.status_code == 200, r.text
    assert r.json()["suivi"] == "livree"

    # La page de suivi reflète la livraison terminée (dernière étape atteinte).
    suivi = client.get(f"/api/commande/{numero}/suivi").json()
    assert suivi["suivi_livraison"] == "livree"
    assert suivi["etape_courante"] == 5                    # « Livrée »


# ====================================================================
#  Scénario 3 — Un client discute avec le chatbot IA et passe commande
# ====================================================================
#  On rejoue une VRAIE conversation : le moteur agentique (engine.generer_reponse),
#  la couche d'outils et la base sont réels ; seul l'appel au LLM est scénarisé
#  (déterministe, aucune clé requise) — comme si le modèle décidait ces actions.

class _FakeFn:
    def __init__(self, name, arguments):
        self.name, self.arguments = name, arguments


class _FakeToolCall:
    def __init__(self, id, name, arguments):
        self.id, self.type = id, "function"
        self.function = _FakeFn(name, arguments)

    def model_dump(self):
        return {"id": self.id, "type": "function",
                "function": {"name": self.function.name, "arguments": self.function.arguments}}


class _FakeMessage:
    def __init__(self, content=None, tool_calls=None):
        self.content, self.tool_calls = content, tool_calls


class _FakeResponse:
    def __init__(self, message):
        self.choices = [type("C", (), {"message": message})()]


def _script_llm(monkeypatch, *messages):
    """Scénarise les réponses successives du LLM (function-calling puis texte)."""
    it = iter(messages)
    monkeypatch.setattr(engine, "_appeler_llm", lambda _messages: _FakeResponse(next(it)))


def _dire(db, conversation, texte):
    """Le client envoie un message dans la conversation."""
    db.add(models.Message(conversation_id=conversation.id,
                          emetteur=models.Emetteur.CLIENT, contenu=texte))
    db.commit()


def test_conversation_ia_le_client_consulte_la_carte_puis_commande(db, seed, conversation, monkeypatch):
    """Le client demande la carte (l'IA appelle lister_produits), puis commande 2 sacs
    (l'IA appelle creer_commande) : une vraie commande est créée avec le bon total/stock."""
    _script_llm(
        monkeypatch,
        # Tour 1 : « chno kayn 3ndkom ? » → l'IA consulte le catalogue…
        _FakeMessage(tool_calls=[_FakeToolCall("c1", "lister_produits", "{}")]),
        # …puis répond en texte.
        _FakeMessage(content="On a Sac à main cuir grainé chocolat (2200 DH) et Montre ovale dorée (1600 DH). Vous voulez quoi ? 😊"),
        # Tour 2 : « bghit jouj sac » → l'IA crée la commande…
        _FakeMessage(tool_calls=[_FakeToolCall(
            "c2", "creer_commande",
            '{"lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 2}]}')]),
        # …puis confirme.
        _FakeMessage(content="C'est noté ✅ 2 sacs = 4400 DH."),
    )

    _dire(db, conversation, "Salam, chno kayn 3ndkom ?")
    reponse1 = engine.generer_reponse(db, conversation)
    assert "Sac à main cuir grainé chocolat" in reponse1                          # l'IA a bien listé la carte

    _dire(db, conversation, "bghit jouj sac")
    reponse2 = engine.generer_reponse(db, conversation)
    assert "4400" in reponse2

    # Effet réel en base : la commande existe, avec le bon total, et le stock a baissé.
    commande = db.query(models.Commande).one()
    assert commande.total == 4400.0
    assert db.get(models.Produit, seed["sac_id"]).stock == 8


def test_conversation_ia_panne_llm_ne_bloque_pas_le_client(db, seed, conversation, monkeypatch):
    """Si le LLM tombe en panne, le client reçoit un message d'attente (PAS d'escalade
    définitive qui le bloquerait) — exigence explicite du cahier des charges (NF7)."""
    def _plante(_messages):
        raise RuntimeError("LLM indisponible")
    monkeypatch.setattr(engine, "_appeler_llm", _plante)

    _dire(db, conversation, "Salam")
    reponse = engine.generer_reponse(db, conversation)

    assert reponse == engine.MESSAGE_REPLI
    db.refresh(conversation)
    assert conversation.gere_par == models.GerePar.IA       # l'IA garde la main
    assert conversation.statut == models.StatutConversation.ACTIVE


# ====================================================================
#  Scénario 4 — Compte client web : inscription → commande liée → historique
# ====================================================================

def test_compte_client_inscription_commande_et_historique(client, seed):
    """Le client crée un compte, commande en étant connecté, et retrouve sa commande
    dans « mes commandes » (en cours)."""
    r = client.post("/api/client/inscription", json={
        "nom": "Salma", "email": "salma@test.ma", "mot_de_passe": "secret", "telephone": "0700000000",
    })
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    auth = {"Authorization": f"Bearer {token}"}

    # Commande passée en étant connecté → rattachée au compte.
    client.post("/api/commander", headers=auth, json={
        "mode": "retrait", "lignes": [{"produit": "Montre ovale dorée", "quantite": 2}],
    })

    moi = client.get("/api/client/moi", headers=auth).json()
    assert moi["client"]["email"] == "salma@test.ma"
    assert len(moi["en_cours"]) == 1
    assert moi["en_cours"][0]["lignes"] == [{"produit": "Montre ovale dorée", "quantite": 2}]


def test_compte_client_connexion_refuse_mauvais_mot_de_passe(client, seed):
    client.post("/api/client/inscription", json={
        "nom": "Salma", "email": "salma@test.ma", "mot_de_passe": "secret",
    })
    r = client.post("/api/client/connexion", json={"email": "salma@test.ma", "mot_de_passe": "faux"})
    assert r.status_code == 401


# ====================================================================
#  Scénario 5 — Garde-fous « zéro hallucination » sur la commande vitrine
# ====================================================================

def test_commander_un_produit_inexistant_est_refuse(client, seed):
    """Le serveur n'invente jamais un produit : un nom hors catalogue est rejeté (400)."""
    r = client.post("/api/commander", json={"lignes": [{"produit": "Baklava", "quantite": 1}]})
    assert r.status_code == 400
    assert "introuvable" in r.json()["detail"].lower()


def test_commander_au_dela_du_stock_est_refuse(client, seed):
    """La règle métier F3.2 : impossible de commander plus que le stock disponible."""
    r = client.post("/api/commander", json={"lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 999}]})
    assert r.status_code == 400
    assert "stock" in r.json()["detail"].lower()


# ====================================================================
#  Scénario 6 — Le badge « best-seller » reflète les vraies ventes
# ====================================================================

def test_best_seller_reflete_les_ventes_reelles(client, seed):
    """Avant toute vente, aucun best-seller. Après avoir vendu le sac à main, il est
    marqué best-seller sur la vitrine ; la montre (jamais vendue) ne l'est pas."""
    avant = client.get("/api/vitrine").json()["produits"]
    assert all(p["best_seller"] is False for p in avant)   # pas de vente ⇒ pas de best-seller

    # On vend le sac à main (et pas la montre).
    client.post("/api/commander", json={"lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 3}]})

    apres = {p["nom"]: p["best_seller"] for p in client.get("/api/vitrine").json()["produits"]}
    assert apres["Sac à main cuir grainé chocolat"] is True
    assert apres["Montre ovale dorée"] is False


# ====================================================================
#  Scénario 7 — Sortie propre pour la messagerie (texte brut, pas de markdown)
# ====================================================================

def test_reponses_ia_sans_markdown_pour_messagerie():
    """Telegram/WhatsApp envoient en texte BRUT : le nettoyage serveur retire tout markdown
    (gras **, tableaux |, titres #) que le modèle pourrait produire, sinon il s'afficherait tel quel."""
    from app.ai.engine import nettoyer_markdown as n
    assert n("Voici **Maison Noor** !") == "Voici Maison Noor !"
    assert n("- **Sac à main cuir grainé chocolat** — 2200 DH") == "- Sac à main cuir grainé chocolat — 2200 DH"
    out = n("| Produit | Prix |\n|---|---|\n• Montre ovale dorée — 1600 DH")
    assert "|" not in out and "*" not in out and "#" not in out
    assert "Montre ovale dorée — 1600 DH" in out
