"""Copie les photos fournies (Téléchargements) vers frontend/public/products/
et pointe image_url de chaque produit dessus. Usage : python wire_photos.py

Nommez chaque photo avec le mot-clé du produit (ex. « trench.jpg », « sac-main-2.jpg ») :
le script cherche la première image dont le nom de fichier contient ce mot-clé.
Par défaut, le catalogue utilise les photos déjà livrées dans public/products/.
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
    ("manteau", "Manteau long en laine ivoire", "manteau-laine-ivoire.jpg"),
    ("caftan-bleu", "Caftan satin bleu canard", "caftan-bleu-canard.jpg"),
    ("caftan-perle", "Caftan satin perle", "caftan-perle.jpg"),
    ("caftan-prune", "Caftan satin prune", "caftan-prune.jpg"),
    ("robe", "Robe longue satin cacao", "robe-satin-cacao.jpg"),
    ("blazer-croise", "Blazer croisé boutons dorés", "blazer-croise-ivoire.jpg"),
    ("blazer-oversize", "Blazer oversize chocolat", "blazer-oversize-chocolat.jpg"),
    ("pull", "Pull maille bordeaux", "pull-maille-bordeaux.jpg"),
    ("blouse-beige", "Blouse lavallière satin beige", "blouse-lavalliere-beige.jpg"),
    ("blouse-bordeaux", "Blouse lavallière mousseline bordeaux", "blouse-lavalliere-bordeaux.jpg"),
    ("cabas-marron", "Cabas cuir marron et twilly", "cabas-cuir-marron.jpg"),
    ("cabas-bordeaux", "Cabas bordeaux fermoir doré", "cabas-bordeaux.jpg"),
    ("sac-main", "Sac à main cuir grainé chocolat", "sac-main-chocolat.jpg"),
    ("trapeze", "Sac trapèze cuir camel", "sac-trapeze-camel.jpg"),
    ("mini-sac", "Mini sac bordeaux", "mini-sac-bordeaux.jpg"),
    ("joailliere", "Montre joaillière sertie", "montre-joailliere-serpent.jpg"),
    ("bicolore", "Coffret montre bicolore et jonc", "montre-bicolore-jonc.jpg"),
    ("octogonale", "Montre octogonale dorée", "montre-octogonale-doree.jpg"),
    ("ovale", "Montre ovale dorée", "montre-ovale-doree.jpg"),
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
