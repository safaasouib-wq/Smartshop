"""Initialisation des données de démonstration.

Usage :  python seed.py
Crée : 1 commerce (boutique de luxe), 19 produits, 1 compte commerçant.
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

    # (nom, description, prix, stock, catégorie, photo dans frontend/public/products/)
    produits = [
        # --- Vêtements ---
        ("Manteau long en laine ivoire", "Laine mélangée, col tailleur, coupe oversize", 3900.0, 6, "Vêtements", "manteau-laine-ivoire.jpg"),
        ("Caftan satin bleu canard", "Satin de soie, broderie sfifa ton sur ton", 2800.0, 5, "Vêtements", "caftan-bleu-canard.jpg"),
        ("Caftan satin perle", "Satin ivoire, broderie main et boutons akaad", 2950.0, 4, "Vêtements", "caftan-perle.jpg"),
        ("Caftan satin prune", "Satin prune, plastron brodé et manches évasées", 2800.0, 3, "Vêtements", "caftan-prune.jpg"),
        ("Robe longue satin cacao", "Satin fluide, encolure bateau, manches évasées", 1450.0, 8, "Vêtements", "robe-satin-cacao.jpg"),
        ("Blazer croisé boutons dorés", "Coupe croisée, boutons dorés, doublure satin", 1690.0, 7, "Vêtements", "blazer-croise-ivoire.jpg"),
        ("Blazer oversize chocolat", "Coupe oversize, revers crantés, un bouton", 1590.0, 9, "Vêtements", "blazer-oversize-chocolat.jpg"),
        ("Pull maille bordeaux", "Maille côtelée, manches amples, taille large", 790.0, 12, "Vêtements", "pull-maille-bordeaux.jpg"),
        ("Blouse lavallière satin beige", "Satin beige, col lavallière, manches ballon", 690.0, 11, "Vêtements", "blouse-lavalliere-beige.jpg"),
        ("Blouse lavallière mousseline bordeaux", "Mousseline plissée, col lavallière, poignets boutonnés", 740.0, 9, "Vêtements", "blouse-lavalliere-bordeaux.jpg"),
        # --- Sacs ---
        ("Cabas cuir marron et twilly", "Cuir souple, twilly en soie, anses longues", 1250.0, 10, "Sacs", "cabas-cuir-marron.jpg"),
        ("Cabas bordeaux fermoir doré", "Grand format trapèze, fermoir tourniquet doré", 1480.0, 7, "Sacs", "cabas-bordeaux.jpg"),
        ("Sac à main cuir grainé chocolat", "Cuir grainé, cadenas et clochette dorés", 2200.0, 6, "Sacs", "sac-main-chocolat.jpg"),
        ("Sac trapèze cuir camel", "Cuir grainé camel, armature métal, fermoir clic", 1750.0, 8, "Sacs", "sac-trapeze-camel.jpg"),
        ("Mini sac bordeaux", "Format mini, fermoir tournant doré, nœud en cuir", 1150.0, 9, "Sacs", "mini-sac-bordeaux.jpg"),
        # --- Montres ---
        ("Montre joaillière sertie", "Boîtier et bracelet sertis, cadran pavé, index romains", 12500.0, 2, "Montres", "montre-joailliere-serpent.jpg"),
        ("Coffret montre bicolore et jonc", "Montre ovale bicolore et bracelet jonc nœud, édition limitée", 2400.0, 5, "Montres", "montre-bicolore-jonc.jpg"),
        ("Montre octogonale dorée", "Boîtier octogonal doré, cadran chocolat, jonc assorti", 1950.0, 6, "Montres", "montre-octogonale-doree.jpg"),
        ("Montre ovale dorée", "Boîtier ovale doré, cadran blanc, bracelet maille", 1600.0, 8, "Montres", "montre-ovale-doree.jpg"),
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
