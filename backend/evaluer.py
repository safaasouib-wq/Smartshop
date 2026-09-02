"""Évaluation du moteur IA sur le jeu de test conversationnel (objectif O4 : ≥ 80 %).

Usage :  docker-compose exec backend python evaluer.py
Envoie chaque message du CSV au moteur IA (dans une conversation isolée) et
enregistre la réponse dans docs/resultats_evaluation.csv.
L'annotation correct(1/0) se fait ensuite manuellement — c'est le protocole
d'évaluation à décrire dans le chapitre 5 du rapport.
"""
import csv
import sys
import time

from app.adapters.base import IncomingMessage
from app.ai.engine import generer_reponse
from app.database import SessionLocal
from app import models
from app.services import services

FICHIER_TEST = "/code/../docs/jeu_de_test_conversationnel.csv" if False else "jeu_de_test_conversationnel.csv"
FICHIER_SORTIE = "resultats_evaluation.csv"


def main():
    db = SessionLocal()
    with open(FICHIER_TEST, encoding="utf-8") as f:
        lignes = list(csv.DictReader(f))

    resultats = []
    for i, ligne in enumerate(lignes, 1):
        # Chaque message de test est joué dans une conversation NEUVE et isolée
        msg = IncomingMessage(canal="test", identifiant_canal=f"test-{ligne['id']}",
                              nom_client="Testeur", texte=ligne["message"])
        client = services.get_or_create_client(db, msg)
        conv = models.Conversation(client_id=client.id)
        db.add(conv); db.commit(); db.refresh(conv)

        services.enregistrer_message(db, conv.id, models.Emetteur.CLIENT, msg.texte)
        debut = time.time()
        reponse = generer_reponse(db, conv)
        duree = round(time.time() - debut, 2)

        ligne["resultat_obtenu"] = reponse
        ligne["duree_s"] = duree
        resultats.append(ligne)
        print(f"[{i}/{len(lignes)}] ({duree}s) {ligne['message'][:40]!r} -> {reponse[:60]!r}")

    with open(FICHIER_SORTIE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(resultats[0].keys()))
        writer.writeheader()
        writer.writerows(resultats)

    durees = [r["duree_s"] for r in resultats]
    print(f"\n✅ {len(resultats)} messages évalués — résultats dans {FICHIER_SORTIE}")
    print(f"   Temps de réponse moyen : {sum(durees)/len(durees):.2f}s (exigence NF1 : ≤ 5s)")
    print("   → Annoter la colonne 'correct' (1/0) puis calculer le taux de compréhension.")
    db.close()


if __name__ == "__main__":
    sys.exit(main())
