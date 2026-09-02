"""Génération de documents PDF (attestations, ordres de congé, tickets…) via fpdf2.

Note : les polices « core » de fpdf2 encodent en Latin-1 → on reste sur des accents
français standards (é è à ç ù) et une apostrophe droite (') pour éviter tout souci.
"""
from datetime import date

from fpdf import FPDF

OR = (184, 148, 77)  # doré


def _fmt(d) -> str:
    return d.strftime("%d/%m/%Y") if d else "—"


def _entete(pdf: FPDF, commerce):
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, (commerce.nom if commerce else "SmartShop"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    if commerce and commerce.adresse:
        pdf.cell(0, 5, commerce.adresse, align="C", new_x="LMARGIN", new_y="NEXT")
    ligne = []
    if commerce and commerce.telephone:
        ligne.append("Tel : " + commerce.telephone)
    if ligne:
        pdf.cell(0, 5, "  -  ".join(ligne), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_draw_color(*OR)
    pdf.set_line_width(0.6)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.ln(10)


def _titre(pdf: FPDF, titre: str):
    pdf.set_font("Helvetica", "B", 15)
    pdf.cell(0, 10, titre, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)


def _pied_signature(pdf: FPDF):
    pdf.ln(16)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, "Fait le " + date.today().strftime("%d/%m/%Y"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(14)
    pdf.cell(0, 8, "Signature et cachet", align="R", new_x="LMARGIN", new_y="NEXT")


def attestation_travail(employe, commerce) -> bytes:
    pdf = FPDF(format="A4")
    pdf.add_page()
    _entete(pdf, commerce)
    _titre(pdf, "ATTESTATION DE TRAVAIL")
    pdf.set_font("Helvetica", "", 12)
    nom_c = commerce.nom if commerce else "la societe"
    texte = (
        f"Nous soussignes, {nom_c}, attestons que M./Mme {employe.nom}, "
        f"titulaire de la CIN n {employe.cin or '—'}, est employe(e) au sein de "
        f"notre etablissement en qualite de {employe.fonction or '—'} "
        f"depuis le {_fmt(employe.date_embauche)}."
    )
    pdf.multi_cell(0, 8, texte)
    pdf.ln(3)
    pdf.multi_cell(0, 8, "La presente attestation est delivree a l'interesse(e) pour servir "
                         "et valoir ce que de droit.")
    _pied_signature(pdf)
    return bytes(pdf.output())


def ordre_conge(conge, employe, commerce) -> bytes:
    pdf = FPDF(format="A4")
    pdf.add_page()
    _entete(pdf, commerce)
    _titre(pdf, "ORDRE DE CONGE")
    pdf.set_font("Helvetica", "", 12)
    texte = (
        f"Il est accorde a M./Mme {employe.nom}, occupant le poste de "
        f"{employe.fonction or '—'}, un conge de {conge.nb_jours} jour(s) "
        f"du {_fmt(conge.date_debut)} au {_fmt(conge.date_fin)}."
    )
    pdf.multi_cell(0, 8, texte)
    if conge.motif:
        pdf.ln(2)
        pdf.multi_cell(0, 8, "Motif : " + conge.motif)
    pdf.ln(3)
    pdf.multi_cell(0, 8, "L'interesse(e) est prie(e) de reprendre son service a l'issue de cette periode.")
    _pied_signature(pdf)
    return bytes(pdf.output())


def rapport_activite(data: dict, commerce) -> bytes:
    pdf = FPDF(format="A4")
    pdf.add_page()
    _entete(pdf, commerce)
    periode_lbl = "7 derniers jours" if data["periode"] == "semaine" else "30 derniers jours"
    _titre(pdf, "RAPPORT D'ACTIVITE (" + periode_lbl + ")")

    # KPIs
    pdf.set_font("Helvetica", "", 12)
    for libelle, valeur in [("Chiffre d'affaires", f"{data['ca']} DH"),
                            ("Nombre de commandes", str(data['nb_commandes'])),
                            ("Panier moyen", f"{data['panier_moyen']} DH")]:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(70, 8, libelle + " :", new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 8, valeur, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Top produits
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Produits les plus vendus", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    if not data["top_produits"]:
        pdf.cell(0, 7, "Aucune vente sur la periode.", new_x="LMARGIN", new_y="NEXT")
    for p in data["top_produits"]:
        pdf.cell(0, 7, f"  - {p['nom']} : {p['quantite']} vendus  ({p['ca']} DH)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Ventes par categorie
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Ventes par categorie", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for c in data["categories"]:
        pdf.cell(0, 7, f"  - {c['categorie']} : {c['ca']} DH", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, "Genere le " + date.today().strftime("%d/%m/%Y") + " par SmartShop Assistant.",
             new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


def ticket_commande(commande, commerce) -> bytes:
    """Ticket de commande (réutilisé par le module 4)."""
    pdf = FPDF(format=(80, 200))  # format ticket étroit
    pdf.set_margins(6, 8, 6)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 7, (commerce.nom if commerce else "SmartShop"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, "Commande #" + str(commande.id), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, _fmt(commande.date_creation), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.cell(0, 4, "-" * 40, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    for l in commande.lignes:
        pdf.cell(0, 6, f"{l.quantite}x {l.produit.nom}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"    {l.prix_unitaire} DH", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 4, "-" * 40, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"TOTAL : {commande.total} DH", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    mode = "Livraison" if commande.mode == "livraison" else "Retrait en boutique"
    pdf.cell(0, 6, mode, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.cell(0, 6, "Merci de votre visite !", align="C", new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())
