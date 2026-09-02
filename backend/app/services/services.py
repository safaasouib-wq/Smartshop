"""Couche Services Métier — toute la logique applicative, indépendante du canal et de l'IA.

C'est cette couche que le moteur IA appelle via le function calling (exigence F2.3) :
l'assistant ne répond JAMAIS de mémoire sur les données du commerce (exigence F2.4).
"""
import logging
from typing import Optional

import anyio
from sqlalchemy.orm import Session

from app import models
from app.adapters.base import IncomingMessage
from app.adapters.telegram import telegram_channel
from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------- Clients & conversations

def get_or_create_client(db: Session, msg: IncomingMessage) -> models.Client:
    client = (db.query(models.Client)
              .filter_by(identifiant_canal=msg.identifiant_canal, canal=msg.canal)
              .first())
    if not client:
        client = models.Client(identifiant_canal=msg.identifiant_canal,
                               canal=msg.canal, nom=msg.nom_client)
        db.add(client)
        db.commit()
        db.refresh(client)
    return client


def get_or_create_conversation(db: Session, client: models.Client) -> models.Conversation:
    conv = (db.query(models.Conversation)
            .filter(models.Conversation.client_id == client.id,
                    models.Conversation.statut != models.StatutConversation.FERMEE)
            .order_by(models.Conversation.date_creation.desc())
            .first())
    if not conv:
        conv = models.Conversation(client_id=client.id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


def enregistrer_message(db: Session, conversation_id: int,
                        emetteur: models.Emetteur, contenu: str) -> models.Message:
    m = models.Message(conversation_id=conversation_id, emetteur=emetteur, contenu=contenu)
    db.add(m)
    db.commit()
    return m


def historique_conversation(db: Session, conversation_id: int, limite: int) -> list[models.Message]:
    """Les N derniers messages, du plus ancien au plus récent (mémoire de l'assistant, F2.5)."""
    msgs = (db.query(models.Message)
            .filter_by(conversation_id=conversation_id)
            .order_by(models.Message.horodatage.desc())
            .limit(limite).all())
    return list(reversed(msgs))


# ---------------------------------------------------------------- Produits & commerce

def chercher_produits(db: Session, terme: str) -> list[models.Produit]:
    """Recherche insensible à la casse sur le nom et la catégorie."""
    like = f"%{terme}%"
    return (db.query(models.Produit)
            .filter(models.Produit.actif.is_(True))
            .filter((models.Produit.nom.ilike(like)) | (models.Produit.categorie.ilike(like)))
            .limit(10).all())


def lister_produits(db: Session, categorie: Optional[str] = None) -> list[models.Produit]:
    """Catalogue des produits actifs (optionnellement filtré par catégorie), pour les
    demandes de type « qu'avez-vous ? » où le client ne nomme pas un produit précis."""
    q = db.query(models.Produit).filter(models.Produit.actif.is_(True))
    if categorie:
        q = q.filter(models.Produit.categorie.ilike(f"%{categorie}%"))
    return q.order_by(models.Produit.categorie, models.Produit.nom).all()


def infos_commerce(db: Session) -> Optional[models.Commerce]:
    return db.query(models.Commerce).first()


# ---------------------------------------------------------------- Commandes

class StockInsuffisant(Exception):
    def __init__(self, produit: models.Produit, demande: int):
        self.produit, self.demande = produit, demande
        super().__init__(f"Stock insuffisant pour {produit.nom}")


def creer_commande(db: Session, client_id: int, conversation_id: int,
                   lignes: list[dict]) -> models.Commande:
    """Crée une commande de façon transactionnelle.
    lignes = [{"produit_id": int, "quantite": int}, ...]
    Vérifie la disponibilité (F3.2) et décrémente le stock (F3.6)."""
    commande = models.Commande(client_id=client_id, conversation_id=conversation_id)
    total = 0.0

    for ligne in lignes:
        produit = db.get(models.Produit, ligne["produit_id"])
        qte = int(ligne["quantite"])
        if produit is None or not produit.actif:
            raise ValueError(f"Produit {ligne['produit_id']} introuvable")
        if produit.stock < qte:
            raise StockInsuffisant(produit, qte)

        produit.stock -= qte
        total += produit.prix * qte
        commande.lignes.append(models.LigneCommande(
            produit_id=produit.id, quantite=qte, prix_unitaire=produit.prix))

    commande.total = round(total, 2)
    db.add(commande)
    db.commit()
    db.refresh(commande)
    return commande


# ---------------------------------------------------------------- Escalade (module 4)

def _notifier_commercant(conversation: models.Conversation, raison: str) -> None:
    """Alerte le commerçant sur Telegram qu'une conversation vient d'être escaladée.

    Best-effort : ne bloque jamais le flux et ne fait rien si aucun chat_id n'est
    configuré (TELEGRAM_COMMERCANT_CHAT_ID vide). Le dashboard reste la source de vérité ;
    ceci accélère juste la réaction du commerçant."""
    chat_id = settings.TELEGRAM_COMMERCANT_CHAT_ID
    if not chat_id:
        return
    nom = (conversation.client.nom if conversation.client else "") or "Client"
    texte = (f"🙋 Escalade SmartShop\n"
             f"Le client « {nom} » a besoin d'un humain.\n"
             f"Raison : {raison or '—'}\n"
             f"→ Ouvrez le dashboard pour lui répondre.")
    try:
        anyio.run(telegram_channel.send_message, chat_id, texte)
    except Exception:
        logger.exception("Alerte escalade au commerçant échouée")


def escalader(db: Session, conversation: models.Conversation, raison: str) -> models.Escalade:
    """Bascule la conversation vers l'humain (F4.1, F4.3) et crée la notification (F4.2)."""
    conversation.statut = models.StatutConversation.ESCALADEE
    conversation.gere_par = models.GerePar.HUMAIN
    esc = models.Escalade(conversation_id=conversation.id, raison=raison)
    db.add(esc)
    db.commit()
    db.refresh(esc)
    _notifier_commercant(conversation, raison)   # alerte Telegram au commerçant (si configuré)
    return esc


def rendre_a_lia(db: Session, conversation: models.Conversation) -> None:
    """Le commerçant rend la main à l'IA une fois le cas traité (F4.5)."""
    conversation.statut = models.StatutConversation.ACTIVE
    conversation.gere_par = models.GerePar.IA
    (db.query(models.Escalade)
       .filter_by(conversation_id=conversation.id, statut=models.StatutEscalade.EN_ATTENTE)
       .update({"statut": models.StatutEscalade.TRAITEE}))
    db.commit()
