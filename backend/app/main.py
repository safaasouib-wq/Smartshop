"""SmartShop Assistant — point d'entrée de l'application.

Lancement local :  uvicorn app.main:app --reload
Documentation API : http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import webhook, dashboard, commande, client, admin

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s — %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Au démarrage : crée les tables manquantes (n'altère PAS les tables existantes —
    # pour un changement de colonne, lancer migrate_livraison.py).
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SmartShop Assistant",
    description="Assistant conversationnel intelligent pour petits commerces — PFA 2026",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS pour le dashboard React en développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook.router)
app.include_router(dashboard.router)
app.include_router(commande.router)
app.include_router(client.router)
app.include_router(admin.router)


@app.get("/")
def sante():
    return {"statut": "ok", "application": "SmartShop Assistant"}
