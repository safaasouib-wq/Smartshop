"""Ajoute les colonnes de livraison aux tables existantes (idempotent).
SQLite ne les crée pas via create_all() sur une base déjà remplie. Usage : python migrate_livraison.py"""
from sqlalchemy import text
from app.database import engine

COLONNES = {
    "commerces": [
        ("lat", "FLOAT"),
        ("lng", "FLOAT"),
    ],
    "clients": [
        ("email", "VARCHAR(150)"),
        ("mot_de_passe_hache", "VARCHAR(200)"),
        ("adresse", "TEXT DEFAULT ''"),
        ("notes", "TEXT DEFAULT ''"),
    ],
    "produits": [
        ("seuil_stock", "INTEGER DEFAULT 5"),
    ],
    "utilisateurs": [
        ("permissions", "TEXT DEFAULT ''"),
        ("nom", "VARCHAR(120) DEFAULT ''"),
    ],
    "commandes": [
        ("mode", "VARCHAR(20) DEFAULT 'retrait'"),
        ("adresse_livraison", "TEXT DEFAULT ''"),
        ("telephone_client", "VARCHAR(30) DEFAULT ''"),
        ("lat_client", "FLOAT"),
        ("lng_client", "FLOAT"),
        ("suivi_livraison", "VARCHAR(20) DEFAULT ''"),
        ("lat_livreur", "FLOAT"),
        ("lng_livreur", "FLOAT"),
    ],
}

with engine.begin() as conn:
    for table, cols in COLONNES.items():
        existantes = {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))}
        for nom, typ in cols:
            if nom in existantes:
                print(f"= {table}.{nom} déjà présent")
            else:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {nom} {typ}"))
                print(f"+ {table}.{nom} ajouté")
print("\nMigration terminée.")
