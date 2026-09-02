"""Adapter WhatsApp — implémentation de MessagingChannel via la WhatsApp Cloud API (Meta).

Même principe que l'adapter Telegram : on parle directement à l'API HTTP, sans
bibliothèque tierce. Le cœur métier (IA, services, base) est totalement inchangé —
c'est l'intérêt du pattern Adapter (extensibilité, NF6).

Format des webhooks entrants (Cloud API) :
    entry[0].changes[0].value.messages[0]  → le message
    entry[0].changes[0].value.contacts[0]  → le profil (nom)
Les accusés de livraison arrivent sous `value.statuses` (pas `messages`) → ignorés.
"""
from typing import Optional

import httpx

from app.adapters.base import MessagingChannel, IncomingMessage
from app.config import settings

# Types WhatsApp représentant un vrai contenu envoyé par le client, qu'on accuse poliment.
# On EXCLUT ainsi les réactions emoji ("reaction"), les messages système, boutons, commandes...
# qui ne sont pas des demandes en langage naturel et ne doivent pas déclencher de réponse.
TYPES_CONTENU = {"audio", "voice", "image", "video", "document", "sticker", "location", "contacts"}


class WhatsAppChannel(MessagingChannel):

    @property
    def nom_canal(self) -> str:
        return "whatsapp"

    def parse_update(self, payload: dict) -> Optional[IncomingMessage]:
        """Extrait le premier message texte d'un webhook WhatsApp Cloud API.
        Retourne None pour tout le reste (accusés de livraison, images, payload inattendu)."""
        try:
            value = payload["entry"][0]["changes"][0]["value"]
        except (KeyError, IndexError, TypeError):
            return None

        messages = value.get("messages")
        if not messages:
            return None  # ex: accusé de livraison (value.statuses) → hors périmètre

        message = messages[0]
        if message.get("type") != "text":
            return None  # sticker, image, audio... → hors périmètre MVP

        wa_id = str(message["from"])              # numéro du client (identifiant sur ce canal)
        texte = (message.get("text") or {}).get("body", "").strip()
        if not texte:
            return None

        # Nom du client : fourni dans `contacts` (sinon valeur par défaut)
        nom = "Client"
        contacts = value.get("contacts") or []
        if contacts:
            nom = (contacts[0].get("profile") or {}).get("name") or "Client"

        return IncomingMessage(
            canal=self.nom_canal,
            identifiant_canal=wa_id,
            nom_client=nom,
            texte=texte,
        )

    def parse_non_texte(self, payload: dict) -> Optional[str]:
        """Détecte un message d'un humain sans texte (vocal, image, document...) → wa_id."""
        try:
            value = payload["entry"][0]["changes"][0]["value"]
        except (KeyError, IndexError, TypeError):
            return None
        messages = value.get("messages")
        if not messages:
            return None  # accusé de livraison, etc.
        message = messages[0]
        if message.get("type") in TYPES_CONTENU and message.get("from"):
            return str(message["from"])
        return None

    async def send_message(self, identifiant_canal: str, texte: str) -> None:
        url = f"{settings.WHATSAPP_API_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=headers, json={
                "messaging_product": "whatsapp",
                "to": identifiant_canal,
                "type": "text",
                "text": {"body": texte},
            })
            resp.raise_for_status()


# Instance unique réutilisée par le webhook
whatsapp_channel = WhatsAppChannel()
