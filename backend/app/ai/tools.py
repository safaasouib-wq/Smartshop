"""Définition des fonctions exposées au LLM (exigence F2.3) et leur exécution.

Chaque fonction du LLM correspond à un appel de la couche Services : c'est le pont
entre l'IA et les données réelles du commerce.
"""
import json
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.services import services
from app.utils import utcnow

FENETRE_ANTI_DOUBLON = timedelta(minutes=5)  # une commande identique dans ce délai = doublon du LLM

# Noms marocains (darija) affichables entre parenthèses pour les produits au nom français.
# Sert UNIQUEMENT à l'affichage ; la commande utilise toujours le nom exact du catalogue.
ALIAS_DARIJA = {
    "Trench en cachemire": "Mantou cachemire",
    "Blazer croisé en laine": "Veste kostum",
    "Robe de soirée en soie": "Robe dyal sahra",
    "Caftan brodé main": "Qaftan mkhayet b lid",
    "Sac à main cuir grainé": "Sak dyal jild",
    "Cabas en cuir camel": "Sak kbir dyal jild",
    "Pochette de soirée satin": "Pochette dyal sahra",
    "Sac à dos cuir nappa": "Sak d dhar",
    "Montre automatique acier": "Magana automatique",
    "Chronographe or rose": "Magana chrono dhabiya",
    "Montre squelette cuir": "Magana squelette",
    "Montre femme nacre": "Magana dyal 3ayalat",
}

# ------------------------------------------------------------------ Schémas des outils

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "chercher_produit",
            "description": "Recherche des produits dans le catalogue par nom ou catégorie. Retourne nom, prix (DH), stock et id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "terme": {"type": "string", "description": "Nom ou catégorie du produit recherché (dans n'importe quelle langue)"}
                },
                "required": ["terme"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "obtenir_infos_commerce",
            "description": "Retourne les informations de la boutique : nom, adresse, téléphone, horaires, description.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lister_produits",
            "description": "Liste le catalogue complet de la boutique (nom, prix, stock, catégorie), éventuellement filtré par catégorie. À utiliser dès que le client veut savoir ce qui est disponible ou parcourir sans nommer un produit précis : « chno kayn 3ndkom », « qu'est-ce que vous avez », « c'est quoi le menu », « chi 7aja rkhisa » (le moins cher), « d'autres produits », etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "categorie": {"type": ["string", "null"], "description": "Catégorie optionnelle pour filtrer (ex: 'Vêtements', 'Sacs', 'Montres'). Mettre null ou omettre pour tout lister."}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "creer_commande",
            "description": "Crée une commande APRÈS confirmation explicite du client. Vérifie le stock et retourne le numéro de commande.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lignes": {
                        "type": "array",
                        "description": "Les produits commandés",
                        "items": {
                            "type": "object",
                            "properties": {
                                "produit": {"type": "string", "description": "Nom du produit exactement tel que retourné par chercher_produit (ex: 'Sac à main cuir grainé', 'Montre automatique acier')"},
                                "quantite": {"type": "integer"},
                            },
                            "required": ["produit", "quantite"],
                        },
                    }
                },
                "required": ["lignes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "statut_commande",
            "description": "Donne l'état d'avancement d'une commande DU CLIENT ACTUEL (reçue, en préparation, prête, en route, livrée...). À utiliser quand le client demande où en est sa commande (« fin wslat commande dyali », « où en est ma commande », « wach prête ? »). Sans numéro, renvoie sa commande la plus récente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "numero_commande": {"type": ["integer", "null"], "description": "Numéro de commande. null ou omis = la commande la plus récente du client."}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommander_produits",
            "description": "Suggère quelques produits POPULAIRES (best-sellers réels) de la boutique, jamais épuisés. À utiliser pour conseiller le client ou proposer un complément/upsell de façon naturelle (sans forcer). Retourne nom, prix (DH), catégorie.",
            "parameters": {
                "type": "object",
                "properties": {
                    "exclure": {"type": ["string", "null"], "description": "Nom d'un produit à NE PAS resuggérer (ex: celui déjà commandé), ou null."},
                    "categorie": {"type": ["string", "null"], "description": "Limiter à une catégorie, ou null pour toutes."}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consulter_notes_client",
            "description": "Consulte les notes internes du commerçant sur le client actuel (préférences, allergies, habitudes). À utiliser pour personnaliser tes réponses et tes conseils produits.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalader_vers_humain",
            "description": "Transfère la conversation au commerçant humain. À utiliser si le client le demande, est mécontent, ou si la demande dépasse tes capacités.",
            "parameters": {
                "type": "object",
                "properties": {
                    "raison": {"type": "string", "description": "Raison du transfert, en français"}
                },
                "required": ["raison"],
            },
        },
    },
]


# ------------------------------------------------------------------ Exécution des outils

def _etat_lisible(cmd: models.Commande) -> str:
    """Traduit le statut (+ suivi de livraison) d'une commande en une phrase d'état claire."""
    if cmd.statut == models.StatutCommande.ANNULEE:
        return "annulée"
    if cmd.mode == "livraison":
        sv = cmd.suivi_livraison or ""
        if sv == "livree":
            return "livrée"
        if sv == "proche":
            return "le livreur arrive (tout proche)"
        if sv == "en_route":
            return "en route vers le client"
        if cmd.statut == models.StatutCommande.PRETE:
            return "prête, en attente du livreur"
        if cmd.statut == models.StatutCommande.EN_PREPARATION:
            return "en préparation"
        return "reçue, en attente de préparation"
    # retrait
    if cmd.statut == models.StatutCommande.RECUPEREE:
        return "récupérée en boutique"
    if cmd.statut == models.StatutCommande.PRETE:
        return "prête à récupérer en boutique"
    if cmd.statut == models.StatutCommande.EN_PREPARATION:
        return "en préparation"
    return "reçue, en attente de préparation"


def _produit_dict(p: models.Produit) -> dict:
    """Représentation JSON d'un produit pour le LLM (+ alias darija si le nom est français)."""
    d = {"id": p.id, "nom": p.nom, "prix_dh": p.prix,
         "stock": p.stock, "categorie": p.categorie, "description": p.description}
    alias = ALIAS_DARIJA.get(p.nom)
    if alias:
        d["alias_darija"] = alias
    return d


def executer_outil(db: Session, conversation: models.Conversation,
                   nom: str, arguments: dict) -> str:
    """Exécute la fonction demandée par le LLM et retourne le résultat en JSON (string)."""

    if nom == "chercher_produit":
        produits = services.chercher_produits(db, arguments["terme"])
        # Journalise la recherche (analytics de la demande : ce que les clients cherchent)
        try:
            db.add(models.RechercheProduit(terme=arguments["terme"], trouve=bool(produits)))
            db.commit()
        except Exception:
            db.rollback()
        return json.dumps([_produit_dict(p) for p in produits], ensure_ascii=False)

    if nom == "lister_produits":
        produits = services.lister_produits(db, arguments.get("categorie") or None)
        return json.dumps([_produit_dict(p) for p in produits], ensure_ascii=False)

    if nom == "obtenir_infos_commerce":
        c = services.infos_commerce(db)
        if not c:
            return json.dumps({"erreur": "commerce non configuré"})
        return json.dumps({
            "nom": c.nom, "description": c.description, "adresse": c.adresse,
            "telephone": c.telephone, "horaires": c.horaires,
            "message_accueil": c.message_accueil,
        }, ensure_ascii=False)

    if nom == "creer_commande":
        # Résolution des produits par NOM côté serveur : le LLM ne manipule jamais d'ID
        # (il se trompait de produit_id → mauvais produit et mauvais total).
        lignes_resolues = []
        for ligne in arguments.get("lignes", []):
            terme = str(ligne.get("produit", "")).strip()
            candidats = services.chercher_produits(db, terme)
            exacts = [p for p in candidats if p.nom.lower() == terme.lower()]
            choix = exacts or candidats
            if not choix:
                return json.dumps({"succes": False,
                                   "erreur": f"Produit introuvable : « {terme} ». Appelle chercher_produit pour vérifier le nom exact."},
                                  ensure_ascii=False)
            if len(choix) > 1:
                noms = ", ".join(p.nom for p in choix)
                return json.dumps({"succes": False,
                                   "erreur": f"Plusieurs produits correspondent à « {terme} » : {noms}. Demande au client de préciser."},
                                  ensure_ascii=False)
            lignes_resolues.append({"produit_id": choix[0].id, "quantite": ligne["quantite"]})

        # Garde-fou anti-doublon (déterministe) : le LLM recrée parfois la même commande
        # sur un message de suivi. Si une commande identique existe déjà dans cette
        # conversation depuis < 5 min, on renvoie celle-ci au lieu d'en créer une nouvelle.
        demande = sorted((l["produit_id"], l["quantite"]) for l in lignes_resolues)
        recentes = (db.query(models.Commande)
                    .filter(models.Commande.conversation_id == conversation.id,
                            models.Commande.date_creation >= utcnow() - FENETRE_ANTI_DOUBLON)
                    .order_by(models.Commande.date_creation.desc()).limit(5).all())
        for c in recentes:
            if sorted((l.produit_id, l.quantite) for l in c.lignes) == demande:
                return json.dumps({"succes": True, "numero_commande": c.id, "total_dh": c.total,
                                   "info": "Commande déjà enregistrée — aucune nouvelle commande créée. Rappelle simplement le numéro existant au client."},
                                  ensure_ascii=False)

        try:
            commande = services.creer_commande(
                db,
                client_id=conversation.client_id,
                conversation_id=conversation.id,
                lignes=lignes_resolues,
            )
            return json.dumps({
                "succes": True, "numero_commande": commande.id,
                "total_dh": commande.total,
            })
        except services.StockInsuffisant as e:
            return json.dumps({
                "succes": False,
                "erreur": f"Stock insuffisant pour {e.produit.nom} (disponible: {e.produit.stock}, demandé: {e.demande})",
            }, ensure_ascii=False)
        except ValueError as e:
            return json.dumps({"succes": False, "erreur": str(e)}, ensure_ascii=False)

    if nom == "statut_commande":
        q = db.query(models.Commande).filter(models.Commande.client_id == conversation.client_id)
        num = arguments.get("numero_commande")
        cmd = None
        if num:
            try:
                cmd = q.filter(models.Commande.id == int(num)).first()
            except (TypeError, ValueError):
                cmd = None
        else:
            cmd = q.order_by(models.Commande.date_creation.desc()).first()
        if not cmd:
            return json.dumps({"trouve": False,
                               "info": "Aucune commande trouvée pour ce client." if not num
                               else f"Aucune commande n°{num} rattachée à ce client."},
                              ensure_ascii=False)
        return json.dumps({
            "trouve": True, "numero": cmd.id, "mode": cmd.mode,
            "statut": cmd.statut.value if cmd.statut else None,
            "suivi_livraison": cmd.suivi_livraison or "",
            "etat_lisible": _etat_lisible(cmd),
            "total_dh": cmd.total,
            "lignes": [{"produit": l.produit.nom, "quantite": l.quantite} for l in cmd.lignes],
        }, ensure_ascii=False)

    if nom == "recommander_produits":
        exclure = (arguments.get("exclure") or "").strip().lower()
        cat = arguments.get("categorie") or None
        ventes = dict(
            db.query(models.LigneCommande.produit_id, func.sum(models.LigneCommande.quantite))
              .group_by(models.LigneCommande.produit_id).all()
        )
        dispo = [p for p in services.lister_produits(db, cat)
                 if p.stock > 0 and p.nom.lower() != exclure]
        dispo.sort(key=lambda p: ventes.get(p.id, 0) or 0, reverse=True)
        return json.dumps([_produit_dict(p) for p in dispo[:3]], ensure_ascii=False)

    if nom == "consulter_notes_client":
        client = conversation.client
        notes = (client.notes or "").strip() if client else ""
        return json.dumps({"notes": notes or "Aucune note enregistrée pour ce client."}, ensure_ascii=False)

    if nom == "escalader_vers_humain":
        services.escalader(db, conversation, arguments.get("raison", ""))
        return json.dumps({"succes": True,
                           "info": "Conversation transférée au commerçant. Informe le client qu'un humain va le recontacter rapidement."},
                          ensure_ascii=False)

    return json.dumps({"erreur": f"outil inconnu: {nom}"})
