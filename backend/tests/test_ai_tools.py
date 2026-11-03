"""Tests de la couche d'exécution des outils de l'IA (app.ai.tools) et des services métier.

C'est le cœur de la règle « zéro hallucination » : ces fonctions font le pont entre le
LLM et la vraie BDD. On les teste SANS appeler le LLM (déterministe, pas de clé requise).
"""
import json

import pytest

from app import models
from app.ai.tools import executer_outil
from app.services import services


def test_chercher_produit_retourne_donnees_reelles(db, seed, conversation):
    """L'outil renvoie le vrai prix stocké en base (pas une valeur inventée par le modèle)."""
    res = json.loads(executer_outil(db, conversation, "chercher_produit", {"terme": "sac"}))
    assert len(res) == 1
    assert res[0]["nom"] == "Sac à main cuir grainé chocolat"
    assert res[0]["prix_dh"] == 2200.0


def test_chercher_produit_journalise_la_recherche(db, seed, conversation):
    """Chaque recherche est loggée (analytics de la demande) — trouvée ou non."""
    executer_outil(db, conversation, "chercher_produit", {"terme": "parfum inexistant"})
    recherches = db.query(models.RechercheProduit).all()
    assert any(r.terme == "parfum inexistant" and r.trouve is False for r in recherches)


def test_lister_produits(db, seed, conversation):
    res = json.loads(executer_outil(db, conversation, "lister_produits", {}))
    assert {p["nom"] for p in res} == {"Sac à main cuir grainé chocolat", "Montre ovale dorée"}


def test_creer_commande_par_nom_et_decremente_stock(db, seed, conversation):
    """La commande se fait par NOM (résolu côté serveur), calcule le vrai total, décrémente le stock."""
    res = json.loads(executer_outil(db, conversation, "creer_commande",
                                    {"lignes": [{"produit": "Montre ovale dorée", "quantite": 3}]}))
    assert res["succes"] is True
    assert res["total_dh"] == 4800.0  # 3 × 1600 DH
    montre = db.get(models.Produit, seed["montre_id"])
    assert montre.stock == 17  # 20 − 3


def test_creer_commande_anti_doublon(db, seed, conversation):
    """Une commande identique répétée (< 5 min) ne crée pas de doublon et renvoie le même numéro."""
    args = {"lignes": [{"produit": "Sac à main cuir grainé chocolat", "quantite": 2}]}
    r1 = json.loads(executer_outil(db, conversation, "creer_commande", args))
    r2 = json.loads(executer_outil(db, conversation, "creer_commande", args))

    assert r1["numero_commande"] == r2["numero_commande"]
    assert db.query(models.Commande).count() == 1          # une seule commande créée
    sac = db.get(models.Produit, seed["sac_id"])
    assert sac.stock == 8                              # stock décrémenté une seule fois (10 − 2)


def test_creer_commande_produit_introuvable(db, seed, conversation):
    res = json.loads(executer_outil(db, conversation, "creer_commande",
                                    {"lignes": [{"produit": "Parfum", "quantite": 1}]}))
    assert res["succes"] is False
    assert "introuvable" in res["erreur"].lower()


def test_escalade_bascule_vers_humain(db, seed, conversation):
    """L'outil d'escalade transfère la conversation à l'humain et crée une escalade en attente."""
    executer_outil(db, conversation, "escalader_vers_humain", {"raison": "client mécontent"})
    db.refresh(conversation)
    assert conversation.gere_par == models.GerePar.HUMAIN
    assert conversation.statut == models.StatutConversation.ESCALADEE
    assert db.query(models.Escalade).filter_by(
        statut=models.StatutEscalade.EN_ATTENTE).count() == 1


def test_escalade_alerte_le_commercant(db, seed, conversation, monkeypatch):
    """Si un chat_id commerçant est configuré, l'escalade lui envoie une alerte Telegram."""
    from app.adapters import telegram as tg
    from app.config import settings

    envoyes = []

    async def faux_envoi(identifiant, texte):
        envoyes.append((identifiant, texte))

    monkeypatch.setattr(settings, "TELEGRAM_COMMERCANT_CHAT_ID", "999")
    monkeypatch.setattr(tg.telegram_channel, "send_message", faux_envoi)

    # raison distincte du gabarit statique pour que l'assertion soit réellement porteuse
    executer_outil(db, conversation, "escalader_vers_humain", {"raison": "rupture de stock"})

    assert len(envoyes) == 1
    assert envoyes[0][0] == "999"
    texte = envoyes[0][1]
    assert "Escalade" in texte
    assert "Client Test" in texte      # le commerçant sait QUI a besoin d'aide
    assert "rupture de stock" in texte  # ... et POURQUOI (raison interpolée)


def test_escalade_notif_best_effort(db, seed, conversation, monkeypatch):
    """Une panne d'envoi de l'alerte ne doit PAS casser l'escalade (contrat best-effort)."""
    from app.adapters import telegram as tg
    from app.config import settings

    async def envoi_qui_plante(identifiant, texte):
        raise RuntimeError("telegram indisponible")

    monkeypatch.setattr(settings, "TELEGRAM_COMMERCANT_CHAT_ID", "999")
    monkeypatch.setattr(tg.telegram_channel, "send_message", envoi_qui_plante)

    # Ne doit pas lever, et l'escalade doit rester effective malgré l'échec de la notification
    executer_outil(db, conversation, "escalader_vers_humain", {"raison": "test"})
    db.refresh(conversation)
    assert conversation.gere_par == models.GerePar.HUMAIN
    assert db.query(models.Escalade).filter_by(
        statut=models.StatutEscalade.EN_ATTENTE).count() == 1


def test_escalade_sans_chat_id_ne_notifie_pas(db, seed, conversation, monkeypatch):
    """Sans chat_id commerçant configuré (défaut), aucune tentative d'envoi (best-effort)."""
    from app.adapters import telegram as tg
    from app.config import settings

    appels = []

    async def faux_envoi(identifiant, texte):
        appels.append((identifiant, texte))

    monkeypatch.setattr(settings, "TELEGRAM_COMMERCANT_CHAT_ID", "")
    monkeypatch.setattr(tg.telegram_channel, "send_message", faux_envoi)

    executer_outil(db, conversation, "escalader_vers_humain", {"raison": "test"})

    assert appels == []


def test_statut_commande_derniere_du_client(db, seed, conversation):
    """Sans numéro, l'outil renvoie l'état lisible de la dernière commande DU client."""
    services.creer_commande(db, client_id=conversation.client_id, conversation_id=conversation.id,
                            lignes=[{"produit_id": seed["sac_id"], "quantite": 1}])
    res = json.loads(executer_outil(db, conversation, "statut_commande", {}))
    assert res["trouve"] is True
    assert res["etat_lisible"] == "reçue, en attente de préparation"   # statut par défaut
    assert res["lignes"] == [{"produit": "Sac à main cuir grainé chocolat", "quantite": 1}]


def test_statut_commande_introuvable(db, seed, conversation):
    """Aucune commande pour ce client → réponse honnête (pas d'invention)."""
    res = json.loads(executer_outil(db, conversation, "statut_commande", {}))
    assert res["trouve"] is False


def test_statut_commande_ne_fuite_pas_les_commandes_dautrui(db, seed, conversation):
    """Sécurité : un client ne peut pas consulter la commande d'un AUTRE client par n° deviné."""
    autre = models.Client(identifiant_canal="autre-1", canal="telegram", nom="Autre")
    db.add(autre); db.commit(); db.refresh(autre)
    cmd = services.creer_commande(db, client_id=autre.id, conversation_id=None,
                                  lignes=[{"produit_id": seed["montre_id"], "quantite": 1}])
    res = json.loads(executer_outil(db, conversation, "statut_commande", {"numero_commande": cmd.id}))
    assert res["trouve"] is False   # la commande existe mais pas pour CE client


def test_recommander_produits_populaires(db, seed, conversation):
    """Recommande les best-sellers réels, jamais épuisés, et sait exclure un produit."""
    services.creer_commande(db, client_id=conversation.client_id, conversation_id=conversation.id,
                            lignes=[{"produit_id": seed["sac_id"], "quantite": 5}])  # le sac = top vente
    res = json.loads(executer_outil(db, conversation, "recommander_produits", {}))
    assert res[0]["nom"] == "Sac à main cuir grainé chocolat"                       # le plus vendu en tête
    # Exclusion : ne resuggère pas le sac à main
    res2 = json.loads(executer_outil(db, conversation, "recommander_produits", {"exclure": "Sac à main cuir grainé chocolat"}))
    assert all(p["nom"] != "Sac à main cuir grainé chocolat" for p in res2)


def test_service_stock_insuffisant(db, seed, conversation):
    """La couche service refuse une commande dépassant le stock (règle métier F3.2)."""
    with pytest.raises(services.StockInsuffisant):
        services.creer_commande(db, client_id=conversation.client_id,
                                conversation_id=conversation.id,
                                lignes=[{"produit_id": seed["sac_id"], "quantite": 999}])
