# -*- coding: utf-8 -*-
"""Génère une boucle vidéo de hero (16:9 paysage) à partir des photos du catalogue.

Solution de repli quand on ne dispose pas de vraies images animées : la vitrine utilise
en priorité le film fourni dans frontend/public/hero.mp4.

Chaque plan est un lent travelling avant/arrière (effet Ken Burns) recadré en paysage,
les plans s'enchaînent en fondu, et le dernier fond sur le premier pour boucler sans
coupure. Sortie : frontend/public/hero.mp4 (muet).
"""
import os

import imageio.v2 as imageio
import numpy as np
from PIL import Image

SRC = "D:/Projets/smartshop/frontend/public/products/"
OUT = "D:/Projets/smartshop/frontend/public/hero.mp4"
W, H = 1600, 900          # 16:9
FPS = 25
SEC = 3.2                 # durée d'un plan
FONDU = 0.6               # durée du fondu enchaîné
N = int(SEC * FPS)
F = int(FONDU * FPS)

# (fichier, centre x, centre y, zoom début, zoom fin) — zoom = part de la largeur utilisée
PLANS = [
    ("manteau-laine-ivoire.jpg", 0.50, 0.46, 1.00, 0.84),
    ("caftan-perle.jpg", 0.50, 0.44, 0.86, 1.00),
    ("sac-main-chocolat.jpg", 0.52, 0.52, 0.98, 0.84),
    ("montre-octogonale-doree.jpg", 0.50, 0.50, 1.00, 0.86),
]

sources = [Image.open(SRC + f).convert("RGB") for f, *_ in PLANS]


def lisse(p):
    """Accélération/décélération douce (ease-in-out), pour un mouvement non mécanique."""
    return p * p * (3 - 2 * p)


def plan(i, p):
    """Rend l'image du plan i à l'avancement p (0 → 1, peut dépasser pour le fondu)."""
    img = sources[i]
    _, cx, cy, z0, z1 = PLANS[i]
    z = z0 + (z1 - z0) * lisse(min(max(p, 0.0), 1.2))
    sw, sh = img.size
    cw = sw * z                      # fenêtre de recadrage, ratio 16:9
    ch = cw * H / W
    if ch > sh:                      # la source est trop « haute » : on borne par la hauteur
        ch = sh
        cw = ch * W / H
    x = min(max(cx * sw - cw / 2, 0), sw - cw)
    y = min(max(cy * sh - ch / 2, 0), sh - ch)
    return img.resize((W, H), Image.LANCZOS, box=(x, y, x + cw, y + ch))


os.makedirs(os.path.dirname(OUT), exist_ok=True)
ecrivain = imageio.get_writer(OUT, fps=FPS, codec="libx264", quality=None,
                              macro_block_size=1, ffmpeg_params=[
                                  "-crf", "25", "-pix_fmt", "yuv420p",
                                  "-profile:v", "high", "-movflags", "+faststart", "-an",
                              ])
for i in range(len(PLANS)):
    for k in range(N):
        courant = plan(i, k / N)
        if k < F:                    # fondu depuis le plan précédent (le dernier pour i = 0)
            precedent = plan((i - 1) % len(PLANS), (N + k) / N)
            courant = Image.blend(precedent, courant, k / F)
        ecrivain.append_data(np.asarray(courant))
ecrivain.close()

taille = os.path.getsize(OUT) / 1024
print("OK %s — %d plans, %.1f s, %dx%d, %.0f Ko"
      % (os.path.basename(OUT), len(PLANS), len(PLANS) * SEC, W, H, taille))
