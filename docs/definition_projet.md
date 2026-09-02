# Définition du projet — SmartShop Assistant

*Projet de Fin d'Année (PFA) — 2026*

---

## 1. Sujet

**Conception et réalisation d'un assistant conversationnel intelligent multicanal pour la digitalisation des petits commerces de proximité.**

Le système est un agent conversationnel (chatbot) qui dialogue avec les clients d'un commerce sur ses canaux de messagerie (Telegram, extensible à WhatsApp) en **darija, arabizi et français**. Il répond aux questions courantes (horaires, prix, disponibilité), **prend les commandes** de façon fiable, escalade vers le commerçant lorsque nécessaire, et s'accompagne :

- d'une **vitrine web** publique (catalogue réel, commande en ligne) ;
- d'un module de **commande omnicanale** avec choix **retrait / livraison** et **suivi géolocalisé du livreur** en temps réel (principe « Glovo ») ;
- de **comptes clients** (historique, commande en cours) ;
- d'un **back-office d'administration** (personnel/RH, base clients, produits, rapports d'activité) **sécurisé par un contrôle d'accès basé sur les rôles** (RBAC).

Le principe directeur : l'IA **ne répond jamais de mémoire** sur les données du commerce ; elle interroge la base de données via le **function calling**, garantissant **zéro hallucination** sur les prix et les stocks.

---

## 2. Contexte

Le commerce de détail traditionnel occupe une place prépondérante dans l'économie marocaine, où le petit commerce de proximité reste le premier canal d'achat quotidien. Parallèlement, deux dynamiques transforment la relation client :

1. **Le commerce conversationnel** (*conversational commerce*) : l'achat et la relation client migrent vers les applications de messagerie instantanée (WhatsApp, Telegram, Messenger), devenues le point de contact privilégié entre commerçants et clients.
2. **La démocratisation de l'IA générative** : l'arrivée des grands modèles de langue (LLM) rend enfin accessible un dialogue en langage naturel de qualité, sans scénarisation rigide.

Or, le petit commerçant se trouve dans une situation paradoxale : submergé par des messages répétitifs (« ch7al taman ? », « wach kayn ? », « fin kaynin ? »), il n'a **ni les compétences techniques, ni le budget** pour développer une solution sur mesure, et les plateformes existantes sont soit génériques et scénarisées, soit inadaptées à sa réalité linguistique (**darija/arabizi**) et économique.

Ce projet s'inscrit dans ce contexte : offrir aux petits commerces un assistant clé en main, économiquement soutenable et culturellement adapté.

---

## 3. Problématiques

- **P1 — Automatisation sans compétence technique.** Comment permettre à un commerçant non technicien d'automatiser sa relation client sur ses canaux de messagerie et de gérer son activité (produits, commandes, personnel) via une interface simple ?
- **P2 — Fiabilité factuelle (anti-hallucination).** Les LLM ont une propension documentée à générer des informations plausibles mais fausses. Comment garantir que les réponses sur les **prix, stocks et disponibilités** soient toujours exactes et à jour ?
- **P3 — Compréhension de la darija/arabizi.** Le dialecte marocain est une **langue peu dotée** (*low-resource*), non standardisée, marquée par le *code-switching* (arabe/français/anglais) et une double graphie (arabe et latine/arabizi). Comment comprendre et répondre correctement dans cette langue ?
- **P4 — Articulation IA / supervision humaine.** Comment concilier l'automatisation par l'IA avec le maintien du contrôle humain (mécanisme d'**escalade** vers le commerçant en cas d'incompréhension, de demande explicite ou de panne) ?
- **P5 — Passage à une plateforme complète et sécurisée.** Comment étendre le chatbot en une véritable plateforme (vitrine, commandes, livraison géolocalisée, gestion) tout en garantissant la **sécurité** et un **contrôle d'accès granulaire** (admin vs. employés) ?

---

## 4. Objectifs

### Objectif général

Concevoir et réaliser une plateforme d'assistance conversationnelle et de gestion, permettant à un petit commerce d'automatiser sa relation client multicanale et de piloter son activité, avec des réponses **factuellement fiables** et une compréhension satisfaisante de la darija/arabizi.

### Objectifs spécifiques

| Code | Objectif |
|------|----------|
| **O1** | Comprendre et traiter les messages clients en darija, arabizi et français, et y répondre dans la même langue. |
| **O2** | Garantir des réponses factuelles sans hallucination (prix, stock, horaires) via le *function calling* connecté à la base de données. |
| **O3** | Prendre en charge le cycle de commande complet (recherche produit, panier, confirmation, retrait/livraison, suivi). |
| **O4** | Assurer la supervision humaine par un mécanisme d'escalade et un tableau de bord commerçant. |
| **O5** | Offrir une vitrine web, des comptes clients et un suivi de livraison géolocalisé. |
| **O6** | Fournir un back-office de gestion (personnel, clients, produits, rapports) sécurisé par rôles. |

### Exigences non fonctionnelles (extrait)

- **NF1 — Réactivité :** temps de réponse de l'assistant ≤ **5 s**.
- **NF2 — Fiabilité :** accusé de réception immédiat des messages (traitement en tâche de fond), dégradation gracieuse en cas de panne du LLM (aucun client bloqué).
- **NF3 — Sécurité :** authentification JWT, mots de passe hachés (bcrypt), contrôle d'accès par rôles.
- **NF4 — Qualité linguistique :** taux de compréhension des messages ≥ **80 %** (objectif d'évaluation).
- **NF5 — Extensibilité :** architecture *Adapter* permettant l'ajout d'un canal (WhatsApp) sans modification du cœur métier.

---

## 5. Étude de l'existant et état de l'art

### 5.1 Étude de l'existant (solutions concurrentes)

| Solution | Type | Darija/Arabizi | IA conversationnelle | Anti-hallucination (connexion BDD) | Adapté au petit commerce marocain |
|----------|------|:---:|:---:|:---:|:---:|
| **ManyChat / Chatfuel / Landbot** | Chatbot no-code (arbres de décision) | ❌ Faible | ⚠️ Scénarisé | ❌ | ⚠️ Générique, payant |
| **WhatsApp Business (catalogue)** | Messagerie + catalogue | ⚠️ Manuel | ❌ | — | ⚠️ Basique, pas d'IA |
| **Assistants IA génériques (ChatGPT, etc.)** | LLM généraliste | ✅ Partiel | ✅ | ❌ (hallucine sur les données métier) | ❌ Non connecté au commerce |
| **Marketplaces (Glovo, Jumia…)** | Plateforme d'intermédiation | — | — | — | ❌ Commission + perte de la relation client |
| **SmartShop Assistant (ce projet)** | Assistant + plateforme | ✅ | ✅ (LLM + *function calling*) | ✅ | ✅ |

**Positionnement.** Les solutions no-code restent scénarisées et peu adaptées à la darija ; les LLM génériques hallucinent car déconnectés des données du commerce ; les marketplaces prélèvent une commission et s'approprient la relation client. SmartShop se positionne sur le créneau non couvert : **un assistant IA conversationnel, connecté aux données réelles du commerce, adapté à la darija/arabizi, et laissant le commerçant maître de sa relation client.**

### 5.2 État de l'art académique

**a) Des agents conversationnels aux LLM.** Les agents conversationnels remontent à ELIZA [1]. Les approches par règles puis orientées tâche ont cédé la place aux modèles neuronaux depuis l'architecture **Transformer** [2], qui a permis l'émergence des grands modèles de langue à apprentissage *few-shot* [3], capables d'un dialogue en langage naturel de qualité inédite.

**b) Le problème de l'hallucination et son traitement.** La génération de contenu factuellement erroné (*hallucination*) est un défaut structurel documenté des modèles génératifs [4]. Deux familles de solutions sont pertinentes pour notre projet : la **génération augmentée par récupération** (RAG) [5], et surtout l'**outillage des LLM** — leur donner la capacité d'appeler des fonctions/outils externes. Les travaux **ReAct** [6] (entrelacer raisonnement et actions) et **Toolformer** [7] (apprendre à appeler des API) fondent théoriquement notre choix du ***function calling*** : l'IA n'invente pas les prix, elle interroge la base via des fonctions (`chercher_produit`, `creer_commande`…).

**c) Chatbots dans le service client et l'e-commerce.** L'usage des chatbots dans la relation client est un champ actif de l'interaction humain-machine [8]. Les travaux empiriques montrent l'impact des indices anthropomorphiques et de la présence sociale sur la conformité et la satisfaction des utilisateurs [9], ce qui oriente la conception du ton et du comportement de l'assistant.

**d) TAL pour l'arabe dialectal (darija/arabizi).** Le traitement de l'arabe standard a progressé avec **AraBERT** [10], puis l'arabe dialectal avec **MARBERT/ARBERT** [11]. Plus spécifiquement, **DarijaBERT** [12] constitue la première famille de modèles pré-entraînés pour le dialecte marocain écrit, avec une variante dédiée à l'**arabizi** (darija en lettres latines). Ces travaux démontrent la **faisabilité** du traitement automatique de la darija et confortent notre approche s'appuyant sur des LLM multilingues récents pour la compréhension et la génération en darija/arabizi.

> **Synthèse.** L'état de l'art valide nos deux paris techniques centraux : (i) le *function calling* comme réponse à l'hallucination sur les données métier, et (ii) l'existence de ressources et de modèles capables de traiter la darija/arabizi.

---

## 6. Méthode de gestion de projet

### 6.1 Approche

Le projet suit une **démarche agile itérative et incrémentale** (inspirée de Scrum) : le produit est construit par **modules livrables et testés** successivement, chacun apportant une valeur démontrable. Ce choix est justifié par l'incertitude inhérente à un projet à forte composante IA (nécessité d'expérimenter les *prompts*, le modèle, le comportement conversationnel).

- **Découpage en incréments** : cœur conversationnel → dashboard → vitrine & comptes → livraison → administration → sécurité (RBAC).
- **Cycle par incrément** : analyse → conception → développement → **test/vérification** → intégration.
- **Outils** : gestion de versions (Git), suivi de tâches, tests fonctionnels de bout en bout après chaque module.

### 6.2 Planning prévisionnel (diagramme de Gantt)

Le projet est planifié sur **~17 semaines** (un semestre). Diagramme Mermaid (rendu automatiquement sur GitHub et la plupart des éditeurs Markdown) :

```mermaid
gantt
    title SmartShop Assistant — Planning prévisionnel (PFA 2026)
    dateFormat  YYYY-MM-DD
    axisFormat  S%W

    section Cadrage
    Étude de l'existant / état de l'art   :a1, 2026-02-02, 2w
    Cahier des charges & problématique    :a2, after a1, 1w

    section Conception
    Architecture, MCD, diagrammes UML     :b1, after a2, 2w

    section Développement
    Noyau : BDD, services, modèles        :c1, after b1, 1w
    Moteur IA (LLM + function calling)     :c2, after c1, 2w
    Adapter Telegram + webhook + escalade  :c3, after c1, 2w
    Dashboard commerçant (React)           :c4, after c2, 2w
    Vitrine web + comptes clients          :c5, after c4, 2w
    Livraison géolocalisée (carte, suivi)  :c6, after c5, 1w
    Module Administration (RH, clients...) :c7, after c5, 2w
    Sécurité / RBAC                        :c8, after c7, 1w

    section Validation
    Jeu de test darija & évaluation (>=80%):d1, after c6, 2w

    section Documentation
    Rédaction du rapport                   :e1, 2026-02-16, 14w
    Préparation de la soutenance           :e2, after d1, 1w
```

**Représentation tabulaire équivalente :**

| Phase | Tâches | Durée | Livrables |
|-------|--------|:-----:|-----------|
| **1. Cadrage** | État de l'art, cahier des charges | S1–S3 | Problématique, objectifs, CDC |
| **2. Conception** | Architecture, MCD, diagrammes UML | S4–S5 | Dossier de conception |
| **3. Développement** | Noyau, moteur IA, adapters, dashboard, vitrine, comptes, livraison, administration, RBAC | S5–S15 | Application fonctionnelle par modules |
| **4. Validation** | Jeu de test darija/arabizi, mesure du taux de compréhension et du temps de réponse | S14–S16 | Rapport d'évaluation (O4 ≥ 80 %) |
| **5. Documentation** | Rédaction continue du rapport, préparation soutenance | S3–S17 | Rapport PFA + soutenance |

### 6.3 Gestion des risques (extrait)

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|-----------|
| Hallucination du LLM sur les prix | Élevée | Élevé | *Function calling* obligatoire ; l'IA ne répond jamais de mémoire |
| Mauvais formatage d'appel d'outil (LLM) | Moyenne | Moyen | Mécanisme de *retry* ; résolution des produits **par nom** côté serveur |
| Quota/panne du LLM | Moyenne | Moyen | Dégradation gracieuse (aucun client bloqué), pas d'escalade abusive |
| Compréhension darija insuffisante | Moyenne | Élevé | Prompts affinés, jeu de test 50+ messages, choix d'un modèle capable |

---

## 7. Étude de faisabilité

### 7.1 Faisabilité technique

L'ensemble des briques technologiques est **mature, éprouvé et disponible** :

- **Backend :** Python / FastAPI, SQLAlchemy, PostgreSQL — pile standard et robuste.
- **IA :** LLM via une API compatible OpenAI (function calling), utilisable gratuitement (Groq) ou **100 % en local** (Ollama), levant la dépendance à un fournisseur payant.
- **Anti-hallucination :** le *function calling*, validé par l'état de l'art [6][7], résout le problème central.
- **Frontend :** React / Vite ; cartographie **Leaflet + OpenStreetMap** (gratuit, sans clé) pour le suivi de livraison ; génération de documents **PDF** (fpdf2).
- **Extensibilité :** patron *Adapter* pour l'ajout de canaux.

> **Verdict :** techniquement réalisable, chaque risque disposant d'une parade identifiée.

### 7.2 Faisabilité économique

- **Coûts de développement quasi nuls** : technologies open source, LLM gratuit ou local, cartographie OSM gratuite.
- **Coûts d'exploitation modestes** : un hébergement léger suffit ; l'option Ollama local supprime tout coût d'API.
- **Modèle économique envisageable** : offre SaaS par abonnement mensuel modéré destinée aux petits commerces, avec un point mort atteignable rapidement compte tenu des faibles coûts fixes.

### 7.3 Faisabilité organisationnelle et temporelle

- **Périmètre maîtrisé** grâce au découpage en modules livrables indépendamment ; un incrément retardé ne bloque pas les autres.
- **Planning réaliste** sur un semestre (cf. Gantt §6.2), avec la rédaction du rapport menée en parallèle.
- **Compétences requises** (développement web, bases de données, intégration LLM) couvertes par le cadre du PFA.

> **Conclusion :** le projet est **faisable** sur les plans technique, économique, organisationnel et temporel.

---

## 8. Références bibliographiques

[1] J. Weizenbaum, « ELIZA — a computer program for the study of natural language communication between man and machine », *Communications of the ACM*, vol. 9, n° 1, p. 36–45, 1966.

[2] A. Vaswani *et al.*, « Attention Is All You Need », *Advances in Neural Information Processing Systems (NeurIPS)*, 2017.

[3] T. Brown *et al.*, « Language Models are Few-Shot Learners » (GPT-3), *NeurIPS*, 2020.

[4] Z. Ji *et al.*, « Survey of Hallucination in Natural Language Generation », *ACM Computing Surveys*, vol. 55, n° 12, p. 1–38, 2023.

[5] P. Lewis *et al.*, « Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks », *NeurIPS*, 2020.

[6] S. Yao *et al.*, « ReAct: Synergizing Reasoning and Acting in Language Models », *International Conference on Learning Representations (ICLR)*, 2023.

[7] T. Schick *et al.*, « Toolformer: Language Models Can Teach Themselves to Use Tools », *NeurIPS*, 2023.

[8] A. Følstad et P. B. Brandtzæg, « Chatbots and the new world of HCI », *interactions (ACM)*, vol. 24, n° 4, p. 38–42, 2017.

[9] M. Adam, M. Wessel et A. Benlian, « AI-based chatbots in customer service and their effects on user compliance », *Electronic Markets*, vol. 31, n° 2, p. 427–445, 2021.

[10] W. Antoun, F. Baly et H. Hajj, « AraBERT: Transformer-based Model for Arabic Language Understanding », *Proc. 4th Workshop on Open-Source Arabic Corpora and Processing Tools (OSACT/LREC)*, 2020.

[11] M. Abdul-Mageed, A. Elmadany et E. M. B. Nagoudi, « ARBERT & MARBERT: Deep Bidirectional Transformers for Arabic », *Proc. 59th Annual Meeting of the ACL*, 2021.

[12] K. Gaanoun, A. M. Naira, A. Allak et I. Benelallam, « DarijaBERT: a step forward in NLP for the written Moroccan dialect », *International Journal of Data Science and Analytics*, Springer, 2023.

---

*Sources vérifiées en ligne pour [9] (Electronic Markets, Springer) et [12] (DarijaBERT, SI2M-Lab / Springer). Les références [1]–[8], [10]–[11] sont des travaux canoniques du domaine.*
