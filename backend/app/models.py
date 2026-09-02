"""Modèles de données — implémentation du MCD défini dans le cahier des charges (section 9)."""
import enum
from datetime import date

from sqlalchemy import (Column, Integer, String, Float, Boolean, Text,
                        DateTime, Date, ForeignKey, Enum)
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import utcnow


class StatutConversation(str, enum.Enum):
    ACTIVE = "active"
    ESCALADEE = "escaladee"
    FERMEE = "fermee"


class GerePar(str, enum.Enum):
    IA = "ia"
    HUMAIN = "humain"


class Emetteur(str, enum.Enum):
    CLIENT = "client"
    IA = "ia"
    COMMERCANT = "commercant"


class StatutCommande(str, enum.Enum):
    NOUVELLE = "nouvelle"
    EN_PREPARATION = "en_preparation"
    PRETE = "prete"
    RECUPEREE = "recuperee"
    ANNULEE = "annulee"


class StatutEscalade(str, enum.Enum):
    EN_ATTENTE = "en_attente"
    TRAITEE = "traitee"


class Commerce(Base):
    __tablename__ = "commerces"
    id = Column(Integer, primary_key=True)
    nom = Column(String(120), nullable=False)
    description = Column(Text, default="")
    adresse = Column(String(255), default="")
    telephone = Column(String(30), default="")
    horaires = Column(Text, default="")           # ex: "Lun-Sam 9h-20h, Dim fermé"
    message_accueil = Column(Text, default="")
    # FAQ : réponses aux questions fréquentes (exposées à l'IA via consulter_faq)
    livraison = Column(Text, default="")           # conditions/délais/frais de livraison
    retours = Column(Text, default="")             # politique de retour et d'échange
    paiement = Column(Text, default="")            # moyens de paiement acceptés
    lat = Column(Float, nullable=True)             # position de la boutique (point de départ livreur)
    lng = Column(Float, nullable=True)

    produits = relationship("Produit", back_populates="commerce")


class Produit(Base):
    __tablename__ = "produits"
    id = Column(Integer, primary_key=True)
    commerce_id = Column(Integer, ForeignKey("commerces.id"), nullable=False)
    nom = Column(String(150), nullable=False, index=True)
    description = Column(Text, default="")
    prix = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    categorie = Column(String(80), default="", index=True)
    actif = Column(Boolean, default=True)
    image_url = Column(String(500), default="")
    seuil_stock = Column(Integer, default=5)   # alerte « à réapprovisionner » si stock <= seuil

    commerce = relationship("Commerce", back_populates="produits")


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True)
    identifiant_canal = Column(String(120), nullable=False, index=True)  # chat_id Telegram, wa_id WhatsApp
    canal = Column(String(30), nullable=False)                           # "telegram" | "whatsapp" | "web"
    nom = Column(String(120), default="")
    telephone = Column(String(30), default="")
    date_premier_contact = Column(DateTime, default=utcnow)
    # Compte web (optionnel) : permet au client de se connecter et retrouver ses commandes
    email = Column(String(150), index=True)
    mot_de_passe_hache = Column(String(200))
    adresse = Column(Text, default="")            # adresse de livraison par défaut
    notes = Column(Text, default="")              # notes internes commerçant (consultables par l'IA)

    conversations = relationship("Conversation", back_populates="client")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    statut = Column(Enum(StatutConversation), default=StatutConversation.ACTIVE)
    gere_par = Column(Enum(GerePar), default=GerePar.IA)
    date_creation = Column(DateTime, default=utcnow)

    client = relationship("Client", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.horodatage")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    emetteur = Column(Enum(Emetteur), nullable=False)
    contenu = Column(Text, nullable=False)
    horodatage = Column(DateTime, default=utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Commande(Base):
    __tablename__ = "commandes"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    statut = Column(Enum(StatutCommande), default=StatutCommande.NOUVELLE)
    total = Column(Float, default=0.0)
    date_creation = Column(DateTime, default=utcnow)
    date_maj = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Mode de retrait / livraison
    mode = Column(String(20), default="retrait")          # "retrait" | "livraison"
    adresse_livraison = Column(Text, default="")
    telephone_client = Column(String(30), default="")
    lat_client = Column(Float, nullable=True)
    lng_client = Column(Float, nullable=True)
    # Suivi du livreur (livraison uniquement)
    suivi_livraison = Column(String(20), default="")      # "" | en_route | proche | livree
    lat_livreur = Column(Float, nullable=True)
    lng_livreur = Column(Float, nullable=True)

    lignes = relationship("LigneCommande", back_populates="commande")
    client = relationship("Client")


class LigneCommande(Base):
    __tablename__ = "lignes_commande"
    id = Column(Integer, primary_key=True)
    commande_id = Column(Integer, ForeignKey("commandes.id"), nullable=False)
    produit_id = Column(Integer, ForeignKey("produits.id"), nullable=False)
    quantite = Column(Integer, nullable=False)
    prix_unitaire = Column(Float, nullable=False)

    commande = relationship("Commande", back_populates="lignes")
    produit = relationship("Produit")


class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id = Column(Integer, primary_key=True)
    email = Column(String(150), unique=True, nullable=False)
    mot_de_passe_hache = Column(String(200), nullable=False)
    role = Column(String(30), default="vendeur")        # "admin" (tous droits) | "vendeur" (droits accordés)
    permissions = Column(Text, default="")              # clés séparées par des virgules (ignoré si admin)
    nom = Column(String(120), default="")


class Escalade(Base):
    __tablename__ = "escalades"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    raison = Column(Text, default="")
    statut = Column(Enum(StatutEscalade), default=StatutEscalade.EN_ATTENTE)
    date = Column(DateTime, default=utcnow)

    conversation = relationship("Conversation")


# ------------------------------------------------------------------ Administration : personnel (RH)

class Employe(Base):
    __tablename__ = "employes"
    id = Column(Integer, primary_key=True)
    nom = Column(String(120), nullable=False)
    cin = Column(String(30), default="")               # Carte d'identité nationale
    fonction = Column(String(120), default="")
    telephone = Column(String(30), default="")
    email = Column(String(150), default="")
    horaire_travail = Column(Text, default="")         # ex: "Lun-Ven 9h-17h, Sam 9h-13h"
    date_embauche = Column(Date, default=date.today)
    droit_conge_annuel = Column(Integer, default=18)   # jours de congé par an
    actif = Column(Boolean, default=True)

    conges = relationship("Conge", back_populates="employe", cascade="all, delete-orphan")
    absences = relationship("Absence", back_populates="employe", cascade="all, delete-orphan")


class Conge(Base):
    __tablename__ = "conges"
    id = Column(Integer, primary_key=True)
    employe_id = Column(Integer, ForeignKey("employes.id"), nullable=False)
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    nb_jours = Column(Integer, nullable=False)
    motif = Column(Text, default="")
    date_creation = Column(DateTime, default=utcnow)

    employe = relationship("Employe", back_populates="conges")


class Absence(Base):
    __tablename__ = "absences"
    id = Column(Integer, primary_key=True)
    employe_id = Column(Integer, ForeignKey("employes.id"), nullable=False)
    date = Column(Date, nullable=False)
    justifiee = Column(Boolean, default=False)         # justifiée = 0 jour retiré ; non justifiée = -1
    motif = Column(Text, default="")

    employe = relationship("Employe", back_populates="absences")


class RechercheProduit(Base):
    """Journal des recherches produit de l'IA (outil chercher_produit) — analytics de la demande."""
    __tablename__ = "recherches_produit"
    id = Column(Integer, primary_key=True)
    terme = Column(String(150), index=True)
    trouve = Column(Boolean, default=False)            # False = demande non satisfaite (produit non vendu)
    date = Column(DateTime, default=utcnow)
