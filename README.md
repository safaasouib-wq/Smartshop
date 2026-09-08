# SmartShop Assistant 🛍️🤖

Assistant conversationnel intelligent **et** plateforme e-commerce pour petits commerces — **PFA 2026**.

Le bot répond aux clients sur Telegram/WhatsApp (horaires, prix, disponibilité), **prend les commandes**, gère la **livraison géolocalisée en temps réel**, et **escalade vers le commerçant** quand nécessaire. Le tout est piloté depuis un **dashboard de gestion** complet, doublé d'une **vitrine e-commerce publique** avec comptes clients et suivi de livraison.

> **Promesse clé — zéro hallucination sur les prix.** L'IA ne répond jamais « de mémoire » : elle appelle des fonctions (*function calling*) qui interrogent la vraie base de données. Les prix, stocks et infos affichés sont toujours les vraies données du commerce.

## Architecture

```
Telegram / WhatsApp / Web → Webhook → Adapter → Moteur IA (LLM + function calling)
                                                     ↓
                                          Services métier → PostgreSQL
                                                     ↑
                    Dashboard admin (API REST /api)  +  Vitrine e-commerce (React)
```

- **Pattern Adapter** (`app/adapters/`) : chaque canal implémente `MessagingChannel` — ajouter WhatsApp ne demande aucune modification du cœur métier.
- **Function calling** (`app/ai/`) : l'IA appelle `chercher_produit`, `lister_produits`, `creer_commande`, etc., qui interrogent la vraie BDD → **zéro hallucination sur les prix**.
- **Escalade** : conversation transférée à l'humain sur demande du client, incompréhension, ou panne technique. L'IA se met alors en pause jusqu'à ce que le commerçant « rende la main à l'IA ».

## Fonctionnalités

### 🤖 Moteur conversationnel IA
- Boucle **agentique** (LLM + *function calling*) avec 6 outils : `chercher_produit`, `lister_produits` (parcourir le catalogue), `obtenir_infos_commerce`, `creer_commande`, `consulter_notes_client`, `escalader_vers_humain`.
- Compréhension **multilingue** : français, arabe, **darija** et **arabizi**.
- **Robustesse** : retry sur erreurs de format LLM, garde-fou anti-doublon de commande (fenêtre 5 min), résolution des produits par **nom** côté serveur (le LLM ne manipule jamais d'ID), dégradation gracieuse en cas de rate-limit ou de panne (le client n'est jamais bloqué).

### 📱 Canaux (Pattern Adapter)
- **Telegram** (webhook) implémenté ; **WhatsApp** prévu sans toucher au cœur métier ; canal **web** (vitrine).

### 🛒 Vitrine e-commerce publique
- Storefront public (`/`), commande par panier, **comptes clients web** (inscription / connexion JWT), panier persistant (localStorage), historique de commandes et re-commande en un clic.

### 🛵 Livraison géolocalisée en temps réel
- Suivi sur carte (**Leaflet + OpenStreetMap**), géocodage d'adresse (**Nominatim**).
- Livreur **virtuel simulé** (interpolation boutique → client) **ou** API pour un vrai livreur (`POST /api/commandes/{id}/livreur/position`).
- Étapes : reçue → préparation → prête → en_route → proche → livrée, avec notifications via Telegram ou la page de suivi web.

### 📊 Dashboard commerçant — 9 onglets (`/admin`)
`📊 Statistiques` · `📦 Produits` (CRUD, alertes stock, produits saisonniers, analytics des recherches) · `🧾 Commandes` (changement de statut + notification auto du client + ticket PDF) · `💬 Conversations` (réponse directe au client + « rendre la main à l'IA ») · `🙋 Escalades` · `👥 Personnel` (RH : employés, congés, absences, attestations PDF) · `🗂️ Clients` (segmentation VIP/Fidèle/Nouveau/Inactif, notes internes lues par l'IA) · `📈 Rapports` (CA, top produits, heures de pointe, export PDF) · `🔐 Utilisateurs`.

### 🔐 Sécurité & administration
- **JWT + bcrypt**, contrôle d'accès **RBAC** : rôles `admin` / `vendeur` + permissions par module (le dashboard filtre les onglets selon les droits).
- Génération de **PDF** (attestations de travail, ordres de congé, tickets de commande, rapports d'activité).

## Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Python · **FastAPI** · **SQLAlchemy 2.0** · Uvicorn · Pydantic Settings |
| **Base de données** | **PostgreSQL** (prod / docker) — compatible SQLite en dev local |
| **IA / LLM** | SDK **OpenAI** pointé sur **Groq** (`llama-3.3-70b-versatile`) — alternative locale **Ollama** |
| **Auth** | python-jose (JWT) · passlib + **bcrypt 4.0.1** |
| **PDF** | fpdf2 |
| **Frontend** | **React 18** · **Vite 6** (JSX, graphiques CSS maison, sans lib externe) |
| **Cartographie** | Leaflet + OpenStreetMap + Nominatim (géocodage) |
| **Messagerie** | API Bot **Telegram** (webhook) |
| **Déploiement** | Docker / docker-compose · ngrok / cloudflared (tunnel pour le webhook) |

## Démarrage rapide

### 1. Prérequis (5 min)

1. **Bot Telegram** : ouvrir Telegram → `@BotFather` → `/newbot` → copier le token.
2. **Clé LLM gratuite** : créer un compte sur `console.groq.com` → API Keys → copier la clé.
   *(Alternative 100 % locale : installer Ollama et mettre `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_MODEL=llama3.1`.)*

### 2. Configuration

```bash
cp .env.example .env
# Éditer .env : coller TELEGRAM_BOT_TOKEN et LLM_API_KEY
```

### 3. Lancement (Docker)

```bash
docker-compose up --build -d
docker-compose exec backend python seed.py   # données de démo (pâtisserie + produits)
```

- API + doc Swagger : http://localhost:8000/docs
- Dashboard : http://localhost:5173/admin — compte `admin@smartshop.ma` / `admin123`
- Vitrine publique : http://localhost:5173/

> Le service `frontend` est un **nginx** qui sert le bundle Vite et relaie `/api`, `/webhook` et `/docs` vers le backend (même origine → pas de CORS).

### 3 bis. Lancement local sans Docker (dev)

```bash
# Backend (SQLite) — depuis backend/
#   .env : DATABASE_URL=sqlite:///./smartshop.db
python -m uvicorn app.main:app --port 8000
python seed.py

# Frontend — depuis frontend/
npm install
npm run dev        # http://localhost:5173 (proxy /api → backend :8000)
```

### 4. Connecter le webhook Telegram

Telegram doit pouvoir joindre ton serveur → **ngrok** (ou cloudflared) en développement :

```bash
ngrok http 8000
# Copier l'URL https générée, puis :
curl "https://api.telegram.org/bot<TON_TOKEN>/setWebhook?url=https://<URL>/webhook/telegram"
```

### 5. Tester 🎉

Envoyer à ton bot sur Telegram :
- `Salam, ch7al taman dyal chebakia ?` → l'IA cherche le produit et donne le vrai prix
- `chno kayn 3ndkom ?` → l'IA liste le catalogue réel
- `Bghit ncommandi 2 boîtes cornes de gazelle` → prise de commande avec récapitulatif
- `Bghit nhder m3a chi wa7ed` → escalade vers le commerçant

## CI/CD (GitHub Actions)

Pipeline défini dans `.github/workflows/ci-cd.yml`, déclenché sur *push* `main`, tags `v*`, *pull request* et manuellement.

| Stage | Job | Contenu |
|---|---|---|
| **Build + Test** | `backend` | Python 3.12, cache pip, vérification d'import de l'app, **pytest** (55 tests, SQLite en mémoire — aucun secret requis), rapport JUnit en artefact |
| **Build** | `frontend` | Node 20, cache npm, `npm ci` + `npm run build`, bundle `dist/` en artefact |
| **Deploy** | `publier-images` | Build **multi-images** (backend + frontend) et push vers **ghcr.io** avec cache de build GitHub. Ignoré sur les pull requests |

Images publiées (tags : `latest`, `main`, `sha-xxxxxxx`, `vX.Y.Z`) :

```
ghcr.io/safaasouib-wq/smartshop/backend
ghcr.io/safaasouib-wq/smartshop/frontend
```

Aucun secret à configurer : le job utilise le `GITHUB_TOKEN` intégré (`packages: write`).
Après le premier run, rendre les packages publics si besoin : *repo → Packages → Package settings → Change visibility*.

### Déploiement depuis les images publiées

```bash
cp .env.example .env          # renseigner les tokens sur le serveur
docker login ghcr.io -u <utilisateur> -p <token>
export IMAGE_TAG=latest       # ou sha-1a2b3c4 / v1.0.0 pour un rollback
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python seed.py   # 1re fois
```

La vitrine est alors sur le port **80**, le backend n'est pas exposé publiquement (accessible uniquement via le proxy nginx).

## Structure du code

```
backend/app/
├── main.py            # Point d'entrée FastAPI (monte tous les routeurs)
├── config.py          # Configuration (.env via Pydantic Settings)
├── database.py        # SQLAlchemy (engine + session)
├── models.py          # 16 entités (MCD)
├── auth.py            # JWT + bcrypt + RBAC (rôles / permissions)
├── pdf.py             # Génération PDF (attestations, tickets, rapports)
├── livraison.py       # Moteur de livraison (livreur simulé + API vrai livreur)
├── adapters/          # Pattern adapter (base.py + telegram.py)
├── ai/                # prompts.py · tools.py · engine.py (boucle agentique)
├── services/          # Logique métier (produits, commandes, escalade…)
└── routes/            # webhook · dashboard · commande · client · admin

frontend/src/
├── App.jsx            # Dashboard admin (9 onglets, filtrés par permissions)
├── Vitrine.jsx        # Storefront e-commerce public
├── Suivi.jsx          # Page de suivi de livraison temps réel (carte Leaflet)
├── Compte.jsx         # Comptes clients web (auth + historique)
├── ProduitsAdmin.jsx · Personnel.jsx · Clients.jsx · Rapports.jsx · Utilisateurs.jsx
├── api.js · clientApi.js  # Clients HTTP (dashboard / vitrine)
└── main.jsx           # Point d'entrée + routage
```

## Modèle de données (16 entités)

`Commerce` · `Produit` · `Client` · `Conversation` · `Message` · `Commande` · `LigneCommande` · `Utilisateur` · `Escalade` · `Employe` · `Conge` · `Absence` · `RechercheProduit`, plus les énumérations de statuts.

> Note : `Base.metadata.create_all` ne modifie **pas** les tables existantes. Après un ajout de colonne, relancer la migration idempotente `python migrate_livraison.py`.

## Évaluation du moteur IA (protocole du chapitre 5)

```bash
docker-compose exec backend python evaluer.py
```

Le script rejoue un jeu de test (arabizi/darija/français, ~30 intentions) dans des conversations isolées, mesure le temps de réponse (NF1 ≤ 5 s) et produit `resultats_evaluation.csv`. Annoter la colonne `correct` (1/0) puis calculer le taux (objectif O4 : ≥ 80 %).

## Dossier de conception (docs/diagrammes/)

01 cas d'utilisation · 02 classes · 03-05 séquences (question, commande, escalade) · 06 MCD · 07 déploiement — sources `.dot` modifiables incluses.
