"""Adapter Telegram — implémentation de MessagingChannel via l'API Bot Telegram.

Utilise directement l'API HTTP (pas de bibliothèque tierce) : plus simple à expliquer
en soutenance et sans dépendance supplémentaire.
"""
from typing import Optional

import httpx

from app.adapters.base import MessagingChannel, IncomingMessage
from app.config import settings

# Clés d'un message Telegram représentant un vrai contenu envoyé par le client.
# Exclut le texte ET les messages de service (new_chat_members, pinned_message...),
# qui ne doivent pas déclencher la réponse « écrivez en texte ».
CONTENU_TELEGRAM = ("voice", "audio", "photo", "video", "video_note", "document",
                    "sticker", "animation", "contact", "location", "poll", "dice")


class TelegramChannel(MessagingChannel):

    @property
    def nom_canal(self) -> str:
        return "telegram"

    def parse_update(self, payload: dict) -> Optional[IncomingMessage]:
        """Un update Telegram contient message.chat.id, message.from et message.text."""
        message = payload.get("message") or payload.get("edited_message")
        if not message or "text" not in message:
            return None  # sticker, photo, etc. → hors périmètre MVP

        chat_id = str(message["chat"]["id"])
        expediteur = message.get("from", {})
        nom = " ".join(filter(None, [expediteur.get("first_name"), expediteur.get("last_name")]))

        return IncomingMessage(
            canal=self.nom_canal,
            identifiant_canal=chat_id,
            nom_client=nom or "Client",
            texte=message["text"].strip(),
        )

    def extraire_audio(self, payload: dict) -> Optional[dict]:
        """Détecte un message VOCAL (ou audio) et retourne de quoi le transcrire :
        {chat_id, file_id, nom}. None si l'update n'est pas un vocal."""
        message = payload.get("message") or payload.get("edited_message")
        if not message:
            return None
        media = message.get("voice") or message.get("audio")
        if not media or not media.get("file_id"):
            return None
        exp = message.get("from", {})
        nom = " ".join(filter(None, [exp.get("first_name"), exp.get("last_name")]))
        return {
            "chat_id": str(message["chat"]["id"]),
            "file_id": media["file_id"],
            "nom": nom or "Client",
        }

    def telecharger_fichier(self, file_id: str) -> Optional[bytes]:
        """Télécharge un fichier Telegram par son file_id (getFile → file_path → download).
        Synchrone : appelé depuis une tâche de fond. Retourne les octets, ou None si échec."""
        base = f"{settings.TELEGRAM_API_URL}/bot{settings.TELEGRAM_BOT_TOKEN}"
        try:
            with httpx.Client(timeout=30) as client:
                info = client.get(f"{base}/getFile", params={"file_id": file_id}).json()
                file_path = (info.get("result") or {}).get("file_path")
                if not file_path:
                    return None
                fichier = f"{settings.TELEGRAM_API_URL}/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
                resp = client.get(fichier)
                resp.raise_for_status()
                return resp.content
        except Exception:
            return None

    def parse_non_texte(self, payload: dict) -> Optional[str]:
        """Détecte un message d'un humain porteur de contenu non-texte (vocal, photo...) → chat_id.
        Ignore le texte et les messages de service (arrivées/départs de membres, épinglages...)."""
        message = payload.get("message") or payload.get("edited_message")
        if message and any(cle in message for cle in CONTENU_TELEGRAM):
            chat_id = (message.get("chat") or {}).get("id")
            return str(chat_id) if chat_id is not None else None
        return None

    async def send_message(self, identifiant_canal: str, texte: str) -> None:
        url = f"{settings.TELEGRAM_API_URL}/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json={
                "chat_id": identifiant_canal,
                "text": texte,
            })
            resp.raise_for_status()


# Instance unique réutilisée par le webhook
telegram_channel = TelegramChannel()
