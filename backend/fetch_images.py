"""Récupère de vraies photos (Wikimedia Commons) pour chaque produit et remplit image_url.
Usage : python fetch_images.py"""
import httpx
from app.database import SessionLocal
from app import models

# terme de recherche Commons par nom de produit (le plus spécifique possible)
TERMES = {
    "Cornes de gazelle": ["Kaab el ghazal", "cornes de gazelle", "gazelle horns pastry"],
    "Chebakia": ["Chebakia", "Chebbakia"],
    "Briouates aux amandes": ["Briouat", "Briwat"],
    "Tarte au citron": ["Lemon tart", "Tarte au citron"],
    "Gâteau d'anniversaire": ["Birthday cake", "Gateau anniversaire"],
    "Macarons assortis": ["Macaron", "Macarons"],
    "Msemen": ["Msemen", "Meloui"],
    "Baghrir": ["Baghrir", "Beghrir"],
}

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "SmartShopVitrine/1.0 (demo PFA; contact: local)"}


def chercher_image(client, termes):
    for terme in termes:
        params = {
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": terme, "gsrnamespace": "6", "gsrlimit": "8",
            "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": "800",
        }
        try:
            r = client.get(API, params=params, headers=HEADERS, timeout=20)
            pages = r.json().get("query", {}).get("pages", {})
        except Exception as e:
            print(f"   ! erreur API pour '{terme}': {e}")
            continue
        # trie par index de recherche pour garder la pertinence
        for p in sorted(pages.values(), key=lambda x: x.get("index", 99)):
            info = (p.get("imageinfo") or [{}])[0]
            mime, thumb = info.get("mime", ""), info.get("thumburl")
            if thumb and mime in ("image/jpeg", "image/png"):
                return thumb, terme
    return None, None


def main():
    db = SessionLocal()
    with httpx.Client(follow_redirects=True) as client:
        for produit in db.query(models.Produit).filter_by(actif=True).all():
            termes = TERMES.get(produit.nom, [produit.nom])
            url, terme = chercher_image(client, termes)
            if url:
                produit.image_url = url
                print(f"✔ {produit.nom:24} <- '{terme}'  {url[:70]}")
            else:
                print(f"�‼ {produit.nom:24} : aucune image trouvée")
        db.commit()
    db.close()
    print("\nTerminé — image_url mis à jour.")


if __name__ == "__main__":
    main()
