"""Moteur de livraison géolocalisée (type Glovo).

Fournit :
- le géocodage d'adresse (Nominatim / OpenStreetMap, gratuit),
- la logique de mise à jour de la position du livreur — PARTAGÉE entre la simulation
  (livreur virtuel) et l'API réelle (une vraie app chauffeur qui poste sa position),
- les transitions d'étapes (en_route → proche → livrée) et les notifications au client
  (Telegram si le client vient de Telegram, sinon la page de suivi web reflète l'état).
"""
import logging
import math
import threading
import time

import anyio
import httpx

from app import models
from app.adapters.telegram import telegram_channel
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Boutique par défaut si non géocodée : Maârif, Casablanca
BOUTIQUE_DEFAUT = (33.5883, -7.6325)

PROCHE_KM = 0.7      # seuil « le livreur arrive dans ~5 min »
ARRIVEE_KM = 0.06    # seuil « livreur arrivé »

_UA = {"User-Agent": "SmartShopLivraison/1.0 (PFA demo)"}


# ------------------------------------------------------------------ Géo utilitaires

def geocoder(adresse: str):
    """Adresse texte -> (lat, lng) via Nominatim. None si échec."""
    if not adresse or not adresse.strip():
        return None
    try:
        r = httpx.get("https://nominatim.openstreetmap.org/search",
                      params={"q": adresse, "format": "json", "limit": 1},
                      headers=_UA, timeout=15)
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.warning("Géocodage échoué pour '%s' : %s", adresse, e)
    return None


def haversine_km(a, b) -> float:
    (lat1, lon1), (lat2, lon2) = a, b
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def coords_boutique(db) -> tuple:
    c = db.query(models.Commerce).first()
    if c and c.lat is not None and c.lng is not None:
        return (c.lat, c.lng)
    # géocode l'adresse une fois et met en cache
    if c and c.adresse:
        pos = geocoder(c.adresse)
        if pos:
            c.lat, c.lng = pos
            db.commit()
            return pos
    return BOUTIQUE_DEFAUT


# ------------------------------------------------------------------ Notifications

def notifier_client(db, commande: models.Commande, texte: str) -> None:
    """Notifie le client : Telegram s'il en vient, sinon rien (la page de suivi reflète l'état)."""
    client = commande.client
    if client and client.canal == "telegram" and client.identifiant_canal:
        try:
            anyio.run(telegram_channel.send_message, client.identifiant_canal, texte)
        except Exception:
            logger.exception("Notification Telegram échouée (commande %s)", commande.id)
    logger.info("[commande %s] %s", commande.id, texte)


# ------------------------------------------------------------------ Position du livreur (réel + simulation)

def appliquer_position(db, commande: models.Commande, lat: float, lng: float) -> dict:
    """Enregistre la position du livreur et déclenche les transitions d'étapes + notifications.
    Utilisée par la simulation ET par l'API réelle du chauffeur → une seule source de vérité."""
    commande.lat_livreur, commande.lng_livreur = lat, lng
    if commande.lat_client is None or commande.lng_client is None:
        db.commit()
        return {"suivi": commande.suivi_livraison, "distance_km": None}

    dist = haversine_km((lat, lng), (commande.lat_client, commande.lng_client))
    avant = commande.suivi_livraison

    if dist <= ARRIVEE_KM and avant != "livree":
        commande.suivi_livraison = "livree"
    elif dist <= PROCHE_KM and avant in ("", "en_route"):
        commande.suivi_livraison = "proche"

    db.commit()

    if commande.suivi_livraison != avant:
        if commande.suivi_livraison == "proche":
            notifier_client(db, commande, "🛵 Votre livreur arrive dans ~5 minutes !")
        elif commande.suivi_livraison == "livree":
            notifier_client(db, commande, "✅ Votre livreur est arrivé à votre adresse. Bon appétit ! 🍰")

    return {"suivi": commande.suivi_livraison, "distance_km": round(dist, 3)}


def demarrer_livraison(db, commande: models.Commande) -> None:
    """Le livreur emporte la commande : étape en_route + position initiale = boutique + notif."""
    depart = coords_boutique(db)
    commande.suivi_livraison = "en_route"
    commande.lat_livreur, commande.lng_livreur = depart
    db.commit()
    notifier_client(db, commande, "🛵 Votre commande est partie ! Le livreur est en route. Suivez-le en direct.")


def _thread_simulation(commande_id: int, pas: int = 45, intervalle: float = 1.4):
    """Livreur virtuel : interpole la position boutique → client et applique chaque position."""
    db = SessionLocal()
    try:
        commande = db.get(models.Commande, commande_id)
        if not commande or commande.lat_client is None:
            return
        depart = coords_boutique(db)
        arrivee = (commande.lat_client, commande.lng_client)
        for i in range(1, pas + 1):
            t = i / pas
            lat = depart[0] + (arrivee[0] - depart[0]) * t
            lng = depart[1] + (arrivee[1] - depart[1]) * t
            db.expire_all()
            commande = db.get(models.Commande, commande_id)
            if not commande or commande.suivi_livraison == "livree":
                break
            etat = appliquer_position(db, commande, lat, lng)
            if etat["suivi"] == "livree":
                break
            time.sleep(intervalle)
    except Exception:
        logger.exception("Simulation livraison échouée (commande %s)", commande_id)
    finally:
        db.close()


def lancer_simulation(commande_id: int) -> None:
    """Démarre le livreur virtuel en tâche de fond (thread démon)."""
    threading.Thread(target=_thread_simulation, args=(commande_id,), daemon=True).start()
