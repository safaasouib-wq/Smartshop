"""Couche d'accès aux données — moteur SQLAlchemy et gestion de session."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : fournit une session BDD et la ferme proprement."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
