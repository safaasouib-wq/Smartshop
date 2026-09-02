"""Copie les photos fournies (Téléchargements) vers frontend/public/products/
et pointe image_url de chaque produit dessus. Usage : python wire_photos.py"""
import glob
import os
import shutil

from app.database import SessionLocal
from app import models

DL = r"C:\Users\Administrateur\Downloads"
DEST = r"D:\Projets\smartshop\frontend\public\products"
os.makedirs(DEST, exist_ok=True)

# (sous-chaîne unique du nom de fichier, nom produit exact, nom fichier destination)
MAP = [
    ("would you eat", "Macarons assortis", "macarons.jpg"),
    ("торт", "Gâteau d'anniversaire", "gateau-anniversaire.jpg"),
    ("tarte au citron", "Tarte au citron", "tarte-citron.jpg"),
    ("orientale", "Briouates aux amandes", "briouates.jpg"),
    ("chebakia", "Chebakia", "chebakia.jpg"),
    ("msemen", "Msemen", "msemen.jpg"),
    ("cornes de gazelle", "Cornes de gazelle", "cornes-gazelle.jpg"),
    ("10 p", "Baghrir", "baghrir.jpg"),
]

files = glob.glob(os.path.join(DL, "*.jpg"))
db = SessionLocal()
for sub, prod, dest in MAP:
    m = next((f for f in files if sub.lower() in os.path.basename(f).lower()), None)
    if not m:
        print(f"!! source introuvable pour {prod} (substr '{sub}')")
        continue
    shutil.copy(m, os.path.join(DEST, dest))
    p = db.query(models.Produit).filter_by(nom=prod).first()
    if p:
        p.image_url = f"/products/{dest}"
        print(f"OK  {prod:24} <= {os.path.basename(m)[:34]}")
    else:
        print(f"!! produit absent en base: {prod}")
db.commit()
db.close()
print("\n-> image_url mis a jour, photos copiees dans public/products/")
