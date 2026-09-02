"""Sécurité du dashboard (F5.1, NF3) : hachage bcrypt + tokens JWT."""
from datetime import timedelta

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db
from app.utils import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hacher_mot_de_passe(mdp: str) -> str:
    return pwd_context.hash(mdp)


def verifier_mot_de_passe(mdp: str, hache: str) -> bool:
    return pwd_context.verify(mdp, hache)


def creer_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# Permissions accordables à un vendeur (une par module du dashboard).
PERMISSIONS = ["stats", "produits", "commandes", "conversations", "personnel", "clients", "rapports"]


def est_admin(user: "models.Utilisateur") -> bool:
    return (user.role or "").lower() == "admin"


def a_permission(user: "models.Utilisateur", perm: str) -> bool:
    if est_admin(user):
        return True
    accordees = {p.strip() for p in (user.permissions or "").split(",") if p.strip()}
    return perm in accordees


def utilisateur_courant(token: str = Depends(oauth2_scheme),
                        db: Session = Depends(get_db)) -> models.Utilisateur:
    """Dépendance FastAPI : protège les endpoints du dashboard."""
    erreur = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                           detail="Token invalide ou expiré")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        raise erreur

    user = db.query(models.Utilisateur).filter_by(email=email).first()
    if not user:
        raise erreur
    return user


def exiger(perm: str):
    """Fabrique une dépendance FastAPI qui exige la permission `perm` (l'admin passe toujours)."""
    def dependance(user: models.Utilisateur = Depends(utilisateur_courant)) -> models.Utilisateur:
        if not a_permission(user, perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Accès non autorisé à ce module")
        return user
    return dependance


def exiger_admin(user: models.Utilisateur = Depends(utilisateur_courant)) -> models.Utilisateur:
    if not est_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Réservé à l'administrateur")
    return user


# ------------------------------------------------------------------ Comptes clients (vitrine web)

def creer_token_client(client_id: int) -> str:
    payload = {
        "cid": client_id, "typ": "client",
        "exp": utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _client_depuis_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("typ") != "client":
            return None
        return db.get(models.Client, payload.get("cid"))
    except JWTError:
        return None


def client_courant(authorization: str = Header(None), db: Session = Depends(get_db)) -> models.Client:
    """Protège les endpoints du compte client (Authorization: Bearer <token client>)."""
    erreur = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Connexion requise")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise erreur
    client = _client_depuis_token(authorization.split(" ", 1)[1], db)
    if not client:
        raise erreur
    return client


def client_optionnel(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Renvoie le client connecté si un token client valide est fourni, sinon None (commande invité OK)."""
    if authorization and authorization.lower().startswith("bearer "):
        return _client_depuis_token(authorization.split(" ", 1)[1], db)
    return None
