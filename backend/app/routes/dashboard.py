"""API REST du dashboard commerçant (module 5 du cahier des charges).

Tous les endpoints (hors login) sont protégés par JWT (F5.1).
La documentation interactive est disponible sur /docs (Swagger, NF10).
"""
import json
from collections import Counter
from datetime import datetime, time as dtime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.adapters.telegram import telegram_channel
from app.auth import (creer_token, est_admin, exiger, utilisateur_courant, verifier_mot_de_passe)
from app.database import get_db
from app.services import services
from app.utils import utcnow

router = APIRouter(prefix="/api", tags=["dashboard"])


# ------------------------------------------------------------------ Authentification

@router.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter_by(email=form.username).first()
    if not user or not verifier_mot_de_passe(form.password, user.mot_de_passe_hache):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"access_token": creer_token(user.email), "token_type": "bearer"}


@router.get("/auth/moi")
def moi(user: models.Utilisateur = Depends(utilisateur_courant)):
    """Profil de l'utilisateur connecté : rôle + permissions (pour filtrer l'UI)."""
    return {
        "email": user.email, "nom": user.nom or "", "role": user.role or "vendeur",
        "est_admin": est_admin(user),
        "permissions": [p for p in (user.permissions or "").split(",") if p],
    }


# ------------------------------------------------------------------ Vitrine publique (client)

@router.get("/vitrine")
def vitrine(db: Session = Depends(get_db)):
    """Endpoint PUBLIC (sans authentification) : alimente la vitrine web côté client.
    Retourne les infos du commerce et le catalogue des produits actifs (vrais prix/stock)."""
    commerce = services.infos_commerce(db)
    produits = services.lister_produits(db)  # produits actifs, triés par catégorie puis nom
    # Best-sellers : top 2 produits par quantité réellement vendue (0 si aucune commande).
    ventes = dict(
        db.query(models.LigneCommande.produit_id, func.sum(models.LigneCommande.quantite))
          .group_by(models.LigneCommande.produit_id).all()
    )
    top_ids = {pid for pid, _ in sorted(ventes.items(), key=lambda kv: kv[1] or 0, reverse=True)[:2]
               if (ventes.get(pid) or 0) > 0}
    return {
        "commerce": {
            "nom": commerce.nom if commerce else "",
            "description": commerce.description if commerce else "",
            "adresse": commerce.adresse if commerce else "",
            "telephone": commerce.telephone if commerce else "",
            "horaires": commerce.horaires if commerce else "",
            "message_accueil": commerce.message_accueil if commerce else "",
        },
        "produits": [
            {"id": p.id, "nom": p.nom, "description": p.description, "prix": p.prix,
             "stock": p.stock, "categorie": p.categorie, "image_url": p.image_url,
             "best_seller": p.id in top_ids}
            for p in produits
        ],
    }


# ------------------------------------------------------------------ Résumé IA de la journée

@router.get("/resume-jour")
def resume_jour(db: Session = Depends(get_db), _=Depends(exiger("stats"))):
    """Synthèse IA de l'activité du jour pour le commerçant : chiffres RÉELS agrégés depuis la
    base, puis résumé en langage naturel généré par le LLM. Repli gracieux si le LLM échoue
    (on renvoie quand même les faits bruts pour l'affichage)."""
    debut = datetime.combine(utcnow().date(), dtime.min)
    cmds = (db.query(models.Commande)
            .filter(models.Commande.date_creation >= debut).all())
    ca = round(sum(c.total for c in cmds), 2)
    nb = len(cmds)
    compte = Counter()
    for c in cmds:
        for l in c.lignes:
            compte[l.produit.nom] += l.quantite
    en_cours = sum(1 for c in cmds
                   if c.statut not in (models.StatutCommande.RECUPEREE, models.StatutCommande.ANNULEE)
                   and c.suivi_livraison != "livree")
    escalades = (db.query(models.Escalade)
                 .filter_by(statut=models.StatutEscalade.EN_ATTENTE).count())
    alertes = (db.query(models.Produit)
               .filter(models.Produit.actif.is_(True),
                       models.Produit.stock <= models.Produit.seuil_stock).count())
    faits = {
        "commandes": nb,
        "chiffre_affaires_dh": ca,
        "panier_moyen_dh": round(ca / nb, 1) if nb else 0,
        "top_produits": [{"nom": n, "quantite": q} for n, q in compte.most_common(3)],
        "commandes_en_cours": en_cours,
        "clients_a_rappeler": escalades,        # conversations escaladées en attente
        "alertes_stock": alertes,               # produits sous le seuil
    }

    resume = None
    try:
        from app.ai.engine import client_llm, nettoyer_markdown
        from app.config import settings
        sys = ("Tu es l'assistant du commerçant d'une pâtisserie. À partir des chiffres du jour, "
               "rédige un résumé COURT (2 à 3 phrases), chaleureux et actionnable, en français. "
               "Mets en avant ce qui compte (ventes, produit vedette, ce qu'il reste à faire). "
               "Texte simple, sans markdown, sans tableau.")
        usr = "Données du jour : " + json.dumps(faits, ensure_ascii=False)
        r = client_llm.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "system", "content": sys}, {"role": "user", "content": usr}],
            temperature=0.4, max_tokens=200,
        )
        resume = nettoyer_markdown(r.choices[0].message.content or "") or None
    except Exception:
        resume = None   # le front affiche alors les faits bruts

    return {"resume": resume, "faits": faits}


# ------------------------------------------------------------------ Produits (F5.2)

class ProduitIn(BaseModel):
    nom: str
    description: str = ""
    prix: float
    stock: int = 0
    categorie: str = ""
    actif: bool = True
    image_url: str = ""
    seuil_stock: int = 5


@router.get("/produits")
def lister_produits(db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    return db.query(models.Produit).order_by(models.Produit.nom).all()


@router.post("/produits", status_code=201)
def creer_produit(p: ProduitIn, db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    commerce = services.infos_commerce(db)
    produit = models.Produit(commerce_id=commerce.id, **p.model_dump())
    db.add(produit)
    db.commit()
    db.refresh(produit)
    return produit


@router.put("/produits/{produit_id}")
def modifier_produit(produit_id: int, p: ProduitIn,
                     db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    produit = db.get(models.Produit, produit_id)
    if not produit:
        raise HTTPException(404, "Produit introuvable")
    for champ, valeur in p.model_dump().items():
        setattr(produit, champ, valeur)
    db.commit()
    db.refresh(produit)   # recharge les attributs expirés → réponse complète (sinon {} )
    return produit


@router.delete("/produits/{produit_id}", status_code=204)
def supprimer_produit(produit_id: int, db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    produit = db.get(models.Produit, produit_id)
    if produit:
        produit.actif = False  # suppression logique : on préserve l'historique des commandes
        db.commit()


# ------------------------------------------------------------------ Commerce (F5.3)

class CommerceIn(BaseModel):
    nom: str
    description: str = ""
    adresse: str = ""
    telephone: str = ""
    horaires: str = ""
    message_accueil: str = ""


@router.get("/commerce")
def voir_commerce(db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    return services.infos_commerce(db)


@router.put("/commerce")
def modifier_commerce(c: CommerceIn, db: Session = Depends(get_db), _=Depends(exiger("produits"))):
    commerce = services.infos_commerce(db)
    for champ, valeur in c.model_dump().items():
        setattr(commerce, champ, valeur)
    db.commit()
    db.refresh(commerce)   # recharge les attributs expirés → réponse complète (sinon {} )
    return commerce


# ------------------------------------------------------------------ Commandes (F5.4)

@router.get("/commandes")
def lister_commandes(db: Session = Depends(get_db), _=Depends(exiger("commandes"))):
    commandes = (db.query(models.Commande)
                 .order_by(models.Commande.date_creation.desc()).limit(200).all())
    return [{
        "id": c.id, "statut": c.statut, "total": c.total,
        "date_creation": c.date_creation, "client": c.client.nom,
        "mode": c.mode, "suivi_livraison": c.suivi_livraison,
        "adresse_livraison": c.adresse_livraison,
        "lignes": [{"produit": l.produit.nom, "quantite": l.quantite,
                    "prix_unitaire": l.prix_unitaire} for l in c.lignes],
    } for c in commandes]


@router.put("/commandes/{commande_id}/statut")
def changer_statut(commande_id: int, statut: models.StatutCommande,
                   db: Session = Depends(get_db), _=Depends(exiger("commandes"))):
    commande = db.get(models.Commande, commande_id)
    if not commande:
        raise HTTPException(404, "Commande introuvable")
    commande.statut = statut
    db.commit()
    # Notification automatique du client au changement de statut, via son canal d'origine.
    from app import livraison
    prete = ("🍰 Votre commande n°{id} est prête ! " +
             ("Le livreur va bientôt partir. 🛵" if commande.mode == "livraison"
              else "Vous pouvez venir la récupérer — pas de file d'attente 😉."))
    messages = {
        models.StatutCommande.EN_PREPARATION: "👩‍🍳 Votre commande n°{id} est en cours de préparation.",
        models.StatutCommande.PRETE: prete,
        models.StatutCommande.RECUPEREE: ("✅ Merci ! Votre commande n°{id} est "
                                          + ("livrée" if commande.mode == "livraison" else "récupérée") + ". À bientôt ! 🙏"),
        models.StatutCommande.ANNULEE: "❌ Votre commande n°{id} a été annulée. Contactez-nous pour toute question.",
    }
    if statut in messages:
        livraison.notifier_client(db, commande, messages[statut].format(id=commande.id))
    return {"id": commande.id, "statut": commande.statut}


# ------------------------------------------------------------------ Conversations & escalades (F5.5, F5.6)

@router.get("/conversations")
def lister_conversations(db: Session = Depends(get_db), _=Depends(exiger("conversations"))):
    convs = (db.query(models.Conversation)
             .order_by(models.Conversation.date_creation.desc()).limit(100).all())
    return [{
        "id": c.id, "client": c.client.nom, "canal": c.client.canal,
        "statut": c.statut, "gere_par": c.gere_par,
        "nb_messages": len(c.messages), "date_creation": c.date_creation,
    } for c in convs]


@router.get("/conversations/{conv_id}/messages")
def messages_conversation(conv_id: int, db: Session = Depends(get_db), _=Depends(exiger("conversations"))):
    return (db.query(models.Message).filter_by(conversation_id=conv_id)
            .order_by(models.Message.horodatage).all())


class ReponseCommercant(BaseModel):
    texte: str


@router.post("/conversations/{conv_id}/repondre")
async def repondre_client(conv_id: int, r: ReponseCommercant,
                          db: Session = Depends(get_db), _=Depends(exiger("conversations"))):
    """Le commerçant répond directement au client depuis le dashboard (F4.4)."""
    conv = db.get(models.Conversation, conv_id)
    if not conv:
        raise HTTPException(404, "Conversation introuvable")
    services.enregistrer_message(db, conv.id, models.Emetteur.COMMERCANT, r.texte)
    await telegram_channel.send_message(conv.client.identifiant_canal, r.texte)
    return {"ok": True}


@router.post("/conversations/{conv_id}/rendre-ia")
def rendre_ia(conv_id: int, db: Session = Depends(get_db), _=Depends(exiger("conversations"))):
    """Rendre la main à l'IA (F4.5)."""
    conv = db.get(models.Conversation, conv_id)
    if not conv:
        raise HTTPException(404, "Conversation introuvable")
    services.rendre_a_lia(db, conv)
    return {"ok": True}


@router.get("/escalades")
def lister_escalades(db: Session = Depends(get_db), _=Depends(exiger("conversations"))):
    escalades = (db.query(models.Escalade)
                 .filter_by(statut=models.StatutEscalade.EN_ATTENTE)
                 .order_by(models.Escalade.date.desc()).all())
    return [{"id": e.id, "conversation_id": e.conversation_id,
             "raison": e.raison, "date": e.date,
             "client": e.conversation.client.nom} for e in escalades]


# ------------------------------------------------------------------ Statistiques (F5.7)

@router.get("/stats")
def statistiques(db: Session = Depends(get_db), _=Depends(exiger("stats"))):
    il_y_a_7j = utcnow() - timedelta(days=7)
    nb_conversations = db.query(models.Conversation).count()
    nb_commandes = db.query(models.Commande).count()
    nb_escalades = db.query(models.Escalade).count()
    ca = db.query(func.coalesce(func.sum(models.Commande.total), 0)).filter(
        models.Commande.statut != models.StatutCommande.ANNULEE).scalar()
    commandes_7j = (db.query(models.Commande)
                    .filter(models.Commande.date_creation >= il_y_a_7j).count())
    return {
        "conversations_total": nb_conversations,
        "commandes_total": nb_commandes,
        "commandes_7_jours": commandes_7j,
        "chiffre_affaires_dh": round(ca, 2),
        "taux_escalade": round(nb_escalades / nb_conversations * 100, 1) if nb_conversations else 0,
    }
