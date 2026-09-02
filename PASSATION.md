# 🤝 Passation — SmartShop

Ce document permet à l'équipe **CI/CD & Infrastructure** de démarrer sans dépendre de la
partie Application/IA (déjà livrée). Il décrit comment lancer le projet, lancer les tests,
et ce qui reste à faire.

---

## 1. Qui a fait quoi

| Périmètre | Responsable | État |
|-----------|-------------|------|
| **Application + IA** (backend FastAPI, frontend React, chatbot IA, tests) | Safaa | ✅ Livré |
| **CI/CD + Infrastructure** (GitHub Actions, Docker, déploiement) | Membres 2 & 3 | ⏳ À faire |

**Ce qui est livré côté Application/IA :**
- Backend **FastAPI** : vitrine publique, commandes en ligne, livraison géolocalisée,
  comptes clients, dashboard commerçant, RBAC, modules admin (RH, clients, rapports…).
- Frontend **React + Vite** : vitrine (`/`), suivi de commande (`/suivi`), dashboard (`/admin`).
- **Chatbot IA** multi-canal (Telegram/WhatsApp) via Groq (`gpt-oss-120b`), function-calling
  **zéro-hallucination**, transcription vocale **Whisper**, suivi de commande, recommandations,
  résumé IA de la journée.
- **55 tests automatisés** (`pytest`) — **SQLite en mémoire, sans aucun secret → prêts pour la CI**.
- Base Docker : `backend/Dockerfile` + `docker-compose.yml` (Postgres + backend).

---

## 2. Structure du dépôt

```
smartshop/
├── backend/            # API FastAPI (Python 3.12)
│   ├── app/            # code applicatif (routes, ai, services, adapters…)
│   ├── tests/          # 55 tests pytest (voir tests/README.md)
│   ├── requirements.txt / requirements-dev.txt
│   └── Dockerfile
├── frontend/           # React + Vite
│   ├── src/            # vitrine, dashboard, suivi…
│   └── package.json
├── docs/               # définition projet, diagrammes, jeux de test
├── docker-compose.yml  # Postgres + backend (⚠️ pas encore de service frontend)
├── .env.example        # variables d'environnement (à copier en .env)
└── PASSATION.md        # ce document
```

---

## 3. Lancer le projet

### Prérequis
- **Copier `.env.example` en `.env`** et remplir au minimum `LLM_API_KEY` (clé gratuite sur
  console.groq.com) et `TELEGRAM_BOT_TOKEN` (via @BotFather). Le reste est optionnel.

### Option A — Docker (recommandé pour l'infra)
```bash
cp .env.example .env      # puis remplir les clés
docker compose up --build
```
Lance **Postgres** + **backend** (http://localhost:8000). Le frontend n'est **pas encore**
dans le compose (voir « À faire »).

### Option B — Local sans Docker (dev)
```bash
# Backend
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
# .env : mettre DATABASE_URL=sqlite:///./smartshop.db pour éviter Postgres en dev
python seed.py                                            # jeu de données de démo
uvicorn app.main:app --port 8000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev                                               # http://localhost:5173 (proxy /api → :8000)
```
Dashboard : `admin@smartshop.ma` / `admin123`.

---

## 4. Lancer les tests (⭐ point clé pour la CI)

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest                     # 55 tests, ~15 s
```
**Aucun secret requis** (base SQLite en mémoire) → parfait pour un job GitHub Actions.
Détail des scénarios couverts : `backend/tests/README.md`.

Build de production du frontend (à vérifier aussi en CI) :
```bash
cd frontend && npm ci && npm run build
```

---

## 5. À FAIRE — périmètre CI/CD & Infrastructure

- [ ] **CI GitHub Actions** (`.github/workflows/ci.yml`) sur push / pull request :
  - job backend : `pip install -r backend/requirements.txt -r backend/requirements-dev.txt` puis `pytest` (dans `backend/`).
  - job frontend : `npm ci` puis `npm run build` (dans `frontend/`).
- [ ] **Dockerfile frontend** (build Vite + service statique, ex. nginx) — n'existe pas encore.
- [ ] **Ajouter le service `frontend`** au `docker-compose.yml` (aujourd'hui : db + backend seulement).
- [ ] **Déploiement** : héberger l'app avec un **domaine HTTPS stable**.
  - ⚠️ Important : le **webhook Telegram** exige une URL publique HTTPS. En dev on utilise un
    tunnel temporaire (cloudflared) ; en prod, pointer `setWebhook` vers le domaine déployé
    (`https://<domaine>/webhook/telegram`).
- [ ] **Gestion des secrets** : ne jamais committer `.env` (déjà dans `.gitignore`).
  Utiliser les **GitHub Actions secrets** / variables d'environnement du serveur.
- [ ] **Migrations base** : en prod, prévoir une stratégie (aujourd'hui `create_all` au démarrage
  + script `backend/migrate_livraison.py` pour les colonnes ajoutées).

---

## 6. Points d'attention techniques

- **LLM (Groq)** : `LLM_MODEL=openai/gpt-oss-120b` (les Llama 3.x ont été retirés de Groq).
  `LLM_TRANSCRIPTION_MODEL=whisper-large-v3` pour les vocaux. Quota gratuit limité.
- **bcrypt** : gardé à `bcrypt==4.0.1` (passlib 1.7 plante avec bcrypt ≥ 4.1). Ne pas bumper
  sans changer passlib.
- **psycopg2-binary** : utilisé par le compose (Postgres). En dev local Windows, préférer
  SQLite (pas de wheel psycopg2 récent).
- **Sécurité** : mettre un vrai `JWT_SECRET` (chaîne aléatoire longue) en prod.

---

## 7. Contact
Questions sur la partie Application/IA → **Safaa**. Le code est documenté et testé ; ce
document + `README.md` + `backend/tests/README.md` couvrent l'essentiel.
