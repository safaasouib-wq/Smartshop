"""Couche d'accès aux données — moteur SQLAlchemy et gestion de session."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Render (et Heroku) fournissent une URL "postgres://" ; SQLAlchemy 2.x exige "postgresql://".
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(_db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : fournit une session BDD et la ferme proprement."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
