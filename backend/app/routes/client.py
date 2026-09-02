"""Comptes clients de la vitrine web : inscription, connexion, profil + historique de commandes.

Permet au client de retrouver ses commandes (en cours + passées) même après avoir quitté le site.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.auth import (client_courant, creer_token_client,
                      hacher_mot_de_passe, verifier_mot_de_passe)
from app.database import get_db

router = APIRouter(prefix="/api/client", tags=["client"])


class InscriptionIn(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    telephone: str = ""
    adresse: str = ""


class ConnexionIn(BaseModel):
    email: str
    mot_de_passe: str


def _compte(client: models.Client) -> dict:
    return {"id": client.id, "nom": client.nom, "email": client.email,
            "telephone": client.telephone, "adresse": client.adresse or ""}


@router.post("/inscription")
def inscription(data: InscriptionIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Email invalide")
    if len(data.mot_de_passe) < 4:
        raise HTTPException(400, "Mot de passe trop court (min 4 caractères)")
    if db.query(models.Client).filter(models.Client.email == email).first():
        raise HTTPException(400, "Un compte existe déjà avec cet email")
    client = models.Client(
        identifiant_canal=f"web-{email}", canal="web", nom=data.nom,
        telephone=data.telephone, adresse=data.adresse,
        email=email, mot_de_passe_hache=hacher_mot_de_passe(data.mot_de_passe),
    )
    db.add(client); db.commit(); db.refresh(client)
    return {"token": creer_token_client(client.id), "client": _compte(client)}


@router.post("/connexion")
def connexion(data: ConnexionIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    client = db.query(models.Client).filter(models.Client.email == email).first()
    if not client or not client.mot_de_passe_hache or not verifier_mot_de_passe(data.mot_de_passe, client.mot_de_passe_hache):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"token": creer_token_client(client.id), "client": _compte(client)}


def _terminee(c: models.Commande) -> bool:
    if c.statut == models.StatutCommande.ANNULEE:
        return True
    if c.mode == "livraison":
        return c.suivi_livraison == "livree"
    return c.statut == models.StatutCommande.RECUPEREE


@router.get("/moi")
def moi(client: models.Client = Depends(client_courant), db: Session = Depends(get_db)):
    commandes = (db.query(models.Commande)
                 .filter_by(client_id=client.id)
                 .order_by(models.Commande.date_creation.desc()).all())
    def vue(c):
        return {
            "id": c.id, "date": c.date_creation, "mode": c.mode, "total": c.total,
            "statut": c.statut.value if c.statut else None,
            "suivi_livraison": c.suivi_livraison, "terminee": _terminee(c),
            "suivi_url": f"/suivi?id={c.id}",
            "lignes": [{"produit": l.produit.nom, "quantite": l.quantite} for l in c.lignes],
        }
    vues = [vue(c) for c in commandes]
    return {
        "client": _compte(client),
        "en_cours": [v for v in vues if not v["terminee"]],
        "historique": [v for v in vues if v["terminee"]],
    }
