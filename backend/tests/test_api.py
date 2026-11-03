"""Tests fonctionnels de l'API REST : santé, vitrine publique, authentification, RBAC, CRUD produits."""


def test_health(client):
    """GET / doit répondre 200 avec un statut — utilisable comme healthcheck de déploiement."""
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["statut"] == "ok"


def test_vitrine_est_publique(client, seed):
    """La vitrine est accessible SANS authentification et expose les vrais produits/prix."""
    r = client.get("/api/vitrine")
    assert r.status_code == 200
    data = r.json()
    noms = {p["nom"] for p in data["produits"]}
    assert {"Sac à main cuir grainé chocolat", "Montre ovale dorée"} <= noms
    sac = next(p for p in data["produits"] if p["nom"] == "Sac à main cuir grainé chocolat")
    assert sac["prix"] == 2200.0  # prix réel de la BDD, pas une valeur inventée


def test_produits_exige_authentification(client, seed):
    """Un endpoint protégé renvoie 401 sans token."""
    r = client.get("/api/produits")
    assert r.status_code == 401


def test_login_mauvais_mot_de_passe(client, seed):
    r = client.post("/api/auth/login", data={"username": "admin@smartshop.ma", "password": "faux"})
    assert r.status_code == 401


def test_login_et_profil_admin(client, seed, login):
    headers = login("admin@smartshop.ma", "admin123")
    r = client.get("/api/auth/moi", headers=headers)
    assert r.status_code == 200
    profil = r.json()
    assert profil["email"] == "admin@smartshop.ma"
    assert profil["est_admin"] is True


def test_admin_liste_les_produits(client, seed, login):
    headers = login("admin@smartshop.ma", "admin123")
    r = client.get("/api/produits", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_creation_produit(client, seed, login):
    headers = login("admin@smartshop.ma", "admin123")
    r = client.post("/api/produits", headers=headers, json={
        "nom": "Écharpe en cachemire", "prix": 850.0, "stock": 8, "categorie": "Vêtements",
    })
    assert r.status_code == 201
    assert r.json()["nom"] == "Écharpe en cachemire"
    # Le nouveau produit est bien listé
    r2 = client.get("/api/produits", headers=headers)
    assert len(r2.json()) == 3


def test_rbac_vendeur_restreint(client, seed, login):
    """Le vendeur n'a que la permission 'commandes' : 403 sur produits, 200 sur commandes."""
    headers = login("vendeur@smartshop.ma", "vendeur123")
    assert client.get("/api/produits", headers=headers).status_code == 403
    assert client.get("/api/commandes", headers=headers).status_code == 200
