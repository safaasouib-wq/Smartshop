"""Test du webhook : la réponse polie aux messages non-texte est réellement ENVOYÉE.

Complète les tests d'adaptateurs (qui ne couvrent que la détection) en vérifiant que
repondre_non_texte envoie bien MESSAGE_NON_TEXTE sur le bon canal.
"""
from app.adapters.telegram import telegram_channel
from app.adapters.whatsapp import whatsapp_channel
from app.routes import webhook


def test_repondre_non_texte_telegram(monkeypatch):
    envoyes = []

    async def faux_envoi(identifiant, texte):
        envoyes.append((identifiant, texte))

    monkeypatch.setattr(telegram_channel, "send_message", faux_envoi)
    webhook.repondre_non_texte(telegram_channel, "42")
    assert envoyes == [("42", webhook.MESSAGE_NON_TEXTE)]


def test_repondre_non_texte_whatsapp(monkeypatch):
    envoyes = []

    async def faux_envoi(identifiant, texte):
        envoyes.append((identifiant, texte))

    monkeypatch.setattr(whatsapp_channel, "send_message", faux_envoi)
    webhook.repondre_non_texte(whatsapp_channel, "212600000000")
    assert envoyes == [("212600000000", webhook.MESSAGE_NON_TEXTE)]
