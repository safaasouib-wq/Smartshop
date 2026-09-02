"""Transcription des messages vocaux (Speech-to-Text) via Groq Whisper.

Permet au client d'envoyer un VOCAL (ex. en darija) au lieu d'écrire : on transcrit l'audio
en texte, puis le texte suit exactement le même pipeline que n'importe quel message écrit
(recherche produit, prise de commande...). Réutilise le client OpenAI-compatible du moteur.
"""
import logging

from app.ai.engine import client_llm
from app.config import settings

logger = logging.getLogger(__name__)


def transcrire_audio(audio: bytes, nom_fichier: str = "audio.ogg") -> str | None:
    """Transcrit un contenu audio en texte. Retourne None si l'audio est vide ou en cas
    d'échec (le webhook répond alors poliment, sans casser)."""
    if not audio:
        return None
    try:
        res = client_llm.audio.transcriptions.create(
            model=settings.LLM_TRANSCRIPTION_MODEL,
            file=(nom_fichier, audio),
        )
        texte = (getattr(res, "text", "") or "").strip()
        logger.info("Transcription vocale (%d octets) -> %r", len(audio), texte[:120])
        return texte or None
    except Exception:
        logger.exception("Échec de la transcription vocale")
        return None
