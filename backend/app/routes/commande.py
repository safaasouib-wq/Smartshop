"""Commandes en ligne (site) + suivi de livraison géolocalisé.

- POST /api/commander ............ PUBLIC : le client passe commande depuis la vitrine.
- GET  /api/commande/{id}/suivi .. PUBLIC : état + positions pour la page de suivi (polling).
- POST /api/commandes/{id}/livraison/demarrer . commerçant : lance la livraison (+ simulation).
- POST /api/commandes/{id}/livreur/position ... API réelle : une app chauffeur poste sa position GPS.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import livraison, models
from app.auth import client_optionnel, utilisateur_courant
from app.database import get_db
from app.services import services

router = APIRouter(prefix="/api", tags=["commande"])


# ------------------------------------------------------------------ Passer commande (public)

class LigneIn(BaseModel):
    produit: str
    quantite: int


class CommandeIn(BaseModel):
    lignes: list[LigneIn]
    mode: str = "retrait"                 # "retrait" | "livraison"
    nom: str = "Client web"
    telephone: str = ""
    adresse: str = ""
    lat: float | None = None              # position choisie sur la carte (prioritaire)
    lng: float | None = None
    telegram_chat_id: str | None = None   # si commande passée via un contexte Telegram


def _resoudre_lignes(db: Session, lignes: list[LigneIn]) -> list[dict]:
    """Résout chaque produit par NOM contre le vrai catalogue (jamais d'ID côté client)."""
    resolues = []
    for l in lignes:
        terme = (l.produit or "").strip()
        candidats = services.chercher_produits(db, terme)
        exacts = [p for p in candidats if p.nom.lower() == terme.lower()]
        choix = exacts or candidats
        if not choix:
            raise HTTPException(400, f"Produit introuvable : « {terme} »")
        resolues.append({"produit_id": choix[0].id, "quantite": max(1, int(l.quantite))})
    return resolues


@router.post("/commander")
def commander(c: CommandeIn, db: Session = Depends(get_db),
              compte=Depends(client_optionnel)):
    if not c.lignes:
        raise HTTPException(400, "Panier vide")
    if c.mode not in ("retrait", "livraison"):
        raise HTTPException(400, "Mode invalide")

    lignes = _resoudre_lignes(db, c.lignes)

    # Client : compte connecté > client Telegram fourni > client web anonyme.
    if compte is not None:
        client = compte
        # met à jour le profil au passage (nom/tel/adresse par défaut)
        if c.nom and c.nom != "Client web":
            client.nom = c.nom
        if c.telephone:
            client.telephone = c.telephone
        if c.mode == "livraison" and c.adresse:
            client.adresse = c.adresse
        db.commit()
    elif c.telegram_chat_id:
        client = (db.query(models.Client)
                  .filter_by(identifiant_canal=c.telegram_chat_id, canal="telegram").first())
        if not client:
            client = models.Client(identifiant_canal=c.telegram_chat_id, canal="telegram", nom=c.nom)
            db.add(client); db.commit(); db.refresh(client)
    else:
        client = models.Client(identifiant_canal=f"web-{uuid.uuid4().hex[:12]}",
                               canal="web", nom=c.nom or "Client web")
        db.add(client); db.commit(); db.refresh(client)

    try:
        commande = services.creer_commande(db, client_id=client.id, conversation_id=None, lignes=lignes)
    except services.StockInsuffisant as e:
        raise HTTPException(400, f"Stock insuffisant pour {e.produit.nom} (dispo : {e.produit.stock})")
    except ValueError as e:
        raise HTTPException(400, str(e))

    commande.mode = c.mode
    commande.telephone_client = c.telephone
    if c.mode == "livraison":
        commande.adresse_livraison = c.adresse
        pos = (c.lat, c.lng) if (c.lat is not None and c.lng is not None) else livraison.geocoder(c.adresse)
        if pos:
            commande.lat_client, commande.lng_client = pos
    db.commit()

    return {"numero": commande.id, "total": commande.total, "mode": commande.mode,
            "suivi_url": f"/suivi?id={commande.id}"}


# ------------------------------------------------------------------ Suivi (public)

ETAPES = {
    "retrait": ["Commande reçue", "En préparation", "Prête à récupérer", "Récupérée"],
    "livraison": ["Commande reçue", "En préparation", "Prête", "En route", "Bientôt chez vous", "Livrée"],
}


def _progres(commande: models.Commande) -> int:
    """Index de l'étape courante (0-based)."""
    st, sv = commande.statut, commande.suivi_livraison
    if commande.mode == "livraison":
        if sv == "livree": return 5
        if sv == "proche": return 4
        if sv == "en_route": return 3
        if st == models.StatutCommande.PRETE: return 2
        if st == models.StatutCommande.EN_PREPARATION: return 1
        return 0
    else:  # retrait
        if st == models.StatutCommande.RECUPEREE: return 3
        if st == models.StatutCommande.PRETE: return 2
        if st == models.StatutCommande.EN_PREPARATION: return 1
        return 0


@router.get("/commande/{commande_id}/suivi")
def suivi(commande_id: int, db: Session = Depends(get_db)):
    commande = db.get(models.Commande, commande_id)
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    labels = ETAPES[commande.mode]
    courant = _progres(commande)
    boutique = livraison.coords_boutique(db)
    commerce = db.query(models.Commerce).first()
    return {
        "id": commande.id, "mode": commande.mode, "total": commande.total,
        "statut": commande.statut.value if commande.statut else None,
        "suivi_livraison": commande.suivi_livraison,
        "etape_courante": courant,
        "etapes": [{"label": lab, "faite": i <= courant} for i, lab in enumerate(labels)],
        "boutique": {"lat": boutique[0], "lng": boutique[1], "nom": commerce.nom if commerce else "Boutique"},
        "client": {"lat": commande.lat_client, "lng": commande.lng_client,
                   "adresse": commande.adresse_livraison, "nom": commande.client.nom},
        "livreur": ({"lat": commande.lat_livreur, "lng": commande.lng_livreur}
                    if commande.lat_livreur is not None else None),
        "lignes": [{"produit": l.produit.nom, "quantite": l.quantite} for l in commande.lignes],
    }


# ------------------------------------------------------------------ Contrôle livraison (commerçant)

@router.post("/commandes/{commande_id}/livraison/demarrer")
def demarrer(commande_id: int, simulation: bool = True,
             db: Session = Depends(get_db), _=Depends(utilisateur_courant)):
    """Le commerçant confie la commande au livreur. simulation=True lance le livreur virtuel."""
    commande = db.get(models.Commande, commande_id)
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.mode != "livraison":
        raise HTTPException(400, "Cette commande est en retrait, pas en livraison")
    if commande.lat_client is None:
        raise HTTPException(400, "Adresse client non géolocalisée")
    livraison.demarrer_livraison(db, commande)
    if simulation:
        livraison.lancer_simulation(commande.id)
    return {"ok": True, "suivi_livraison": commande.suivi_livraison}


class PositionIn(BaseModel):
    lat: float
    lng: float


@router.post("/commandes/{commande_id}/livreur/position")
def position_livreur(commande_id: int, pos: PositionIn,
                     db: Session = Depends(get_db), _=Depends(utilisateur_courant)):
    """API pour une VRAIE app chauffeur : poste la position GPS → mêmes transitions/notifs."""
    commande = db.get(models.Commande, commande_id)
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    if commande.suivi_livraison in ("", None):
        commande.suivi_livraison = "en_route"
    etat = livraison.appliquer_position(db, commande, pos.lat, pos.lng)
    return {"ok": True, **etat}
