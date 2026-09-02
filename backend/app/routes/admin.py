"""Module Administration du dashboard — accès commerçant (JWT).

Sous-module 1 : Gestion du personnel (RH) — employés, congés, absences, PDF, planning.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, pdf
from app.auth import (PERMISSIONS, a_permission, est_admin, hacher_mot_de_passe,
                      utilisateur_courant)
from app.database import get_db
from app.services import services
from app.utils import utcnow


def _permission_du_chemin(path: str) -> str:
    """Déduit la permission requise à partir de l'URL de l'endpoint admin."""
    if any(s in path for s in ("/employes", "/conges", "/absences", "/planning")):
        return "personnel"
    if "/clients" in path:
        return "clients"
    if "/produits" in path or "/recherches" in path:
        return "produits"
    if "/commandes" in path:
        return "commandes"
    if "/rapports" in path:
        return "rapports"
    return "__admin__"  # utilisateurs, permissions… → réservé à l'admin


def garde_admin(request: Request, user: models.Utilisateur = Depends(utilisateur_courant)) -> models.Utilisateur:
    perm = _permission_du_chemin(request.url.path)
    if est_admin(user):
        return user
    if perm == "__admin__" or not a_permission(user, perm):
        raise HTTPException(403, "Accès non autorisé à ce module")
    return user


router = APIRouter(prefix="/api/admin", tags=["admin"],
                   dependencies=[Depends(garde_admin)])


# ================================================================== Personnel (RH)

class EmployeIn(BaseModel):
    nom: str
    cin: str = ""
    fonction: str = ""
    telephone: str = ""
    email: str = ""
    horaire_travail: str = ""
    date_embauche: date | None = None
    droit_conge_annuel: int = 18
    actif: bool = True


def _solde(e: models.Employe) -> dict:
    annee = date.today().year
    jours_conges = sum(c.nb_jours for c in e.conges if c.date_debut and c.date_debut.year == annee)
    abs_non_justifiees = sum(1 for a in e.absences if not a.justifiee and a.date and a.date.year == annee)
    consomme = jours_conges + abs_non_justifiees
    return {"droit": e.droit_conge_annuel, "consomme": consomme,
            "solde": e.droit_conge_annuel - consomme,
            "negatif": (e.droit_conge_annuel - consomme) < 0}


def _employe_resume(e: models.Employe) -> dict:
    return {"id": e.id, "nom": e.nom, "fonction": e.fonction, "cin": e.cin,
            "telephone": e.telephone, "email": e.email, "actif": e.actif,
            "horaire_travail": e.horaire_travail,
            "date_embauche": e.date_embauche, **_solde(e)}


@router.get("/employes")
def lister_employes(db: Session = Depends(get_db)):
    emps = db.query(models.Employe).order_by(models.Employe.nom).all()
    return [_employe_resume(e) for e in emps]


@router.post("/employes", status_code=201)
def creer_employe(data: EmployeIn, db: Session = Depends(get_db)):
    e = models.Employe(**data.model_dump())
    if e.date_embauche is None:
        e.date_embauche = date.today()
    db.add(e); db.commit(); db.refresh(e)
    return _employe_resume(e)


@router.get("/employes/{eid}")
def detail_employe(eid: int, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if not e:
        raise HTTPException(404, "Employé introuvable")
    return {
        **_employe_resume(e),
        "conges": [{"id": c.id, "date_debut": c.date_debut, "date_fin": c.date_fin,
                    "nb_jours": c.nb_jours, "motif": c.motif}
                   for c in sorted(e.conges, key=lambda c: c.date_debut or date.min, reverse=True)],
        "absences": [{"id": a.id, "date": a.date, "justifiee": a.justifiee, "motif": a.motif}
                     for a in sorted(e.absences, key=lambda a: a.date or date.min, reverse=True)],
    }


@router.put("/employes/{eid}")
def modifier_employe(eid: int, data: EmployeIn, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if not e:
        raise HTTPException(404, "Employé introuvable")
    for k, v in data.model_dump().items():
        if k == "date_embauche" and v is None:
            continue
        setattr(e, k, v)
    db.commit(); db.refresh(e)
    return _employe_resume(e)


@router.delete("/employes/{eid}", status_code=204)
def supprimer_employe(eid: int, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if e:
        db.delete(e); db.commit()


# ------------------------------------------------------------------ Congés

class CongeIn(BaseModel):
    date_debut: date
    date_fin: date
    motif: str = ""


@router.post("/employes/{eid}/conges", status_code=201)
def ajouter_conge(eid: int, data: CongeIn, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if not e:
        raise HTTPException(404, "Employé introuvable")
    if data.date_fin < data.date_debut:
        raise HTTPException(400, "Date de fin avant la date de début")
    nb = (data.date_fin - data.date_debut).days + 1
    c = models.Conge(employe_id=eid, date_debut=data.date_debut, date_fin=data.date_fin,
                     nb_jours=nb, motif=data.motif)
    db.add(c); db.commit()
    return {"ok": True, "nb_jours": nb}


@router.delete("/conges/{cid}", status_code=204)
def supprimer_conge(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.Conge, cid)
    if c:
        db.delete(c); db.commit()


# ------------------------------------------------------------------ Absences (règle métier)

class AbsenceIn(BaseModel):
    date: date
    justifiee: bool = False
    motif: str = ""


@router.post("/employes/{eid}/absences", status_code=201)
def ajouter_absence(eid: int, data: AbsenceIn, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if not e:
        raise HTTPException(404, "Employé introuvable")
    a = models.Absence(employe_id=eid, date=data.date, justifiee=data.justifiee, motif=data.motif)
    db.add(a); db.commit()
    # règle : justifiée = 0 jour retiré ; non justifiée = -1 jour du solde
    return {"ok": True, "jours_retires": 0 if data.justifiee else 1}


@router.delete("/absences/{aid}", status_code=204)
def supprimer_absence(aid: int, db: Session = Depends(get_db)):
    a = db.get(models.Absence, aid)
    if a:
        db.delete(a); db.commit()


# ------------------------------------------------------------------ Planning hebdomadaire

@router.get("/planning")
def planning(db: Session = Depends(get_db)):
    emps = db.query(models.Employe).filter_by(actif=True).order_by(models.Employe.nom).all()
    return [{"id": e.id, "nom": e.nom, "fonction": e.fonction, "horaire_travail": e.horaire_travail}
            for e in emps]


# ------------------------------------------------------------------ PDF

def _pdf_response(contenu: bytes, nom_fichier: str) -> Response:
    return Response(content=contenu, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{nom_fichier}"'})


@router.get("/employes/{eid}/attestation.pdf")
def attestation(eid: int, db: Session = Depends(get_db)):
    e = db.get(models.Employe, eid)
    if not e:
        raise HTTPException(404, "Employé introuvable")
    commerce = services.infos_commerce(db)
    return _pdf_response(pdf.attestation_travail(e, commerce), f"attestation_{e.nom}.pdf")


@router.get("/conges/{cid}/ordre.pdf")
def ordre_conge_pdf(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.Conge, cid)
    if not c:
        raise HTTPException(404, "Congé introuvable")
    commerce = services.infos_commerce(db)
    return _pdf_response(pdf.ordre_conge(c, c.employe, commerce), f"ordre_conge_{c.employe.nom}.pdf")


# ================================================================== Base de données clients (module 2)

def _metriques_client(c: models.Client) -> dict:
    valides = [cmd for cmd in c.commandes_liste if cmd.statut != models.StatutCommande.ANNULEE]
    nb = len(valides)
    total = round(sum(cmd.total for cmd in valides), 2)
    derniere = max((cmd.date_creation for cmd in valides), default=None)
    return {"nb_commandes": nb, "total_depense": total,
            "panier_moyen": round(total / nb, 2) if nb else 0,
            "derniere_commande": derniere}


def _segments(c: models.Client, m: dict, seuil_vip: float) -> list[str]:
    segs = []
    if m["total_depense"] > 0 and m["total_depense"] >= seuil_vip:
        segs.append("VIP")
    if m["nb_commandes"] >= 3:
        segs.append("Fidèle")
    inactif = (m["derniere_commande"] is not None
               and m["derniere_commande"] < utcnow() - timedelta(days=30))
    if inactif:
        segs.append("Inactif")
    if m["nb_commandes"] <= 1 and not inactif and "VIP" not in segs and "Fidèle" not in segs:
        segs.append("Nouveau")
    return segs or ["Client"]


@router.get("/clients")
def lister_clients(db: Session = Depends(get_db)):
    clients = db.query(models.Client).all()
    # attache la liste des commandes (relation ad hoc via requête) puis calcule les métriques
    for c in clients:
        c.commandes_liste = db.query(models.Commande).filter_by(client_id=c.id).all()
    metriques = {c.id: _metriques_client(c) for c in clients}
    totaux = sorted((m["total_depense"] for m in metriques.values() if m["total_depense"] > 0), reverse=True)
    # seuil VIP = top 10% du chiffre d'affaires
    seuil_vip = totaux[max(0, int(len(totaux) * 0.1) - 1)] if totaux else float("inf")
    resultat = []
    for c in clients:
        m = metriques[c.id]
        resultat.append({
            "id": c.id, "nom": c.nom or "—", "canal": c.canal,
            "email": c.email, "telephone": c.telephone,
            "segments": _segments(c, m, seuil_vip), **m,
        })
    resultat.sort(key=lambda x: x["total_depense"], reverse=True)
    return resultat


class NoteIn(BaseModel):
    notes: str


@router.get("/clients/{cid}")
def detail_client(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.Client, cid)
    if not c:
        raise HTTPException(404, "Client introuvable")
    c.commandes_liste = db.query(models.Commande).filter_by(client_id=c.id).order_by(models.Commande.date_creation.desc()).all()
    m = _metriques_client(c)
    return {
        "id": c.id, "nom": c.nom or "—", "canal": c.canal, "email": c.email,
        "telephone": c.telephone, "adresse": c.adresse, "notes": c.notes or "",
        "date_premier_contact": c.date_premier_contact, **m,
        "commandes": [{"id": cmd.id, "date": cmd.date_creation, "mode": cmd.mode,
                       "total": cmd.total, "statut": cmd.statut.value if cmd.statut else None,
                       "lignes": [{"produit": l.produit.nom, "quantite": l.quantite} for l in cmd.lignes]}
                      for cmd in c.commandes_liste],
    }


@router.put("/clients/{cid}/notes")
def maj_notes_client(cid: int, data: NoteIn, db: Session = Depends(get_db)):
    c = db.get(models.Client, cid)
    if not c:
        raise HTTPException(404, "Client introuvable")
    c.notes = data.notes
    db.commit()
    return {"ok": True}


# ================================================================== Produits enrichis (module 3)

@router.get("/produits/alertes-stock")
def alertes_stock(db: Session = Depends(get_db)):
    """Produits actifs dont le stock est <= seuil → à réapprovisionner."""
    produits = (db.query(models.Produit)
                .filter(models.Produit.actif.is_(True),
                        models.Produit.stock <= models.Produit.seuil_stock)
                .order_by(models.Produit.stock).all())
    return [{"id": p.id, "nom": p.nom, "stock": p.stock, "seuil_stock": p.seuil_stock,
             "categorie": p.categorie} for p in produits]


@router.get("/recherches-produits")
def recherches_produits(db: Session = Depends(get_db)):
    """Analytics de la demande : ce que les clients cherchent via l'IA.
    Les termes jamais trouvés = demande non satisfaite (produits à envisager de vendre)."""
    lignes = db.query(models.RechercheProduit).all()
    agg = {}
    for r in lignes:
        cle = (r.terme or "").strip().lower()
        if not cle:
            continue
        a = agg.setdefault(cle, {"terme": cle, "occurences": 0, "trouve": False})
        a["occurences"] += 1
        if r.trouve:
            a["trouve"] = True
    tout = sorted(agg.values(), key=lambda x: x["occurences"], reverse=True)
    return {
        "demandes": tout[:20],
        "non_satisfaites": [a for a in tout if not a["trouve"]][:20],
    }


@router.post("/produits/{pid}/toggle")
def toggle_produit(pid: int, db: Session = Depends(get_db)):
    """Active/désactive un produit en un clic (ex : chebakia hors Ramadan)."""
    p = db.get(models.Produit, pid)
    if not p:
        raise HTTPException(404, "Produit introuvable")
    p.actif = not p.actif
    db.commit()
    return {"id": p.id, "actif": p.actif}


# ================================================================== Détail commande (module 4)

@router.get("/commandes/{cid}")
def detail_commande(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.Commande, cid)
    if not c:
        raise HTTPException(404, "Commande introuvable")
    return {
        "id": c.id, "statut": c.statut.value if c.statut else None,
        "mode": c.mode, "total": c.total, "date": c.date_creation,
        "adresse_livraison": c.adresse_livraison, "telephone_client": c.telephone_client,
        "suivi_livraison": c.suivi_livraison,
        "client": {"id": c.client.id, "nom": c.client.nom or "—", "canal": c.client.canal,
                   "telephone": c.client.telephone, "email": c.client.email},
        "lignes": [{"produit": l.produit.nom, "quantite": l.quantite,
                    "prix_unitaire": l.prix_unitaire, "sous_total": round(l.prix_unitaire * l.quantite, 2)}
                   for l in c.lignes],
    }


@router.get("/commandes/{cid}/ticket.pdf")
def ticket_pdf(cid: int, db: Session = Depends(get_db)):
    c = db.get(models.Commande, cid)
    if not c:
        raise HTTPException(404, "Commande introuvable")
    commerce = services.infos_commerce(db)
    return _pdf_response(pdf.ticket_commande(c, commerce), f"ticket_commande_{c.id}.pdf")


# ================================================================== Rapports d'activité (module 5)

def _rapport(db: Session, periode: str) -> dict:
    jours = 7 if periode == "semaine" else 30
    debut = utcnow() - timedelta(days=jours)
    valides = (db.query(models.Commande)
               .filter(models.Commande.date_creation >= debut,
                       models.Commande.statut != models.StatutCommande.ANNULEE).all())
    ca = round(sum(c.total for c in valides), 2)
    nb = len(valides)

    prod, cat = {}, {}
    for c in valides:
        for l in c.lignes:
            montant = l.prix_unitaire * l.quantite
            p = prod.setdefault(l.produit.nom, {"nom": l.produit.nom, "quantite": 0, "ca": 0})
            p["quantite"] += l.quantite
            p["ca"] += montant
            categorie = l.produit.categorie or "Autre"
            cat[categorie] = cat.get(categorie, 0) + montant
    top = sorted(prod.values(), key=lambda x: x["quantite"], reverse=True)[:6]
    for p in top:
        p["ca"] = round(p["ca"], 2)
    categories = [{"categorie": k, "ca": round(v, 2)} for k, v in sorted(cat.items(), key=lambda x: -x[1])]

    # ventes des 6 dernières semaines
    now = utcnow()
    ventes_semaine = []
    for i in range(5, -1, -1):
        s0, s1 = now - timedelta(days=7 * (i + 1)), now - timedelta(days=7 * i)
        total = sum(c.total for c in db.query(models.Commande).filter(
            models.Commande.date_creation >= s0, models.Commande.date_creation < s1,
            models.Commande.statut != models.StatutCommande.ANNULEE).all())
        ventes_semaine.append({"label": "cette sem." if i == 0 else f"-{i} sem.", "ca": round(total, 2)})

    # heures de pointe des conversations (messages client)
    heures = [0] * 24
    for m in db.query(models.Message).filter(models.Message.horodatage >= debut,
                                             models.Message.emetteur == models.Emetteur.CLIENT).all():
        heures[m.horodatage.hour] += 1

    return {
        "periode": periode, "ca": ca, "nb_commandes": nb,
        "panier_moyen": round(ca / nb, 2) if nb else 0,
        "top_produits": top, "categories": categories,
        "ventes_semaine": ventes_semaine, "heures_pointe": heures,
    }


@router.get("/rapports")
def rapports(periode: str = "mois", db: Session = Depends(get_db)):
    if periode not in ("semaine", "mois"):
        periode = "mois"
    return _rapport(db, periode)


@router.get("/rapports/pdf")
def rapport_pdf(periode: str = "mois", db: Session = Depends(get_db)):
    data = _rapport(db, periode if periode in ("semaine", "mois") else "mois")
    commerce = services.infos_commerce(db)
    return _pdf_response(pdf.rapport_activite(data, commerce), f"rapport_{data['periode']}.pdf")


# ================================================================== Gestion des utilisateurs (admin only)

LIBELLES_PERMISSIONS = {
    "stats": "Statistiques", "produits": "Produits", "commandes": "Commandes",
    "conversations": "Conversations", "personnel": "Personnel (RH)",
    "clients": "Base clients", "rapports": "Rapports",
}


class UtilisateurIn(BaseModel):
    email: str
    nom: str = ""
    mot_de_passe: str | None = None
    role: str = "vendeur"                 # "admin" | "vendeur"
    permissions: list[str] = []


def _vue_utilisateur(u: models.Utilisateur) -> dict:
    return {"id": u.id, "email": u.email, "nom": u.nom or "", "role": u.role or "vendeur",
            "permissions": [p for p in (u.permissions or "").split(",") if p]}


@router.get("/permissions")
def liste_permissions():
    return [{"cle": p, "libelle": LIBELLES_PERMISSIONS.get(p, p)} for p in PERMISSIONS]


@router.get("/utilisateurs")
def lister_utilisateurs(db: Session = Depends(get_db)):
    return [_vue_utilisateur(u) for u in db.query(models.Utilisateur).order_by(models.Utilisateur.email).all()]


@router.post("/utilisateurs", status_code=201)
def creer_utilisateur(data: UtilisateurIn, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(models.Utilisateur).filter_by(email=email).first():
        raise HTTPException(400, "Un utilisateur existe déjà avec cet email")
    if not data.mot_de_passe or len(data.mot_de_passe) < 4:
        raise HTTPException(400, "Mot de passe requis (min 4 caractères)")
    perms = ",".join(p for p in data.permissions if p in PERMISSIONS)
    u = models.Utilisateur(email=email, nom=data.nom,
                           mot_de_passe_hache=hacher_mot_de_passe(data.mot_de_passe),
                           role="admin" if data.role == "admin" else "vendeur",
                           permissions="" if data.role == "admin" else perms)
    db.add(u); db.commit(); db.refresh(u)
    return _vue_utilisateur(u)


@router.put("/utilisateurs/{uid}")
def modifier_utilisateur(uid: int, data: UtilisateurIn, db: Session = Depends(get_db)):
    u = db.get(models.Utilisateur, uid)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    u.nom = data.nom
    u.role = "admin" if data.role == "admin" else "vendeur"
    u.permissions = "" if u.role == "admin" else ",".join(p for p in data.permissions if p in PERMISSIONS)
    if data.mot_de_passe:
        if len(data.mot_de_passe) < 4:
            raise HTTPException(400, "Mot de passe trop court")
        u.mot_de_passe_hache = hacher_mot_de_passe(data.mot_de_passe)
    db.commit()
    return _vue_utilisateur(u)


@router.delete("/utilisateurs/{uid}", status_code=204)
def supprimer_utilisateur(uid: int, db: Session = Depends(get_db),
                          moi: models.Utilisateur = Depends(utilisateur_courant)):
    u = db.get(models.Utilisateur, uid)
    if not u:
        return
    if u.id == moi.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    if est_admin(u) and db.query(models.Utilisateur).filter_by(role="admin").count() <= 1:
        raise HTTPException(400, "Impossible de supprimer le dernier administrateur")
    db.delete(u); db.commit()
