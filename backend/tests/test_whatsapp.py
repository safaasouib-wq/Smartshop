"""Tests de l'adaptateur WhatsApp : parsing des webhooks + poignée de main de vérification.

Aucun appel réseau ni compte Meta requis : on teste le décodage des payloads (déterministe)
et l'endpoint de vérification GET /webhook/whatsapp.
"""
from app.adapters.whatsapp import whatsapp_channel
from app.config import settings


def _payload_texte(texte="Salam, ch7al taman dyal sac ?", nom="Youssef", wa_id="212600000000"):
    """Reproduit le format d'un message texte entrant de la WhatsApp Cloud API."""
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "15550000000", "phone_number_id": "123456"},
                    "contacts": [{"profile": {"name": nom}, "wa_id": wa_id}],
                    "messages": [{
                        "from": wa_id, "id": "wamid.TEST", "timestamp": "1700000000",
                        "type": "text", "text": {"body": texte},
                    }],
                },
            }],
        }],
    }


def test_parse_message_texte():
    msg = whatsapp_channel.parse_update(_payload_texte())
    assert msg is not None
    assert msg.canal == "whatsapp"
    assert msg.identifiant_canal == "212600000000"
    assert msg.nom_client == "Youssef"
    assert msg.texte == "Salam, ch7al taman dyal sac ?"


def test_parse_ignore_accuse_de_livraison():
    """Les webhooks de statut (message livré/lu) n'ont pas de `messages` → ignorés."""
    payload = {"entry": [{"changes": [{"value": {
        "statuses": [{"id": "wamid.X", "status": "delivered"}]}}]}]}
    assert whatsapp_channel.parse_update(payload) is None


def test_parse_ignore_non_texte():
    """Une image (type != text) est hors périmètre → None."""
    payload = _payload_texte()
    payload["entry"][0]["changes"][0]["value"]["messages"][0] = {
        "from": "212600000000", "type": "image", "image": {"id": "abc"}}
    assert whatsapp_channel.parse_update(payload) is None


def test_parse_payload_inattendu():
    """Un payload vide ou malformé ne doit jamais faire planter le webhook."""
    assert whatsapp_channel.parse_update({}) is None
    assert whatsapp_channel.parse_update({"entry": []}) is None


def test_verification_webhook_ok(client, monkeypatch):
    """Meta appelle GET /webhook/whatsapp avec un défi : renvoyé tel quel si le token correspond."""
    monkeypatch.setattr(settings, "WHATSAPP_VERIFY_TOKEN", "mon-token-secret")
    r = client.get("/webhook/whatsapp", params={
        "hub.mode": "subscribe", "hub.verify_token": "mon-token-secret", "hub.challenge": "1234567890",
    })
    assert r.status_code == 200
    assert r.text == "1234567890"


def test_verification_webhook_mauvais_token(client, monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_VERIFY_TOKEN", "mon-token-secret")
    r = client.get("/webhook/whatsapp", params={
        "hub.mode": "subscribe", "hub.verify_token": "INTRUS", "hub.challenge": "1234567890",
    })
    assert r.status_code == 403


def test_non_texte_image_retourne_wa_id():
    """Une image (type != text) est détectée pour répondre poliment : retourne le wa_id."""
    payload = _payload_texte()
    payload["entry"][0]["changes"][0]["value"]["messages"][0] = {
        "from": "212600000000", "type": "image", "image": {"id": "abc"}}
    assert whatsapp_channel.parse_non_texte(payload) == "212600000000"


def test_non_texte_none_sur_message_texte():
    assert whatsapp_channel.parse_non_texte(_payload_texte()) is None


def test_non_texte_none_sur_statut():
    payload = {"entry": [{"changes": [{"value": {"statuses": [{"status": "delivered"}]}}]}]}
    assert whatsapp_channel.parse_non_texte(payload) is None


def test_non_texte_ignore_reaction():
    """Une réaction emoji (👍) du client ne doit PAS déclencher la réponse « écrivez en texte »."""
    payload = _payload_texte()
    payload["entry"][0]["changes"][0]["value"]["messages"][0] = {
        "from": "212600000000", "type": "reaction", "reaction": {"emoji": "👍", "message_id": "x"}}
    assert whatsapp_channel.parse_non_texte(payload) is None


def test_non_texte_ignore_message_systeme():
    """Un message système WhatsApp (ex. changement de numéro) ne doit pas déclencher de réponse."""
    payload = _payload_texte()
    payload["entry"][0]["changes"][0]["value"]["messages"][0] = {
        "from": "212600000000", "type": "system", "system": {"body": "changed number"}}
    assert whatsapp_channel.parse_non_texte(payload) is None
