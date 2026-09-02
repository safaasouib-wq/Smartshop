"""Webhooks des canaux de messagerie — points d'entrée des messages clients.

Le traitement est fait en tâche de fond (NF2) : on accuse réception immédiatement
pour respecter le timeout des API de messagerie, puis on traite le message.

Grâce au pattern Adapter, ajouter un canal ne change PAS le pipeline `traiter_message` :
il suffit d'enregistrer le nouvel adapter dans `CANAUX` et d'exposer sa route webhook.
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse

from app import models
from app.adapters.base import IncomingMessage, MessagingChannel
from app.adapters.telegram import telegram_channel
from app.adapters.whatsapp import whatsapp_channel
from app.ai.engine import generer_reponse
from app.config import settings
from app.database import SessionLocal
from app.services import services

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhook"])

# Registre des canaux : nom_canal → adapter. Le pipeline choisit le bon pour répondre.
CANAUX: dict[str, MessagingChannel] = {
    telegram_channel.nom_canal: telegram_channel,
    whatsapp_channel.nom_canal: whatsapp_channel,
}

# Réponse aux messages non-texte (vocal, image...) que l'IA ne traite pas encore.
MESSAGE_NON_TEXTE = ("Désolé, je ne comprends que les messages écrits pour le moment 🙏 "
                     "Pouvez-vous m'écrire votre demande en texte ?")

# Vocal reçu mais transcription impossible (audio vide, bruit, panne du service).
MESSAGE_VOCAL_INCOMPRIS = ("Je n'ai pas bien saisi votre message vocal 🙏 "
                           "Pouvez-vous le renvoyer ou m'écrire votre demande ?")


def repondre_non_texte(canal: MessagingChannel, identifiant: str):
    """Accuse poliment un message non-texte, sans passer par l'IA (best-effort)."""
    import anyio
    try:
        anyio.run(canal.send_message, identifiant, MESSAGE_NON_TEXTE)
    except Exception:
        logger.exception("Réponse au message non-texte échouée (%s)", canal.nom_canal)


def traiter_message(msg: IncomingMessage):
    """Pipeline complet : client → conversation → IA (ou pause si escaladée) → réponse.
    Indépendant du canal : la réponse repart sur le canal d'origine du message."""
    db = SessionLocal()
    try:
        client = services.get_or_create_client(db, msg)
        conversation = services.get_or_create_conversation(db, client)

        # 1. Persister le message entrant
        services.enregistrer_message(db, conversation.id, models.Emetteur.CLIENT, msg.texte)

        # 2. Si la conversation est escaladée : l'IA reste en pause (F4.3)
        if conversation.gere_par == models.GerePar.HUMAIN:
            logger.info("Conversation %s escaladée : IA en pause", conversation.id)
            return

        # 3. Générer et envoyer la réponse de l'assistant, sur le canal d'origine
        reponse = generer_reponse(db, conversation)
        services.enregistrer_message(db, conversation.id, models.Emetteur.IA, reponse)

        canal = CANAUX.get(msg.canal)
        if canal is None:
            logger.error("Canal inconnu : %s — réponse non envoyée", msg.canal)
            return

        import anyio
        anyio.run(canal.send_message, msg.identifiant_canal, reponse)

    except Exception:
        logger.exception("Erreur de traitement du message")
    finally:
        db.close()


def traiter_vocal_telegram(chat_id: str, file_id: str, nom: str):
    """Message VOCAL Telegram : télécharge l'audio, le transcrit (Whisper), puis fait suivre
    le texte au pipeline normal — exactement comme un message écrit. Best-effort."""
    import anyio

    from app.ai.transcription import transcrire_audio
    try:
        audio = telegram_channel.telecharger_fichier(file_id)
        texte = transcrire_audio(audio) if audio else None
        if not texte:
            anyio.run(telegram_channel.send_message, chat_id, MESSAGE_VOCAL_INCOMPRIS)
            return
        # Le client entend/voit ce que le bot a compris (transparence), puis on traite.
        traiter_message(IncomingMessage(
            canal=telegram_channel.nom_canal, identifiant_canal=chat_id,
            nom_client=nom or "Client", texte=texte,
        ))
    except Exception:
        logger.exception("Traitement du vocal Telegram échoué")


# ------------------------------------------------------------------ Telegram

@router.post("/telegram")
async def webhook_telegram(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    msg = telegram_channel.parse_update(payload)
    if msg:
        background_tasks.add_task(traiter_message, msg)
        return {"ok": True}
    vocal = telegram_channel.extraire_audio(payload)      # message vocal → transcription
    if vocal:
        background_tasks.add_task(traiter_vocal_telegram, vocal["chat_id"], vocal["file_id"], vocal["nom"])
        return {"ok": True}
    dest = telegram_channel.parse_non_texte(payload)       # autre non-texte (photo, sticker...)
    if dest:
        background_tasks.add_task(repondre_non_texte, telegram_channel, dest)
    return {"ok": True}  # accusé de réception immédiat (NF2)


# ------------------------------------------------------------------ WhatsApp (Cloud API)

@router.get("/whatsapp")
async def verifier_whatsapp(request: Request):
    """Poignée de main de vérification exigée par Meta lors de la config du webhook.
    Meta appelle cette URL avec un défi ; on le renvoie tel quel si le token correspond."""
    params = request.query_params
    if (params.get("hub.mode") == "subscribe"
            and params.get("hub.verify_token") == settings.WHATSAPP_VERIFY_TOKEN
            and settings.WHATSAPP_VERIFY_TOKEN):
        return PlainTextResponse(params.get("hub.challenge") or "")
    return PlainTextResponse("Vérification échouée", status_code=403)


@router.post("/whatsapp")
async def webhook_whatsapp(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    msg = whatsapp_channel.parse_update(payload)
    if msg:
        background_tasks.add_task(traiter_message, msg)
    else:
        dest = whatsapp_channel.parse_non_texte(payload)
        if dest:
            background_tasks.add_task(repondre_non_texte, whatsapp_channel, dest)
    return {"ok": True}  # accusé de réception immédiat (NF2)
