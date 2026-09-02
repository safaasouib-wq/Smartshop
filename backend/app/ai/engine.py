"""Moteur conversationnel — orchestration LLM + function calling.

Boucle agentique classique :
  1. On envoie au LLM : prompt système + historique + message du client + outils.
  2. Si le LLM demande des appels de fonctions → on les exécute (couche services)
     et on lui renvoie les résultats.
  3. On répète jusqu'à obtenir une réponse texte finale (ou max d'itérations).
"""
import json
import logging
import re
import time

from openai import OpenAI, BadRequestError, RateLimitError
from sqlalchemy.orm import Session

from app import models
from app.ai.prompts import SYSTEM_PROMPT
from app.ai.tools import TOOLS, executer_outil
from app.config import settings
from app.services import services

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 5  # garde-fou contre les boucles infinies
MAX_LLM_RETRIES = 3      # certains modèles (Llama/Groq) formatent mal un appel d'outil de façon aléatoire

MESSAGE_REPLI = ("Désolé, j'ai un petit souci technique 🙏 "
                 "Pouvez-vous reformuler ou réessayer dans un instant ?")

MESSAGE_SURCHARGE = ("Je reçois beaucoup de demandes en ce moment 🙏 "
                     "Merci de réessayer dans quelques minutes.")

client_llm = OpenAI(api_key=settings.LLM_API_KEY, base_url=settings.LLM_BASE_URL)


def nettoyer_markdown(texte: str) -> str:
    """Les messages partent en TEXTE BRUT (Telegram/WhatsApp sans parse_mode) : on retire toute
    syntaxe markdown que le modèle pourrait produire, sinon elle s'affiche telle quelle (« **gras** »,
    barres de tableau « | », titres « # »). Garantie côté serveur, indépendante du modèle."""
    if not texte:
        return texte
    t = re.sub(r"\*{1,3}([^*\n]+?)\*{1,3}", r"\1", texte)   # **gras** / *italique* → texte nu
    t = t.replace("*", "").replace("`", "")                   # astérisques / backticks résiduels
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)               # titres markdown en début de ligne
    t = re.sub(r"(?m)^\s*\|.*\|\s*$", lambda m: m.group(0).replace("|", " ").strip(), t)  # lignes de tableau
    t = re.sub(r"(?m)^\s*[-:| ]{5,}\s*$", "", t)              # lignes séparatrices de tableau
    t = re.sub(r"\n{3,}", "\n\n", t)                           # aère sans trous excessifs
    return t.strip()


def _appeler_llm(messages: list[dict]):
    """Appelle le LLM avec retry sur `tool_use_failed`.

    Llama-3.3 sur Groq émet parfois un appel de fonction dans un mauvais format
    (`<function=...>` au lieu du JSON attendu) → l'API renvoie une 400 `tool_use_failed`.
    Comme c'est stochastique (temperature > 0), on réessaie plutôt que d'escalader."""
    derniere_exc = None
    for tentative in range(MAX_LLM_RETRIES):
        try:
            return client_llm.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                tools=TOOLS,
                temperature=0.3,
                max_tokens=600,
            )
        except BadRequestError as e:
            if "tool_use_failed" not in str(e):
                raise
            derniere_exc = e
            logger.warning("tool_use_failed (tentative %d/%d) — nouvel essai",
                           tentative + 1, MAX_LLM_RETRIES)
            time.sleep(0.4)
    raise derniere_exc


def _construire_messages(db: Session, conversation: models.Conversation) -> list[dict]:
    """Assemble prompt système + historique (F2.5)."""
    commerce = services.infos_commerce(db)
    nom_commerce = commerce.nom if commerce else "la boutique"

    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(nom_commerce=nom_commerce)}]

    for m in services.historique_conversation(db, conversation.id, settings.MAX_HISTORY_MESSAGES):
        role = "user" if m.emetteur == models.Emetteur.CLIENT else "assistant"
        messages.append({"role": role, "content": m.contenu})

    return messages


def generer_reponse(db: Session, conversation: models.Conversation) -> str:
    """Génère la réponse de l'assistant au dernier message client de la conversation.
    Retourne le texte à envoyer. En cas de panne LLM : message de repli + escalade (NF7)."""
    try:
        messages = _construire_messages(db, conversation)

        for _ in range(MAX_TOOL_ITERATIONS):
            reponse = _appeler_llm(messages)
            choix = reponse.choices[0].message

            # Cas 1 : le LLM demande des appels de fonctions
            if choix.tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": choix.content or "",
                    "tool_calls": [tc.model_dump() for tc in choix.tool_calls],
                })
                for tc in choix.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    resultat = executer_outil(db, conversation, tc.function.name, args)
                    logger.info("Outil %s(%s) -> %s", tc.function.name, args, resultat[:200])
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": resultat,
                    })
                continue  # nouvelle itération avec les résultats

            # Cas 2 : réponse texte finale
            return nettoyer_markdown(choix.content) if choix.content else MESSAGE_REPLI

        # Trop d'itérations : sécurité
        return MESSAGE_REPLI

    except RateLimitError:
        # Quota LLM temporairement atteint : ce n'est pas une panne, on n'escalade PAS
        # vers le commerçant — on invite simplement le client à réessayer.
        logger.warning("Quota LLM atteint (429) — message d'attente, pas d'escalade")
        return MESSAGE_SURCHARGE

    except Exception:
        # Erreur technique transitoire (réseau, format outil, LLM indisponible…).
        # On N'ESCALADE PAS : escalader mettrait l'IA en pause définitivement et
        # bloquerait le client. On invite à réessayer ; la conversation reste active.
        logger.exception("Erreur technique du moteur IA — réponse d'attente (pas d'escalade)")
        return MESSAGE_REPLI
