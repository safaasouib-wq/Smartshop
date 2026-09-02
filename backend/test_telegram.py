"""Simulateur de conversation Telegram — teste le pipeline IA sans bot ni ngrok.

Envoie de faux « updates » Telegram au webhook local et affiche les réponses de
l'assistant lues directement en base de données. Permet de valider tout le cœur
métier (compréhension darija/arabizi, function calling, prise de commande,
escalade) sans avoir besoin d'un vrai bot Telegram ni d'exposer le PC via ngrok.

Prérequis :
  1. Le backend doit tourner :  uvicorn app.main:app --port 8000
  2. Une clé LLM dans .env      :  LLM_API_KEY=gsk_...   (console.groq.com, gratuit)
     Sans clé, l'IA ne peut pas répondre → elle escalade sur « panne technique ».

Usage :
  python test_telegram.py                       # joue le scénario de démo
  python test_telegram.py "msg 1" "msg 2" ...   # joue tes propres messages
"""
import json
import sys
import time
import urllib.error
import urllib.request

from app.config import settings
from app.database import SessionLocal
from app import models

WEBHOOK = "http://127.0.0.1:8000/webhook/telegram"
CHAT_ID = str(int(time.time()))   # nouvel identifiant → conversation fraîche à chaque exécution
NOM_CLIENT = "TestClient"
TIMEOUT_REPONSE = 30              # secondes d'attente max pour une réponse de l'IA

# Scénario de démo : question de prix → commande → escalade
SCENARIO = [
    "Salam, chhal taman dyal chebakia?",
    "Bghit ncommandi 2 boîtes cornes de gazelle",
    "Wakha, chokran",
    "Bghit nhder m3a chi wa7ed",
]

EMOJI = {"client": "🧑", "ia": "🤖", "commercant": "🧑‍💼"}


def poster(texte: str) -> None:
    """Envoie un faux update Telegram au webhook (ACK immédiat, traitement en tâche de fond)."""
    payload = {"message": {"chat": {"id": int(CHAT_ID)},
                           "from": {"first_name": NOM_CLIENT},
                           "text": texte}}
    req = urllib.request.Request(
        WEBHOOK, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    urllib.request.urlopen(req, timeout=10).read()


def conversation_active(db):
    client = (db.query(models.Client)
              .filter_by(identifiant_canal=CHAT_ID, canal="telegram").first())
    if not client:
        return None
    return (db.query(models.Conversation)
            .filter_by(client_id=client.id)
            .order_by(models.Conversation.date_creation.desc()).first())


def attendre_reponse(dernier_id: int):
    """Poll la base jusqu'à ce qu'un message non-client apparaisse (ou timeout).
    Retourne (message_reponse | None, id_du_dernier_message_vu, escaladee?)."""
    fin = time.time() + TIMEOUT_REPONSE
    while time.time() < fin:
        time.sleep(0.5)
        db = SessionLocal()
        try:
            conv = conversation_active(db)
            if conv is None:
                continue
            nouveaux = (db.query(models.Message)
                        .filter(models.Message.conversation_id == conv.id,
                                models.Message.id > dernier_id)
                        .order_by(models.Message.id).all())
            reponses = [m for m in nouveaux if m.emetteur != models.Emetteur.CLIENT]
            if reponses:
                escaladee = conv.statut == models.StatutConversation.ESCALADEE
                return reponses[-1], reponses[-1].id, escaladee
        finally:
            db.close()
    return None, dernier_id, False


def afficher_resume():
    db = SessionLocal()
    try:
        conv = conversation_active(db)
        if conv is None:
            print("Aucune conversation créée.")
            return
        cmds = db.query(models.Commande).filter_by(conversation_id=conv.id).all()
        escs = db.query(models.Escalade).filter_by(conversation_id=conv.id).all()
        print("─" * 60)
        print("RÉSUMÉ")
        print(f"  Conversation #{conv.id} : statut «{conv.statut.value}» "
              f"(gérée par {conv.gere_par.value})")
        for c in cmds:
            lignes = ", ".join(f"{l.quantite}× {l.produit.nom}" for l in c.lignes)
            print(f"  ✅ Commande #{c.id} : {lignes} — total {c.total} DH")
        for e in escs:
            print(f"  🙋 Escalade #{e.id} : {e.raison or 'non précisée'} [{e.statut.value}]")
        if not cmds and not escs:
            print("  (aucune commande ni escalade enregistrée)")
    finally:
        db.close()


def main():
    scenario = sys.argv[1:] or SCENARIO

    print(f"=== Simulation Telegram — chat_id {CHAT_ID} ===\n")
    if not settings.LLM_API_KEY:
        print("⚠️  LLM_API_KEY est vide : l'IA ne pourra pas répondre et escaladera")
        print("    sur « panne technique ». Ajoute ta clé Groq dans .env pour un vrai test.\n")

    dernier_id = 0
    for texte in scenario:
        print(f"{EMOJI['client']}  Client   : {texte}")
        try:
            poster(texte)
        except urllib.error.URLError as e:
            print(f"\n❌ Impossible de joindre le backend sur {WEBHOOK}")
            print(f"   ({e}). Lance-le d'abord : uvicorn app.main:app --port 8000")
            return

        reponse, dernier_id, escaladee = attendre_reponse(dernier_id)
        if reponse is not None:
            libelle = "Assistant" if reponse.emetteur == models.Emetteur.IA else "Commerçant"
            print(f"{EMOJI[reponse.emetteur.value]}  {libelle}: {reponse.contenu}")
            if escaladee:
                print("    ⚠️  conversation ESCALADÉE → l'IA se met en pause")
        else:
            print("    (pas de réponse — conversation escaladée, l'IA est en pause)")
        print()

    afficher_resume()


if __name__ == "__main__":
    main()
