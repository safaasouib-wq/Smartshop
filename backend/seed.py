"""Initialisation des données de démonstration.

Usage :  python seed.py
Crée : 1 commerce (boutique de luxe), 12 produits, 1 compte commerçant.
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
        nom="Maison Noor",
        description="Prêt-à-porter, maroquinerie et horlogerie de luxe à Casablanca.",
        adresse="45 Boulevard d'Anfa, Casablanca",
        telephone="+212 6 12 34 56 78",
        horaires="Lundi-Samedi : 10h-20h · Dimanche : 11h-18h",
        message_accueil="Marhba bik f Maison Noor ✦ Vêtements, sacs et montres de luxe. Comment puis-je vous aider ?",
        livraison="Livraison offerte à Casablanca en 24 h, 48 h dans le reste du Maroc. Paiement à la livraison possible.",
        retours="Échange ou retour sous 14 jours, article non porté et étiquette d'origine conservée.",
        paiement="Espèces, carte bancaire en boutique, virement. Paiement à la livraison accepté.",
    )
    db.add(commerce)
    db.flush()

    # (nom, description, prix, stock, catégorie, fichier visuel dans frontend/public/products/)
    produits = [
        ("Trench en cachemire", "Laine et cachemire, coupe droite, ceinture", 4200.0, 6, "Vêtements", "trench-cachemire.svg"),
        ("Blazer croisé en laine", "Laine vierge, doublure en soie", 3600.0, 8, "Vêtements", "blazer-laine.svg"),
        ("Robe de soirée en soie", "Soie sauvage, finitions à la main", 2900.0, 9, "Vêtements", "robe-soie.svg"),
        ("Caftan brodé main", "Brocart et broderie sfifa, pièce unique", 5400.0, 3, "Vêtements", "caftan-brode.svg"),
        ("Sac à main cuir grainé", "Cuir de veau grainé, fermoir doré", 3200.0, 10, "Sacs", "sac-main-cuir.svg"),
        ("Cabas en cuir camel", "Grand format, cuir pleine fleur", 2400.0, 12, "Sacs", "cabas-camel.svg"),
        ("Pochette de soirée satin", "Satin de soie, chaîne amovible", 1500.0, 7, "Sacs", "pochette-satin.svg"),
        ("Sac à dos cuir nappa", "Cuir nappa souple, doublure suédine", 2800.0, 9, "Sacs", "sac-dos-nappa.svg"),
        ("Montre automatique acier", "Mouvement automatique, bracelet acier", 8900.0, 8, "Montres", "montre-acier.svg"),
        ("Chronographe or rose", "Chronographe, boîtier plaqué or rose", 12500.0, 2, "Montres", "chronographe-or.svg"),
        ("Montre squelette cuir", "Cadran squelette, bracelet cuir noir", 6700.0, 7, "Montres", "montre-squelette.svg"),
        ("Montre femme nacre", "Cadran nacre, index sertis", 5900.0, 10, "Montres", "montre-nacre.svg"),
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
