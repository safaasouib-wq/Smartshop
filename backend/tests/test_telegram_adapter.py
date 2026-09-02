"""Tests de l'adaptateur Telegram : parsing des messages texte et détection des non-texte."""
from app.adapters.telegram import telegram_channel


def _update(texte="Salam", chat_id=42, prenom="Youssef"):
    """Reproduit un update Telegram contenant un message texte."""
    return {"message": {"chat": {"id": chat_id}, "from": {"first_name": prenom}, "text": texte}}


def test_parse_message_texte():
    m = telegram_channel.parse_update(_update())
    assert m is not None
    assert m.canal == "telegram"
    assert m.identifiant_canal == "42"
    assert m.nom_client == "Youssef"
    assert m.texte == "Salam"


def test_parse_ignore_message_vocal():
    """Un vocal (pas de clé 'text') n'est pas traité par l'IA → None."""
    payload = {"message": {"chat": {"id": 42}, "voice": {"file_id": "v"}}}
    assert telegram_channel.parse_update(payload) is None


def test_non_texte_retourne_chat_id():
    """Mais on sait le détecter pour répondre poliment : retourne le chat_id."""
    payload = {"message": {"chat": {"id": 42}, "voice": {"file_id": "v"}}}
    assert telegram_channel.parse_non_texte(payload) == "42"


def test_non_texte_none_sur_message_texte():
    assert telegram_channel.parse_non_texte(_update()) is None


def test_non_texte_none_sur_update_vide():
    assert telegram_channel.parse_non_texte({}) is None


def test_non_texte_ignore_message_de_service():
    """Un message de service (arrivée d'un membre, épinglage...) ne doit pas déclencher de réponse."""
    payload = {"message": {"chat": {"id": 42}, "new_chat_members": [{"id": 1}]}}
    assert telegram_channel.parse_non_texte(payload) is None


def test_extraire_audio_detecte_le_vocal():
    """Un message vocal est reconnu et fournit chat_id + file_id pour la transcription."""
    payload = {"message": {"chat": {"id": 42}, "from": {"first_name": "Safaa"},
                           "voice": {"file_id": "AwACv123"}}}
    v = telegram_channel.extraire_audio(payload)
    assert v == {"chat_id": "42", "file_id": "AwACv123", "nom": "Safaa"}


def test_extraire_audio_none_sur_message_texte():
    """Un message texte n'est pas un vocal."""
    assert telegram_channel.extraire_audio(_update()) is None
