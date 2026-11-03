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

# Alias de recherche : darija (lettres latines) + arabe -> nom canonique du produit.
# Sert de repli quand le client nomme un produit dans une autre écriture que le nom du catalogue
# (ex. « ساعة » ou « magana » -> Montre ovale dorée), pour éviter les faux « produit non vendu ».
_ALIAS_RECHERCHE = {
    # Vêtements
    "mantou": "Manteau long en laine ivoire", "manteau": "Manteau long en laine ivoire",
    "منطو": "Manteau long en laine ivoire", "معطف": "Manteau long en laine ivoire",
    "kostum": "Blazer croisé boutons dorés", "blazer": "Blazer croisé boutons dorés",
    "كوستيم": "Blazer croisé boutons dorés", "سترة": "Blazer croisé boutons dorés",
    "robe": "Robe longue satin cacao", "فستان": "Robe longue satin cacao",
    "caftan": "Caftan satin perle", "kaftan": "Caftan satin perle",
    "qaftan": "Caftan satin perle", "قفطان": "Caftan satin perle",
    "trico": "Pull maille bordeaux", "pull": "Pull maille bordeaux",
    "تريكو": "Pull maille bordeaux",
    "blouza": "Blouse lavallière satin beige", "blouse": "Blouse lavallière satin beige",
    "بلوزة": "Blouse lavallière satin beige",
    # Sacs
    "sak": "Sac à main cuir grainé chocolat", "chkara": "Sac à main cuir grainé chocolat",
    "شكارة": "Sac à main cuir grainé chocolat", "حقيبة يد": "Sac à main cuir grainé chocolat",
    "cabas": "Cabas cuir marron et twilly", "كابا": "Cabas cuir marron et twilly",
    "trapeze": "Sac trapèze cuir camel", "حقيبة كاميل": "Sac trapèze cuir camel",
    "sak sghir": "Mini sac bordeaux", "حقيبة صغيرة": "Mini sac bordeaux",
    # Montres
    "magana": "Montre ovale dorée", "ماكانة": "Montre ovale dorée",
    "ماگانة": "Montre ovale dorée", "ساعة": "Montre ovale dorée",
    "dyamant": "Montre joaillière sertie", "مرصعة": "Montre joaillière sertie",
    "jonc": "Coffret montre bicolore et jonc", "brasslet": "Coffret montre bicolore et jonc",
    "إسورة": "Coffret montre bicolore et jonc",
    "octogonale": "Montre octogonale dorée", "مثمنة": "Montre octogonale dorée",
}



def chercher_produits(db: Session, terme: str) -> list[models.Produit]:
    """Recherche insensible à la casse sur le nom et la catégorie, avec repli par
    alias darija/arabe (ex. « شكارة », « magana ») pour retrouver le bon produit
    même quand il est nommé dans une autre écriture que celle du catalogue."""
    like = f"%{terme}%"
    produits = (db.query(models.Produit)
                .filter(models.Produit.actif.is_(True))
                .filter((models.Produit.nom.ilike(like)) | (models.Produit.categorie.ilike(like)))
                .limit(10).all())
    if produits:
        return produits
    # Repli : le terme correspond-il à un alias darija/arabe d'un produit ?
    t = (terme or "").strip().lower()
    cibles = {nom for alias, nom in _ALIAS_RECHERCHE.items() if alias in t or t == alias}
    if cibles:
        return (db.query(models.Produit)
                .filter(models.Produit.actif.is_(True))
                .filter(models.Produit.nom.in_(cibles))
                .limit(10).all())
    return []


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
