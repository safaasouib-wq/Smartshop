# Tests SmartShop — preuve de vérification de l'application

Suite de tests automatisés couvrant les parcours réels de l'application. Aucune
dépendance externe requise : base **SQLite en mémoire** isolée par test, **aucune clé
LLM ni token Telegram** nécessaire (le seul appel au LLM est scénarisé de façon
déterministe). Exécutable tel quel, y compris en CI.

## Lancer les tests

```bash
cd backend
PYTHONUTF8=1 .venv/Scripts/python -m pytest          # tout
PYTHONUTF8=1 .venv/Scripts/python -m pytest -v       # détail (un nom lisible par scénario)
PYTHONUTF8=1 .venv/Scripts/python -m pytest tests/test_scenarios.py -v   # parcours de bout en bout
```

Résultat attendu : **tout au vert**.

## Ce qui est couvert

### Parcours de bout en bout — `test_scenarios.py`
Rejoue les actions concrètes de la démo :

| Scénario | Ce qui est vérifié |
|----------|--------------------|
| Commande vitrine (retrait) | panier → commande → n° de suivi, **vrai total**, **stock décrémenté** |
| Suivi de commande | page de suivi publique, étapes d'avancement, lignes commandées |
| Commande en livraison + suivi | le commerçant lance la livraison → l'app chauffeur poste sa position → étape **« en route » puis « livrée »** |
| Conversation avec le chatbot IA | le client demande la carte (l'IA consulte le catalogue) puis commande → **vraie commande créée** avec le bon total/stock |
| Panne LLM | le client reçoit un message d'attente, **jamais bloqué** (pas d'escalade définitive — NF7) |
| Compte client web | inscription → commande rattachée au compte → retrouvée dans « mes commandes » |
| Garde-fous « zéro hallucination » | produit hors catalogue **refusé (400)**, commande au-delà du stock **refusée (400)** |
| Badge best-seller | reflète les **vraies ventes** (marqué seulement après une vente réelle) |

### Tests unitaires / d'intégration
- `test_api.py` — santé, vitrine publique, authentification, **RBAC** (vendeur restreint), CRUD produits.
- `test_ai_tools.py` — couche d'exécution des outils de l'IA (le pont vers la vraie BDD) :
  recherche produit, listing, création de commande par **nom** (résolu côté serveur),
  **anti-doublon**, escalade vers un humain + alerte commerçant (best-effort), stock insuffisant.
- `test_webhook.py`, `test_telegram_adapter.py`, `test_whatsapp.py` — pipeline multi-canal
  (Telegram / WhatsApp) et réponse aux messages non-texte.

## Principe « zéro hallucination »
Plusieurs tests garantissent que l'IA et l'API ne servent **que des données réelles de la
base** (prix, stock, catalogue) : un produit inconnu ou une quantité au-delà du stock est
toujours rejeté, jamais inventé.
