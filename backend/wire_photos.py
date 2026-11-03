"""Copie les photos fournies (Téléchargements) vers frontend/public/products/
et pointe image_url de chaque produit dessus. Usage : python wire_photos.py

Nommez chaque photo avec le mot-clé du produit (ex. « trench.jpg », « sac-main-2.jpg ») :
le script cherche la première image dont le nom de fichier contient ce mot-clé.
Par défaut, le catalogue utilise les visuels SVG livrés dans public/products/.
"""
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
    ("trench", "Trench en cachemire", "trench-cachemire.jpg"),
    ("blazer", "Blazer croisé en laine", "blazer-laine.jpg"),
    ("robe", "Robe de soirée en soie", "robe-soie.jpg"),
    ("caftan", "Caftan brodé main", "caftan-brode.jpg"),
    ("sac-main", "Sac à main cuir grainé", "sac-main-cuir.jpg"),
    ("cabas", "Cabas en cuir camel", "cabas-camel.jpg"),
    ("pochette", "Pochette de soirée satin", "pochette-satin.jpg"),
    ("sac-dos", "Sac à dos cuir nappa", "sac-dos-nappa.jpg"),
    ("montre-acier", "Montre automatique acier", "montre-acier.jpg"),
    ("chrono", "Chronographe or rose", "chronographe-or.jpg"),
    ("squelette", "Montre squelette cuir", "montre-squelette.jpg"),
    ("nacre", "Montre femme nacre", "montre-nacre.jpg"),
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
        print(f"OK  {prod:26} <= {os.path.basename(m)[:34]}")
    else:
        print(f"!! produit absent en base: {prod}")
db.commit()
db.close()
print("\n-> image_url mis a jour, photos copiees dans public/products/")
