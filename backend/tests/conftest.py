"""Fixtures de test — base SQLite en mémoire, isolée par test, sans secrets externes.

Aucune clé LLM ni token Telegram n'est requis : ces tests couvrent l'API, la sécurité
(RBAC) et la couche d'exécution des outils de l'IA (le pont vers la vraie BDD), pas le
LLM lui-même. Exécutables tels quels dans un runner CI.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.auth import hacher_mot_de_passe
from app.database import Base, get_db
from app.main import app

# Base SQLite en mémoire partagée par la connexion unique (StaticPool) le temps d'un test.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def _schema():
    """Repart d'un schéma vierge à chaque test (isolation)."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Session directe, pour tester services / outils IA sans passer par HTTP."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """Client HTTP FastAPI, avec la dépendance BDD redirigée vers la base de test.

    On instancie TestClient SANS `with` volontairement : l'événement `startup` de l'app
    ferait un create_all sur la vraie base (config .env). Ici le schéma est déjà créé
    par la fixture `_schema` sur le moteur de test.
    """
    def _get_db_test():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _get_db_test
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def seed(db):
    """Jeu de données minimal : 1 commerce, 1 admin, 1 vendeur restreint, 2 produits."""
    commerce = models.Commerce(nom="Boutique Test", adresse="Rue de Test", telephone="0600000000",
                               horaires="Lun-Sam 9h-20h")
    db.add(commerce)
    db.commit()
    db.refresh(commerce)

    admin = models.Utilisateur(
        email="admin@smartshop.ma", mot_de_passe_hache=hacher_mot_de_passe("admin123"),
        role="admin", nom="Admin",
    )
    vendeur = models.Utilisateur(
        email="vendeur@smartshop.ma", mot_de_passe_hache=hacher_mot_de_passe("vendeur123"),
        role="vendeur", permissions="commandes", nom="Vendeur",  # accès commandes uniquement
    )
    sac = models.Produit(commerce_id=commerce.id, nom="Sac à main cuir grainé chocolat", prix=2200.0, stock=10,
                         categorie="Sacs", actif=True)
    montre = models.Produit(commerce_id=commerce.id, nom="Montre ovale dorée", prix=1600.0, stock=20,
                            categorie="Montres", actif=True)
    db.add_all([admin, vendeur, sac, montre])
    db.commit()

    return {
        "commerce_id": commerce.id,
        "sac_id": sac.id,
        "montre_id": montre.id,
    }


@pytest.fixture
def login(client):
    """Retourne un helper `login(username, password)` → en-têtes d'autorisation Bearer."""
    def _login(username, password):
        r = client.post("/api/auth/login", data={"username": username, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _login


@pytest.fixture
def conversation(db, seed):
    """Une conversation Telegram de test, pour exercer les outils de l'IA."""
    client_row = models.Client(identifiant_canal="test-123", canal="telegram", nom="Client Test")
    db.add(client_row)
    db.commit()
    db.refresh(client_row)
    conv = models.Conversation(client_id=client_row.id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv
