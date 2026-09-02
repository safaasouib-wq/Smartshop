"""Initialisation des données de démonstration.

Usage :  python seed.py
Crée : 1 commerce (pâtisserie), 8 produits, 1 compte commerçant.
Compte dashboard : admin@smartshop.ma / admin123  (à changer !)
"""
from app.auth import hacher_mot_de_passe
from app.database import Base, engine, SessionLocal
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.Commerce).first():
    print("Données déjà présentes — rien à faire.")
else:
    commerce = models.Commerce(
        nom="Pâtisserie Al Baraka",
        description="Pâtisserie marocaine traditionnelle et moderne à Casablanca.",
        adresse="12 Rue Ibn Batouta, Maârif, Casablanca",
        telephone="+212 6 12 34 56 78",
        horaires="Lundi-Samedi : 8h-20h · Dimanche : 8h-13h",
        message_accueil="Marhba bik f Pâtisserie Al Baraka ! 🍰 Comment puis-je vous aider ?",
    )
    db.add(commerce)
    db.flush()

    # (nom, description, prix, stock, catégorie, fichier photo dans frontend/public/products/)
    produits = [
        ("Cornes de gazelle", "Boîte de 12 pièces aux amandes", 85.0, 20, "Traditionnel", "cornes-gazelle.jpg"),
        ("Chebakia", "Boîte de 500g, miel et sésame", 60.0, 30, "Traditionnel", "chebakia.jpg"),
        ("Briouates aux amandes", "Boîte de 10 pièces", 70.0, 15, "Traditionnel", "briouates.jpg"),
        ("Tarte au citron", "Tarte 6 personnes", 120.0, 5, "Moderne", "tarte-citron.jpg"),
        ("Gâteau d'anniversaire", "Génoise personnalisable 8 personnes", 250.0, 3, "Moderne", "gateau-anniversaire.jpg"),
        ("Macarons assortis", "Boîte de 12 macarons", 95.0, 10, "Moderne", "macarons.jpg"),
        ("Msemen", "Paquet de 5 pièces", 15.0, 40, "Petit-déjeuner", "msemen.jpg"),
        ("Baghrir", "Paquet de 6 pièces (mille trous)", 12.0, 40, "Petit-déjeuner", "baghrir.jpg"),
    ]
    for nom, desc, prix, stock, cat, photo in produits:
        db.add(models.Produit(commerce_id=commerce.id, nom=nom, description=desc,
                              prix=prix, stock=stock, categorie=cat,
                              image_url=f"/products/{photo}"))

    db.add(models.Utilisateur(
        email="admin@smartshop.ma",
        mot_de_passe_hache=hacher_mot_de_passe("admin123"),
        role="admin",          # compte administrateur : accès à tous les modules (sinon verrouillé)
        nom="Administrateur",
    ))
    db.commit()
    print("[OK] Données de démo créées.")
    print("   Dashboard : admin@smartshop.ma / admin123")

db.close()
