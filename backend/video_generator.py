#!/usr/bin/env python3
"""
video_generator.py
===================

Génère une courte vidéo (MP4) à partir d'une simple description textuelle
— version 100% indépendante : aucune clé API, aucun service d'image externe
requis pour avoir du CONTENU visuel pertinent.

Ce que corrige cette version par rapport à la précédente
----------------------------------------------------------
Le problème signalé : MemoryError sur une toute petite allocation, symptôme
classique d'une accumulation de mémoire plutôt que d'un vrai manque de RAM.
En cause : chaque fonction d'illustration créait une image RGBA complète
séparée + une fusion alpha (Image.alpha_composite) à chaque frame, au lieu
de dessiner directement sur l'image existante (comme le faisait déjà
draw_subtitle). Sur une vidéo de plusieurs centaines de frames en pleine
résolution, ça finissait par saturer la mémoire disponible. Corrigé ici en
libérant explicitement les objets intermédiaires (overlay, base RGBA) après
chaque composition et en évitant les copies inutiles dans la boucle de
rendu par frame.

Solution retenue pour le contenu visuel
------------------------------------------
Un moteur d'illustration procédural, écrit en pur PIL (aucune API, aucun
réseau), qui DESSINE une scène simple mais reconnaissable en fonction du
thème détecté dans le texte :

    - "ocean"   -> horizon, soleil/lune, vagues superposées
    - "sunset"  -> grand soleil bas, dégradé chaud, oiseaux
    - "forest"  -> silhouettes d'arbres en plusieurs plans (profondeur)
    - "night"   -> ciel étoilé, lune en croissant, silhouette de collines
    - "city"    -> skyline avec fenêtres allumées aléatoirement
    - "fire"    -> flammes stylisées + particules montantes
    - "tech"    -> grille façon circuit imprimé + nœuds lumineux
    - "calm"    -> cercles concentriques doux, minimalisme
    - "rain"    -> pluie qui tombe
    - "snow"    -> neige qui tombe, dérive douce
    - (défaut)  -> composition géométrique abstraite douce

Améliorations de cette version ("plus amélioré")
--------------------------------------------------
    - Les thèmes ocean / night / city / fire / rain / snow sont ANIMÉS
      image par image (vagues qui bougent, étoiles qui scintillent,
      fenêtres qui clignotent, flammes qui vacillent, pluie/neige qui
      tombent) au lieu d'une image fixe zoomée — un vrai mouvement de
      contenu, toujours sans aucune API.
    - Sous-titres en révélation progressive ("karaoke" simplifié) : les
      mots apparaissent au fil de la voix off plutôt que d'un seul bloc,
      avec une légère ombre portée pour la lisibilité.
    - Mouvement de caméra plus naturel : easing sinusoïdal (accélère puis
      ralentit) au lieu d'un zoom linéaire, avec un sens (avant/arrière)
      tiré aléatoirement par scène pour éviter la monotonie.
    - Deux thèmes supplémentaires : pluie et neige.
    - Correction mémoire : les objets PIL intermédiaires (overlays RGBA)
      sont explicitement fermés/libérés à chaque frame plutôt que
      d'accumuler des références, ce qui évite le MemoryError sur les
      vidéos longues.

Chaque scène a donc un vrai visuel généré à partir de ce qu'elle décrit,
sans dépendre d'aucun service tiers. La recherche Pexels reste disponible
en option (--pexels-key) pour remplacer l'illustration par une vraie photo
si vous en avez envie, mais n'est plus nécessaire pour obtenir du contenu.

Voix off également rendue indépendante : par défaut, `pyttsx3` (moteur
TTS 100% local, hors-ligne) est utilisé. gTTS (qui appelle l'API Google en
coulisses) reste disponible via --tts-engine gtts si vous préférez sa
qualité de voix et avez un accès internet.

Installation
------------
    pip install "moviepy<2" pillow numpy pyttsx3 --break-system-packages
    # optionnel (voix en ligne de meilleure qualité) :
    pip install gTTS --break-system-packages
    # optionnel (vraies photos de fond) :
    pip install requests --break-system-packages

IMPORTANT : `moviepy<2` est requis — la version 2.x a supprimé le module
`moviepy.editor` et renommé plusieurs méthodes (set_duration, resize,
set_audio...) utilisées ici. Utiliser moviepy 2.x tel quel provoquera une
erreur au lancement.

Sur Linux, pyttsx3 s'appuie sur espeak-ng (PAS l'ancien paquet "espeak" :
sur plusieurs distributions récentes, il est trop ancien et pyttsx3 échoue
au démarrage avec une erreur "SetVoiceByName failed") :
    sudo apt-get install espeak-ng

Utilisation
-----------
    python video_generator.py \\
        "Un chat explore une ville futuriste la nuit. \\
         Il découvre un marché flottant illuminé de néons. \\
         Il rentre chez lui au lever du soleil." \\
        --output ma_video.mp4

Par défaut, chaque scène récupère automatiquement une vraie VIDÉO Pexels
correspondant au thème détecté (une clé Pexels est déjà intégrée dans le
script, voir DEFAULT_PEXELS_KEY plus bas — remplace-la par la tienne si tu
comptes partager ce fichier). En cas d'échec (pas de vidéo trouvée, pas de
réseau), le script retombe automatiquement sur une photo Pexels, puis sur
Wikimedia Commons ou l'illustration procédurale.

Pour changer explicitement de source de fond :
    python video_generator.py "..." --images pexels-video --output video.mp4   # vraie vidéo (défaut)
    python video_generator.py "..." --images wikimedia     --output video.mp4  # vraie photo, sans clé
    python video_generator.py "..." --images procedural    --output video.mp4  # 100% hors-ligne
"""

from __future__ import annotations

import argparse
import io
import math
import os
import random
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

try:
    import requests
except ImportError:
    requests = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

try:
    from moviepy.editor import (
        AudioFileClip,
        CompositeAudioClip,
        ImageClip,
        VideoClip,
        VideoFileClip,
        concatenate_videoclips,
    )
    from moviepy.audio.fx.all import audio_loop
    from moviepy.video.fx.all import crop, loop as vfx_loop
except ImportError:
    print("moviepy n'est pas installé. Lancez : pip install moviepy --break-system-packages")
    sys.exit(1)


# --------------------------------------------------------------------------- #
#  Paramètres visuels
# --------------------------------------------------------------------------- #

GRADIENT_PALETTE = [
    ((20, 20, 30), (60, 30, 80)),
    ((10, 30, 40), (30, 90, 100)),
    ((40, 15, 15), (110, 40, 30)),
    ((15, 25, 15), (30, 80, 50)),
    ((25, 15, 40), (90, 40, 110)),
]

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]

STYLE_ADJUSTMENTS = {
    "realistic": {"saturation": 1.0, "contrast": 1.0, "letterbox": False, "posterize": None, "zoom": 0.06},
    "cinematic": {"saturation": 0.9, "contrast": 1.15, "letterbox": True, "posterize": None, "zoom": 0.10},
    "animation": {"saturation": 1.35, "contrast": 1.1, "letterbox": False, "posterize": None, "zoom": 0.07},
    "cartoon": {"saturation": 1.5, "contrast": 1.25, "letterbox": False, "posterize": 4, "zoom": 0.08},
}

ACCENT_COLOR = (255, 144, 80, 255)

# Clé API Pexels utilisée par défaut si --pexels-key n'est pas fourni et
# que la variable d'environnement PEXELS_API_KEY n'est pas définie non
# plus. Intégrée ici pour permettre de lancer le script sans aucune
# configuration préalable (usage personnel / démo).
# ATTENTION SÉCURITÉ : une clé écrite en dur dans le code source est
# visible par quiconque a accès au fichier (dépôt Git public, partage du
# script, etc.). Si tu comptes partager ce fichier ou le publier, retire
# cette valeur par défaut et fournis ta clé via --pexels-key ou la
# variable d'environnement PEXELS_API_KEY à la place.
DEFAULT_PEXELS_KEY = "Tp8EbZz28x0yAnxsniOdA54WZVhu9ibY8WbwLFYUL6I7ltxBbjx7kolT"

# Facteur de supersampling (SSAA) : les scènes sont dessinées à SS_FACTOR
# fois la résolution finale, puis réduites (Image.LANCZOS) avant d'être
# envoyées à moviepy. Ce lissage "gratuit" à la réduction améliore
# nettement le rendu des courbes, des diagonales et du texte par rapport
# à un dessin direct à la résolution cible (fini l'aspect crénelé/pixelisé
# sur les cercles, vagues, silhouettes...). Coût : ~4x plus de pixels à
# calculer par frame ; 2 est un bon compromis qualité/temps de rendu.
SS_FACTOR = 2


def _scaled_count(base_count: int, size: tuple[int, int]) -> int:
    """Adapte une densité d'éléments (étoiles, gouttes de pluie, flocons,
    particules...) à la taille réelle du canevas de rendu. Sans ça, dessiner
    en supersampling (canevas plus grand) diluerait ces éléments au lieu de
    garder une densité visuelle constante — le repère est une résolution de
    référence 1080x1920."""
    w, h = size
    return max(1, int(base_count * (w * h) / (1080 * 1920)))


# --------------------------------------------------------------------------- #
#  Extraction de mots-clés (sans dépendance NLP lourde)
# --------------------------------------------------------------------------- #

STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux",
    "en", "dans", "pour", "avec", "sur", "sous", "par", "que", "qui", "quoi", "ce",
    "cette", "ces", "cet", "il", "elle", "ils", "elles", "on", "nous", "vous", "je",
    "tu", "son", "sa", "ses", "leur", "leurs", "mon", "ma", "mes", "ton", "ta", "tes",
    "notre", "votre", "est", "sont", "était", "être", "avoir", "a", "ont", "plus",
    "très", "tout", "toute", "tous", "toutes", "comme", "mais", "donc", "car", "ni",
    "pas", "ne", "se", "y", "d", "l", "qu", "s", "n", "c", "j", "m",
    "the", "a", "an", "and", "or", "of", "in", "on", "for", "with", "to", "is", "are",
    "was", "were", "be", "been", "this", "that", "these", "those", "it", "as", "at",
    "by", "from", "into", "very", "so", "but",
}


def extract_keywords(text: str, max_keywords: int = 5) -> list[str]:
    words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ']+", text.lower())
    candidates = [w for w in words if len(w) > 3 and w not in STOPWORDS]
    if not candidates:
        return []
    freq: dict[str, int] = {}
    for w in candidates:
        freq[w] = freq.get(w, 0) + 1
    ranked = sorted(set(candidates), key=lambda w: (-freq[w], -len(w)))
    return ranked[:max_keywords]


# --------------------------------------------------------------------------- #
#  Détection de thème visuel
# --------------------------------------------------------------------------- #

THEME_PALETTES = {
    "ocean": {
        "words": {"mer", "océan", "ocean", "plage", "beach", "vague", "wave", "surf", "eau", "sea", "île", "corail"},
        "palette": ((8, 35, 55), (20, 120, 150)),
    },
    "sunset": {
        "words": {"coucher", "soleil", "sunset", "aube", "aurore", "crépuscule", "dawn", "orange", "golden"},
        "palette": ((55, 20, 20), (235, 130, 60)),
    },
    "forest": {
        "words": {"forêt", "forest", "arbre", "tree", "nature", "jungle", "vert", "montagne", "mountain"},
        "palette": ((8, 30, 15), (35, 115, 60)),
    },
    "night": {
        "words": {"nuit", "night", "étoile", "star", "espace", "space", "cosmos", "galaxie", "galaxy", "lune", "moon"},
        "palette": ((5, 5, 22), (45, 20, 95)),
    },
    "city": {
        "words": {"ville", "city", "urbain", "urban", "rue", "street", "building", "gratte-ciel", "néon", "neon"},
        "palette": ((14, 14, 24), (75, 75, 115)),
    },
    "fire": {
        "words": {"feu", "fire", "flamme", "flame", "chaleur", "brasier", "incendie", "chaud"},
        "palette": ((45, 10, 5), (210, 75, 20)),
    },
    "tech": {
        "words": {"technologie", "technology", "robot", "intelligence", "futur", "future", "tech", "digital",
                  "ordinateur", "computer", "données", "algorithme", "ia", "ai"},
        "palette": ((10, 16, 32), (30, 155, 185)),
    },
    "calm": {
        "words": {"calme", "calm", "paix", "peace", "zen", "méditation", "doux", "tranquille", "silence"},
        "palette": ((16, 26, 32), (60, 112, 112)),
    },
    "rain": {
        "words": {"pluie", "rain", "orage", "storm", "pleuvoir", "averse", "nuage", "cloud", "humide"},
        "palette": ((20, 24, 32), (55, 65, 80)),
    },
    "snow": {
        "words": {"neige", "snow", "hiver", "winter", "froid", "cold", "glace", "ice", "flocon"},
        "palette": ((30, 34, 45), (90, 100, 120)),
    },
}


def detect_theme(text: str) -> Optional[str]:
    """Renvoie le nom du thème détecté (ou None si aucun mot-clé connu)."""
    lowered = text.lower()
    scores = {theme: sum(1 for w in cfg["words"] if w in lowered) for theme, cfg in THEME_PALETTES.items()}
    scores = {k: v for k, v in scores.items() if v > 0}
    if not scores:
        return None
    return max(scores, key=scores.get)


def theme_palette(theme: Optional[str], fallback_index: int) -> tuple:
    if theme and theme in THEME_PALETTES:
        return THEME_PALETTES[theme]["palette"]
    return GRADIENT_PALETTE[fallback_index % len(GRADIENT_PALETTE)]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


# --------------------------------------------------------------------------- #
#  Découpage de la description en scènes
# --------------------------------------------------------------------------- #

def split_into_scenes(description: str, max_scenes: int = 8) -> list[str]:
    raw = re.split(r"(?<=[.!?])\s+", description.strip())
    scenes = [s.strip() for s in raw if s.strip()]
    if not scenes:
        scenes = [description.strip()]
    return scenes[:max_scenes]


# --------------------------------------------------------------------------- #
#  Fond dégradé de base
# --------------------------------------------------------------------------- #

def make_gradient_background(size: tuple[int, int], palette: tuple) -> Image.Image:
    w, h = size
    top, bottom = palette
    top_arr = np.array(top, dtype=np.float32)
    bottom_arr = np.array(bottom, dtype=np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32).reshape(h, 1)
    column = (top_arr + (bottom_arr - top_arr) * t).astype(np.uint8).reshape(h, 1, 3)
    col_img = Image.fromarray(column, mode="RGB")
    base = col_img.resize((w, h), Image.NEAREST)

    vignette = Image.new("L", (w, h), 0)
    vdraw = ImageDraw.Draw(vignette)
    vdraw.ellipse([-w * 0.3, -h * 0.3, w * 1.3, h * 1.3], fill=60)
    vignette = vignette.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    base = Image.composite(base, dark, vignette)
    vignette.close()
    dark.close()
    col_img.close()
    return base


# --------------------------------------------------------------------------- #
#  Moteur d'illustration procédural (le vrai "contenu", sans API)
# --------------------------------------------------------------------------- #
#
# Correction mémoire : chaque fonction ci-dessous crée UN SEUL overlay RGBA
# temporaire, le compose sur l'image de base avec alpha_composite, puis
# ferme explicitement (img.close()) les objets intermédiaires (l'ancienne
# image "img" avant conversion, l'overlay) au lieu de laisser Python
# accumuler des références vivantes jusqu'au garbage collector. Sur une
# vidéo de plusieurs centaines de frames en pleine résolution (ex.
# 1080x1920), chaque frame non libérée immédiatement pouvait représenter
# plusieurs Mo retenus en mémoire ; multiplié par le nombre de frames, cela
# finissait par déclencher un MemoryError même sur de petites allocations
# suivantes (le symptôme n'a rien à voir avec la taille de l'allocation qui
# échoue, mais avec la mémoire déjà saturée par l'accumulation précédente).

def _glow_circle(img: Image.Image, cx: int, cy: int, r: int, color: tuple, glow_layers: int = 5) -> Image.Image:
    """Dessine un disque lumineux (soleil/lune) avec un halo doux."""
    base_rgba = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for i in range(glow_layers, 0, -1):
        alpha = int(35 * (i / glow_layers))
        extra = r * (1 + 0.35 * i)
        odraw.ellipse([cx - extra, cy - extra, cx + extra, cy + extra], fill=(*color[:3], alpha))
    odraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color[:3], 255))
    result = Image.alpha_composite(base_rgba, overlay)
    base_rgba.close()
    overlay.close()
    return result


def illustrate_ocean(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    horizon = int(h * 0.42)
    sun_color = (255, 214, 150)
    glowed = _glow_circle(img, int(w * 0.72), int(horizon * 0.6), int(w * 0.09), sun_color)
    img2 = glowed.convert("RGB")
    glowed.close()
    overlay = Image.new("RGBA", img2.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.line([(0, horizon), (w, horizon)], fill=(255, 255, 255, 60), width=2)
    for layer in range(4):
        y0 = horizon + (layer + 1) * (h - horizon) / 5
        amplitude = 5 + layer * 3
        phase = rng.uniform(0, math.pi * 2)
        alpha = max(70 - layer * 12, 15)
        points = [(x, y0 + amplitude * math.sin(x * 0.02 + phase)) for x in range(0, w + 12, 12)]
        points += [(w, h), (0, h)]
        odraw.polygon(points, fill=(255, 255, 255, alpha))
    base_rgba = img2.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    img2.close()
    return result


def illustrate_sunset(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    horizon = int(h * 0.62)
    glowed = _glow_circle(img, int(w * 0.5), horizon, int(w * 0.16), (255, 190, 120), glow_layers=7)
    img2 = glowed.convert("RGB")
    glowed.close()
    overlay = Image.new("RGBA", img2.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rectangle([0, horizon, w, h], fill=(20, 10, 15, 90))
    for _ in range(4):
        bx = rng.uniform(w * 0.1, w * 0.9)
        by = rng.uniform(h * 0.12, h * 0.3)
        span = rng.uniform(14, 22)
        odraw.line([(bx - span, by), (bx, by - span * 0.4), (bx + span, by)], fill=(40, 30, 30, 140), width=2)
    base_rgba = img2.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    img2.close()
    return result


def illustrate_forest(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    layers = 3
    for layer in range(layers):
        base_y = h * (0.55 + layer * 0.14)
        tree_h = h * (0.28 - layer * 0.05)
        alpha = 90 + layer * 45
        color = (10 + layer * 8, 40 + layer * 12, 20 + layer * 8, min(alpha, 255))
        x = -20
        while x < w + 20:
            tw = rng.uniform(30, 55)
            th = tree_h * rng.uniform(0.75, 1.15)
            odraw.polygon(
                [(x, base_y), (x + tw / 2, base_y - th), (x + tw, base_y)],
                fill=color,
            )
            x += tw * rng.uniform(0.55, 0.85)
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def illustrate_night(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    glowed = _glow_circle(img, int(w * 0.78), int(h * 0.18), int(w * 0.055), (240, 240, 225), glow_layers=6)
    img2 = glowed.convert("RGB")
    glowed.close()
    overlay = Image.new("RGBA", img2.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for _ in range(70):
        x = rng.uniform(0, w)
        y = rng.uniform(0, h * 0.65)
        r = rng.uniform(0.6, 1.8)
        alpha = rng.randint(120, 255)
        odraw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
    base_y = h * 0.78
    points = [(0, h)]
    x = 0
    while x <= w:
        points.append((x, base_y + rng.uniform(-18, 18)))
        x += w / 8
    points.append((w, h))
    odraw.polygon(points, fill=(5, 5, 12, 220))
    base_rgba = img2.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    img2.close()
    return result


def illustrate_city(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    base_y = h * 0.82
    x = 0
    while x < w:
        bw = rng.uniform(35, 65)
        bh = rng.uniform(h * 0.18, h * 0.42)
        by = base_y - bh
        shade = rng.randint(18, 34)
        odraw.rectangle([x, by, x + bw, base_y], fill=(shade, shade, shade + 8, 235))
        rows = int(bh // 14)
        cols = int(bw // 10)
        for r_ in range(rows):
            for c_ in range(cols):
                if rng.random() < 0.35:
                    wx = x + 4 + c_ * 10
                    wy = by + 4 + r_ * 14
                    odraw.rectangle([wx, wy, wx + 4, wy + 6], fill=(255, 210, 120, 220))
        x += bw + rng.uniform(4, 10)
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def illustrate_fire(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    base_y = h * 0.85
    for _ in range(9):
        fx = rng.uniform(w * 0.25, w * 0.75)
        fh = rng.uniform(h * 0.18, h * 0.32)
        fw = fh * rng.uniform(0.35, 0.55)
        colors = [(255, 200, 60, 210), (255, 120, 30, 200), (200, 40, 10, 190)]
        for i, col in enumerate(colors):
            scale = 1 - i * 0.28
            odraw.polygon(
                [
                    (fx, base_y),
                    (fx - fw * scale / 2, base_y - fh * scale * 0.55),
                    (fx, base_y - fh * scale),
                    (fx + fw * scale / 2, base_y - fh * scale * 0.55),
                ],
                fill=col,
            )
    for _ in range(25):
        px = rng.uniform(w * 0.2, w * 0.8)
        py = rng.uniform(h * 0.35, base_y)
        r = rng.uniform(1, 2.5)
        odraw.ellipse([px - r, py - r, px + r, py + r], fill=(255, 180, 80, rng.randint(80, 180)))
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def illustrate_tech(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    spacing = 46
    for x in range(0, w, spacing):
        odraw.line([(x, 0), (x, h)], fill=(60, 200, 220, 22))
    for y in range(0, h, spacing):
        odraw.line([(0, y), (w, y)], fill=(60, 200, 220, 22))
    nodes = [(rng.uniform(0, w), rng.uniform(0, h)) for _ in range(14)]
    for i, (nx, ny) in enumerate(nodes):
        odraw.ellipse([nx - 3, ny - 3, nx + 3, ny + 3], fill=(90, 230, 250, 230))
        if i > 0:
            ox, oy = nodes[i - 1]
            odraw.line([(ox, oy), (nx, ny)], fill=(90, 230, 250, 60), width=1)
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def illustrate_calm(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    cx, cy = w * 0.5, h * 0.5
    for i in range(6, 0, -1):
        r = min(w, h) * 0.08 * i
        alpha = 18
        odraw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, alpha), width=2)
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def illustrate_abstract(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for _ in range(5):
        shape = rng.choice(["circle", "triangle"])
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        size_ = rng.uniform(w * 0.08, w * 0.22)
        alpha = rng.randint(18, 40)
        color = (255, 255, 255, alpha)
        if shape == "circle":
            odraw.ellipse([cx - size_, cy - size_, cx + size_, cy + size_], fill=color)
        else:
            odraw.polygon(
                [(cx, cy - size_), (cx - size_, cy + size_), (cx + size_, cy + size_)],
                fill=color,
            )
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


# --------------------------------------------------------------------------- #
#  Illustrations ANIMÉES (mouvement réel image par image, toujours sans API)
# --------------------------------------------------------------------------- #
# Pour chaque thème animé : une fonction build_*_scene(size, seed) qui
# précalcule une bonne fois les positions/paramètres aléatoires (étoiles,
# gouttes, flammes, fenêtres...), et une fonction render_*_frame(base, scene, t)
# qui redessine uniquement les éléments dynamiques à l'instant t par-dessus
# le fond statique déjà calculé — on ne relance jamais le tirage aléatoire
# à chaque frame, seule la position/l'opacité des éléments varie avec t.
# Chaque frame renvoyée est une image NEUVE dont le seul propriétaire est
# l'appelant (make_frame ci-dessous) : les overlays temporaires créés à
# l'intérieur sont systématiquement fermés avant de retourner le résultat.

def build_ocean_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    horizon = int(h * 0.42)
    sun = (int(w * 0.72), int(horizon * 0.6), int(w * 0.09))
    waves = []
    for layer in range(4):
        waves.append({
            "y0": horizon + (layer + 1) * (h - horizon) / 5,
            "amplitude": 5 + layer * 3,
            "phase": rng.uniform(0, math.pi * 2),
            "alpha": max(70 - layer * 12, 15),
            "speed": 0.5 + layer * 0.18,
        })
    return {"horizon": horizon, "sun": sun, "waves": waves}


def render_ocean_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    w, h = base.size
    cx, cy, r = scene["sun"]
    glowed = _glow_circle(base, cx, cy, r, (255, 214, 150))
    img = glowed.convert("RGB")
    glowed.close()
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.line([(0, scene["horizon"]), (w, scene["horizon"])], fill=(255, 255, 255, 60), width=2)
    for wl in scene["waves"]:
        phase = wl["phase"] + t * wl["speed"]
        points = [(x, wl["y0"] + wl["amplitude"] * math.sin(x * 0.02 + phase)) for x in range(0, w + 12, 12)]
        points += [(w, h), (0, h)]
        odraw.polygon(points, fill=(255, 255, 255, wl["alpha"]))
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    img.close()
    return result


def build_night_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    stars = []
    for _ in range(_scaled_count(70, size)):
        stars.append({
            "x": rng.uniform(0, w),
            "y": rng.uniform(0, h * 0.65),
            "r": rng.uniform(0.6, 1.8),
            "phase": rng.uniform(0, math.pi * 2),
            "speed": rng.uniform(1.2, 2.6),
            "base_alpha": rng.randint(120, 255),
        })
    hills_y = h * 0.78
    hill_points = [(0, h)]
    x = 0
    while x <= w:
        hill_points.append((x, hills_y + rng.uniform(-18, 18)))
        x += w / 8
    hill_points.append((w, h))
    moon = (int(w * 0.78), int(h * 0.18), int(w * 0.055))
    return {"stars": stars, "hill_points": hill_points, "moon": moon}


def render_night_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    cx, cy, r = scene["moon"]
    glowed = _glow_circle(base, cx, cy, r, (240, 240, 225), glow_layers=6)
    img = glowed.convert("RGB")
    glowed.close()
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for star in scene["stars"]:
        twinkle = 0.4 + 0.6 * (0.5 + 0.5 * math.sin(t * star["speed"] + star["phase"]))
        alpha = int(star["base_alpha"] * twinkle)
        r_ = star["r"]
        odraw.ellipse([star["x"] - r_, star["y"] - r_, star["x"] + r_, star["y"] + r_], fill=(255, 255, 255, alpha))
    odraw.polygon(scene["hill_points"], fill=(5, 5, 12, 220))
    base_rgba = img.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    img.close()
    return result


def build_city_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    base_y = h * 0.82
    buildings, windows = [], []
    x = 0
    while x < w:
        bw = rng.uniform(35, 65)
        bh = rng.uniform(h * 0.18, h * 0.42)
        by = base_y - bh
        shade = rng.randint(18, 34)
        buildings.append({"x": x, "y": by, "w": bw, "h": bh, "shade": shade})
        rows = int(bh // 14)
        cols = int(bw // 10)
        for r_ in range(rows):
            for c_ in range(cols):
                if rng.random() < 0.35:
                    windows.append({
                        "x": x + 4 + c_ * 10,
                        "y": by + 4 + r_ * 14,
                        "blink": rng.random() < 0.25,
                        "speed": rng.uniform(0.4, 1.2),
                        "offset": rng.uniform(0, 10),
                    })
        x += bw + rng.uniform(4, 10)
    return {"base_y": base_y, "buildings": buildings, "windows": windows}


def render_city_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for b in scene["buildings"]:
        odraw.rectangle([b["x"], b["y"], b["x"] + b["w"], scene["base_y"]],
                         fill=(b["shade"], b["shade"], b["shade"] + 8, 235))
    for win in scene["windows"]:
        lit = (math.sin(t * win["speed"] + win["offset"]) > 0) if win["blink"] else True
        if lit:
            odraw.rectangle([win["x"], win["y"], win["x"] + 4, win["y"] + 6], fill=(255, 210, 120, 220))
    base_rgba = base.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def build_fire_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    base_y = h * 0.85
    flames = [{
        "fx": rng.uniform(w * 0.25, w * 0.75),
        "fh": rng.uniform(h * 0.18, h * 0.32),
        "phase": rng.uniform(0, math.pi * 2),
        "speed": rng.uniform(2.5, 4.5),
        "jitter": rng.uniform(4, 10),
    } for _ in range(9)]
    particles = [{
        "x": rng.uniform(w * 0.2, w * 0.8),
        "speed": rng.uniform(20, 45),
        "r": rng.uniform(1, 2.5),
        "drift": rng.uniform(-6, 6),
        "offset": rng.uniform(0, 40),
    } for _ in range(_scaled_count(25, size))]
    return {"base_y": base_y, "flames": flames, "particles": particles}


def render_fire_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    w, h = base.size
    base_y = scene["base_y"]
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    colors = [(255, 200, 60, 210), (255, 120, 30, 200), (200, 40, 10, 190)]
    for f in scene["flames"]:
        fx = f["fx"] + f["jitter"] * math.sin(t * f["speed"] + f["phase"])
        fh = f["fh"] * (1 + 0.12 * math.sin(t * f["speed"] * 1.3 + f["phase"]))
        fw = fh * 0.45
        for i, col in enumerate(colors):
            scale = 1 - i * 0.28
            odraw.polygon(
                [
                    (fx, base_y),
                    (fx - fw * scale / 2, base_y - fh * scale * 0.55),
                    (fx, base_y - fh * scale),
                    (fx + fw * scale / 2, base_y - fh * scale * 0.55),
                ],
                fill=col,
            )
    top = h * 0.35
    rise_range = max(base_y - top, 1)
    for p in scene["particles"]:
        y = base_y - ((t * p["speed"] + p["offset"]) % rise_range)
        x = p["x"] + p["drift"] * math.sin(t * 1.5)
        fade = max(1 - (base_y - y) / rise_range, 0)
        odraw.ellipse([x - p["r"], y - p["r"], x + p["r"], y + p["r"]], fill=(255, 180, 80, int(180 * fade)))
    base_rgba = base.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def build_rain_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    drops = [{
        "x": rng.uniform(0, w),
        "y0": rng.uniform(0, h),
        "speed": rng.uniform(500, 900),
        "length": rng.uniform(14, 26),
        "alpha": rng.randint(80, 160),
    } for _ in range(_scaled_count(90, size))]
    return {"drops": drops}


def render_rain_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    h = base.size[1]
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for d in scene["drops"]:
        y = (d["y0"] + t * d["speed"]) % h
        odraw.line([(d["x"], y), (d["x"] - 4, y + d["length"])], fill=(200, 215, 230, d["alpha"]), width=2)
    base_rgba = base.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


def build_snow_scene(size: tuple[int, int], seed: int) -> dict:
    rng = random.Random(seed)
    w, h = size
    flakes = [{
        "x0": rng.uniform(0, w),
        "y0": rng.uniform(0, h),
        "speed": rng.uniform(30, 80),
        "r": rng.uniform(1.5, 3.5),
        "drift_amp": rng.uniform(8, 22),
        "drift_phase": rng.uniform(0, math.pi * 2),
    } for _ in range(_scaled_count(70, size))]
    return {"flakes": flakes}


def render_snow_frame(base: Image.Image, scene: dict, t: float) -> Image.Image:
    h = base.size[1]
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for f in scene["flakes"]:
        y = (f["y0"] + t * f["speed"]) % h
        x = f["x0"] + f["drift_amp"] * math.sin(t * 0.6 + f["drift_phase"])
        r = f["r"]
        odraw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 220))
    base_rgba = base.convert("RGBA")
    result = Image.alpha_composite(base_rgba, overlay).convert("RGB")
    base_rgba.close()
    overlay.close()
    return result


ANIMATED_SCENES = {
    "ocean": (build_ocean_scene, render_ocean_frame),
    "night": (build_night_scene, render_night_frame),
    "city": (build_city_scene, render_city_frame),
    "fire": (build_fire_scene, render_fire_frame),
    "rain": (build_rain_scene, render_rain_frame),
    "snow": (build_snow_scene, render_snow_frame),
}


def illustrate_rain(img: Image.Image, rng: random.Random) -> Image.Image:
    """Version statique (image unique) utilisée pour la carte de titre."""
    scene = build_rain_scene(img.size, rng.randint(0, 1_000_000))
    return render_rain_frame(img, scene, t=0.0)


def illustrate_snow(img: Image.Image, rng: random.Random) -> Image.Image:
    scene = build_snow_scene(img.size, rng.randint(0, 1_000_000))
    return render_snow_frame(img, scene, t=0.0)


ILLUSTRATORS = {
    "ocean": illustrate_ocean,
    "sunset": illustrate_sunset,
    "forest": illustrate_forest,
    "night": illustrate_night,
    "city": illustrate_city,
    "fire": illustrate_fire,
    "tech": illustrate_tech,
    "calm": illustrate_calm,
    "rain": illustrate_rain,
    "snow": illustrate_snow,
}


def draw_theme_illustration(img: Image.Image, theme: Optional[str], seed: int) -> Image.Image:
    """Point d'entrée : dessine un vrai contenu visuel (formes, silhouettes,
    éléments reconnaissables) par-dessus le dégradé, en fonction du thème
    détecté — sans aucune API ni image externe. Retombe sur une composition
    abstraite douce si aucun thème n'est reconnu, pour ne jamais laisser un
    fond totalement vide de contenu."""
    rng = random.Random(seed)
    fn = ILLUSTRATORS.get(theme, illustrate_abstract)
    return fn(img, rng)


# --------------------------------------------------------------------------- #
#  Images de fond (Pexels en option — plus nécessaire pour avoir du contenu)
# --------------------------------------------------------------------------- #

def fetch_pexels_background(scene_text: str, size: tuple[int, int], api_key: str, seed: int) -> Optional[Image.Image]:
    if requests is None:
        print("  (info) le paquet 'requests' n'est pas installé (pip install requests --break-system-packages) : "
              "impossible d'interroger Pexels, illustration locale utilisée à la place.")
        return None
    keywords = extract_keywords(scene_text, max_keywords=3)
    query = " ".join(keywords) if keywords else scene_text[:60]
    try:
        resp = requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": api_key},
            params={"query": query, "per_page": 5, "orientation": "portrait" if size[1] > size[0] else "landscape"},
            timeout=10,
        )
        resp.raise_for_status()
        photos = resp.json().get("photos") or []
        if not photos:
            print(f"  (info) aucune photo Pexels trouvée pour « {query} », illustration locale utilisée à la place.")
            return None
        photo = random.Random(seed).choice(photos)
        img_resp = requests.get(photo["src"]["large2x"], timeout=15)
        img_resp.raise_for_status()
        img = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
        result = crop_to_fill(img, size)
        if result is not img:
            img.close()
        print(f"  (info) photo Pexels trouvée pour « {query} ».")
        return result
    except Exception as exc:  # noqa: BLE001
        print(f"  (info) image Pexels indisponible pour « {query} » ({exc}), illustration locale utilisée à la place.")
        return None


def fetch_pexels_video_background(scene_text: str, size: tuple[int, int], api_key: str, seed: int,
                                   dest_dir: Path) -> Optional[Path]:
    """Cherche et télécharge une vraie VIDÉO libre de droits sur Pexels
    (contrairement à fetch_pexels_background qui ne récupère qu'une photo
    fixe). Retourne le chemin local du fichier .mp4 téléchargé dans
    `dest_dir`, ou None si aucune vidéo exploitable n'a été trouvée — dans
    ce cas l'appelant retombe sur une photo Pexels puis, en dernier
    recours, sur l'illustration procédurale."""
    if requests is None:
        print("  (info) le paquet 'requests' n'est pas installé (pip install requests --break-system-packages) : "
              "impossible d'interroger Pexels Vidéo, photo/illustration utilisée à la place.")
        return None
    keywords = extract_keywords(scene_text, max_keywords=3)
    query = " ".join(keywords) if keywords else scene_text[:60]
    orientation = "portrait" if size[1] > size[0] else "landscape"
    try:
        resp = requests.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": api_key},
            params={"query": query, "per_page": 6, "orientation": orientation},
            timeout=12,
        )
        resp.raise_for_status()
        videos = resp.json().get("videos") or []
        if not videos:
            print(f"  (info) aucune vidéo Pexels trouvée pour « {query} », photo/illustration utilisée à la place.")
            return None
        video = random.Random(seed).choice(videos)
        files = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("link")]
        if not files:
            print(f"  (info) vidéo Pexels trouvée pour « {query} » mais sans fichier mp4 exploitable, "
                  f"photo/illustration utilisée à la place.")
            return None
        target_w = size[0]
        # On préfère le plus petit fichier qui reste au moins aussi large
        # que la cible (assez de résolution sans télécharger un poids
        # inutilement lourd) ; à défaut, le plus large disponible.
        wide_enough = [f for f in files if (f.get("width") or 0) >= target_w]
        chosen = min(wide_enough, key=lambda f: f.get("width") or 0) if wide_enough else \
            max(files, key=lambda f: f.get("width") or 0)
        video_resp = requests.get(chosen["link"], timeout=30, stream=True)
        video_resp.raise_for_status()
        dest_path = dest_dir / f"pexels_video_{seed}.mp4"
        with open(dest_path, "wb") as fh:
            for chunk in video_resp.iter_content(chunk_size=1 << 16):
                if chunk:
                    fh.write(chunk)
        print(f"  (info) vraie vidéo Pexels téléchargée pour « {query} ».")
        return dest_path
    except Exception as exc:  # noqa: BLE001
        print(f"  (info) vidéo Pexels indisponible pour « {query} » ({exc}), photo/illustration utilisée à la place.")
        return None


def fetch_wikimedia_background(scene_text: str, size: tuple[int, int], seed: int) -> Optional[Image.Image]:
    """Recherche une vraie photo libre de droits sur Wikimedia Commons pour
    illustrer la scène — aucune clé API requise, contrairement à Pexels.
    Limite à connaître : la recherche plein texte de Commons est moins
    ciblée qu'un moteur d'images dédié (résultats parfois hors-sujet,
    scans de documents, cartes...), donc on filtre au moins les formats non
    photographiques (SVG) et on retombe sur l'illustration locale si aucun
    résultat exploitable n'est trouvé."""
    if requests is None:
        print("  (info) le paquet 'requests' n'est pas installé (pip install requests --break-system-packages) : "
              "impossible de chercher une photo sur Wikimedia Commons, illustration locale utilisée à la place.")
        return None
    keywords = extract_keywords(scene_text, max_keywords=3)
    query = " ".join(keywords) if keywords else scene_text[:60]
    target_w = min(max(size), 2000)
    try:
        resp = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrnamespace": 6,
                "gsrsearch": query,
                "gsrlimit": 12,
                "prop": "imageinfo",
                "iiprop": "url|mime",
                "iiurlwidth": target_w,
            },
            headers={"User-Agent": "video_generator.py/1.0 (usage personnel, script local)"},
            timeout=10,
        )
        resp.raise_for_status()
        pages = list(resp.json().get("query", {}).get("pages", {}).values())
        candidates = []
        for page in pages:
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            mime = info.get("mime", "")
            if not mime.startswith("image/") or mime == "image/svg+xml":
                continue
            url = info.get("thumburl") or info.get("url")
            if url:
                candidates.append(url)
        if not candidates:
            print(f"  (info) aucune photo exploitable trouvée sur Wikimedia Commons pour « {query} », "
                  f"illustration locale utilisée à la place.")
            return None
        url = random.Random(seed).choice(candidates)
        img_resp = requests.get(url, timeout=15, headers={"User-Agent": "video_generator.py/1.0"})
        img_resp.raise_for_status()
        img = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
        result = crop_to_fill(img, size)
        if result is not img:
            img.close()
        print(f"  (info) photo Wikimedia Commons trouvée pour « {query} ».")
        return result
    except Exception as exc:  # noqa: BLE001
        print(f"  (info) photo Wikimedia Commons indisponible pour « {query} » ({exc}), illustration locale utilisée à la place.")
        return None


def crop_to_fill(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    src_ratio = img.width / img.height
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        new_height = img.height
        new_width = int(new_height * target_ratio)
    else:
        new_width = img.width
        new_height = int(new_width / target_ratio)
    left = (img.width - new_width) // 2
    top = (img.height - new_height) // 2
    cropped = img.crop((left, top, left + new_width, top + new_height))
    result = cropped.resize(size, Image.LANCZOS)
    if result is not cropped:
        cropped.close()
    return result


# --------------------------------------------------------------------------- #
#  Sous-titres
# --------------------------------------------------------------------------- #

def draw_subtitle(img: Image.Image, text: str, highlight_words: Optional[set[str]] = None,
                   reveal_ratio: float = 1.0) -> Image.Image:
    """Dessine le sous-titre. `reveal_ratio` (0 à 1) contrôle la proportion
    de mots déjà visibles — utilisé pour faire apparaître le texte au fil
    de la voix off ("karaoke" simplifié) plutôt que d'un seul bloc figé.
    La mise en page (retour à ligne, centrage) est calculée sur le texte
    complet pour que rien ne bouge pendant la révélation ; seuls les mots
    pas encore "prononcés" restent invisibles."""
    highlight_words = highlight_words or set()
    img = img.copy()
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    font = load_font(max(28, w // 22))

    band_height = int(h * 0.22)
    draw.rectangle([0, h - band_height, w, h], fill=(0, 0, 0, 140))

    words = text.split()
    lines, current = [], ""
    max_width = w * 0.86
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    total_words = sum(len(line.split()) for line in lines) or 1
    reveal_count = total_words if reveal_ratio >= 1.0 else max(1, math.ceil(reveal_ratio * total_words))

    line_height = font.size + 10
    total_height = line_height * len(lines)
    y = h - band_height + (band_height - total_height) // 2
    space_width = draw.textlength(" ", font=font)

    global_idx = 0
    for line in lines:
        line_words = line.split()
        word_widths = [draw.textlength(word, font=font) for word in line_words]
        line_width = sum(word_widths) + space_width * max(len(line_words) - 1, 0)
        x = (w - line_width) / 2
        for word, word_w in zip(line_words, word_widths):
            if global_idx < reveal_count:
                clean = word.strip(",.!?;:\"'()«»").lower()
                color = ACCENT_COLOR if clean in highlight_words else (255, 255, 255, 255)
                # Contour net (stroke) plutôt qu'une ombre décalée d'un
                # pixel : reste lisible sur n'importe quel fond, y compris
                # les fonds clairs/animés, et rend mieux une fois lissé
                # par le downscale du supersampling.
                draw.text((x, y), word, font=font, fill=color,
                          stroke_width=max(2, font.size // 18), stroke_fill=(0, 0, 0, 210))
            global_idx += 1
            x += word_w + space_width
        y += line_height

    return img


def apply_style(img: Image.Image, style: str) -> Image.Image:
    cfg = STYLE_ADJUSTMENTS.get(style, STYLE_ADJUSTMENTS["realistic"])
    if cfg["saturation"] != 1.0:
        enhanced = ImageEnhance.Color(img).enhance(cfg["saturation"])
        if enhanced is not img:
            img.close()
        img = enhanced
    if cfg["contrast"] != 1.0:
        enhanced = ImageEnhance.Contrast(img).enhance(cfg["contrast"])
        if enhanced is not img:
            img.close()
        img = enhanced
    if cfg["posterize"]:
        posterized = ImageOps.posterize(img.convert("RGB"), cfg["posterize"])
        if posterized is not img:
            img.close()
        img = posterized
    if cfg["letterbox"]:
        img = img.copy()
        w, h = img.size
        bar = int(h * 0.06)
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, w, bar], fill=(0, 0, 0))
        draw.rectangle([0, h - bar, w, h], fill=(0, 0, 0))
    return img


def ease_in_out(x: float) -> float:
    """Easing sinusoïdal : démarre et termine en douceur (0 en x=0, 1 en
    x=1) au lieu d'une progression linéaire — un zoom qui accélère puis
    ralentit paraît nettement plus naturel qu'un zoom à vitesse constante."""
    x = min(max(x, 0.0), 1.0)
    return (1 - math.cos(math.pi * x)) / 2


def apply_camera_motion(clip, duration: float, zoom_amount: float, rng: random.Random):
    """Applique un léger zoom avec accélération/décélération douce, et
    tire aléatoirement le sens (avant ou arrière) pour éviter que toutes
    les scènes zooment identiquement."""
    zoom_in = rng.random() < 0.6

    def factor(t):
        e = ease_in_out(t / max(duration, 0.01))
        return 1 + zoom_amount * e if zoom_in else 1 + zoom_amount - zoom_amount * e

    return clip.resize(factor).set_position("center")


# --------------------------------------------------------------------------- #
#  Carte de titre d'intro
# --------------------------------------------------------------------------- #

def build_title_text(description: str, max_words: int = 4) -> str:
    keywords = extract_keywords(description, max_keywords=max_words)
    if not keywords:
        return description.strip()[:40]
    return " ".join(w.capitalize() for w in keywords)


def draw_title_card(size: tuple[int, int], title: str, theme: Optional[str], seed: int) -> Image.Image:
    palette = theme_palette(theme, fallback_index=0)
    base = make_gradient_background(size, palette)
    img = draw_theme_illustration(base, theme, seed)
    if img is not base:
        base.close()

    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    font = load_font(max(40, w // 13))

    words = title.split()
    lines, current = [], ""
    max_width = w * 0.8
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_height = font.size + 16
    total_height = line_height * len(lines)
    y = (h - total_height) / 2
    for line in lines:
        line_width = draw.textlength(line, font=font)
        x = (w - line_width) / 2
        # ombre portée pour la lisibilité par-dessus l'illustration
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255),
                  stroke_width=max(3, font.size // 16), stroke_fill=(0, 0, 0, 210))
        y += line_height

    return img


def build_title_clip(description: str, size: tuple[int, int], duration: float = 1.8):
    title = build_title_text(description)
    theme = detect_theme(description)
    render_size = (size[0] * SS_FACTOR, size[1] * SS_FACTOR)
    frame_hq = draw_title_card(render_size, title, theme, seed=0)
    frame = frame_hq.resize(size, Image.LANCZOS)  # downscale = anti-aliasing gratuit
    frame_hq.close()
    clip = ImageClip(np.array(frame)).set_duration(duration)
    frame.close()
    return apply_camera_motion(clip, duration, zoom_amount=0.04, rng=random.Random(0))


# --------------------------------------------------------------------------- #
#  Voix off — 100% hors-ligne par défaut (pyttsx3), gTTS en option
# --------------------------------------------------------------------------- #

def synthesize_voiceover(text: str, lang: str, out_path: Path, engine: str = "pyttsx3") -> float:
    """Génère la voix off. `engine="pyttsx3"` (par défaut) est totalement
    hors-ligne — aucun appel réseau, aucune clé API. `engine="gtts"` utilise
    l'API Google Translate en coulisses (nécessite internet) mais offre
    parfois une voix plus naturelle."""
    if engine == "pyttsx3":
        if pyttsx3 is None:
            print("  (info) pyttsx3 indisponible, bascule sur gTTS (nécessite internet).")
            engine = "gtts"
        else:
            wav_path = out_path.with_suffix(".wav")
            try:
                tts_engine = pyttsx3.init()
                _configure_pyttsx3_voice(tts_engine, lang)
                tts_engine.save_to_file(text, str(wav_path))
                tts_engine.runAndWait()
                if wav_path.exists() and wav_path.stat().st_size > 0:
                    with AudioFileClip(str(wav_path)) as clip:
                        duration = clip.duration
                    if out_path != wav_path:
                        out_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(wav_path), str(out_path.with_suffix(".wav")))
                    return duration
            except Exception as exc:  # noqa: BLE001
                print(f"  (info) échec pyttsx3 ({exc}), bascule sur gTTS.")
            engine = "gtts"

    if engine == "gtts":
        if gTTS is None:
            raise RuntimeError(
                "Aucun moteur de voix off disponible. Installez pyttsx3 (hors-ligne) "
                "ou gTTS (en ligne) : pip install pyttsx3 --break-system-packages"
            )
        tts = gTTS(text=text, lang=lang)
        tts.save(str(out_path))
        with AudioFileClip(str(out_path)) as clip:
            return clip.duration

    raise ValueError(f"Moteur de voix off inconnu : {engine}")


def _configure_pyttsx3_voice(tts_engine, lang: str):
    """Essaie de sélectionner une voix correspondant à la langue demandée
    parmi celles installées localement (espeak). Se contente de la voix
    par défaut si aucune correspondance n'est trouvée — ne bloque jamais."""
    try:
        voices = tts_engine.getProperty("voices")
        for voice in voices:
            voice_id = (voice.id or "").lower()
            langs = [str(l).lower() for l in (getattr(voice, "languages", None) or [])]
            if lang.lower() in voice_id or any(lang.lower() in l for l in langs):
                tts_engine.setProperty("voice", voice.id)
                return
    except Exception:
        pass  # on garde la voix par défaut du moteur


# --------------------------------------------------------------------------- #
#  Construction des clips
# --------------------------------------------------------------------------- #

@dataclass
class SceneAssets:
    text: str
    audio_path: Path
    duration: float


def _fit_video_to_size(video_clip, size: tuple[int, int]):
    """Redimensionne et recadre une vraie vidéo (Pexels) pour remplir
    exactement `size`, comme crop_to_fill() le fait pour une image fixe.
    Un léger sur-redimensionnement (x1.002) absorbe les arrondis de pixels
    et évite que crop() échoue en demandant une zone légèrement plus
    grande que le clip redimensionné."""
    target_w, target_h = size
    src_ratio = video_clip.w / video_clip.h
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        scale = (target_h / video_clip.h) * 1.002
    else:
        scale = (target_w / video_clip.w) * 1.002
    resized = video_clip.resize(scale)
    return crop(resized, width=target_w, height=target_h, x_center=resized.w / 2, y_center=resized.h / 2)


def _overlay_subtitles_on_video(video_clip, scene_text: str, keywords: set[str], duration: float, style: str):
    """Superpose les sous-titres en révélation progressive et le style
    visuel sur chaque frame d'une vraie vidéo (Pexels), en réutilisant les
    mêmes fonctions (draw_subtitle, apply_style) que pour les fonds
    procéduraux/photos. `.fl()` donne accès à la fois à la fonction de
    lecture de frame et à l'instant t, nécessaire pour la révélation
    progressive du texte au fil de la voix off."""
    def process(get_frame, t):
        frame = get_frame(t)
        img = Image.fromarray(frame)
        reveal_ratio = min(1.0, (t + 0.2) / max(duration, 0.01))
        subtitled = draw_subtitle(img, scene_text, highlight_words=keywords, reveal_ratio=reveal_ratio)
        styled = apply_style(subtitled, style)
        if styled is not subtitled:
            subtitled.close()
        arr = np.array(styled)
        styled.close()
        return arr

    return video_clip.fl(process)


def build_scene_clip(scene_text: str, index: int, size: tuple[int, int], audio_path: Path,
                      duration: float, pexels_key: Optional[str], style: str, image_source: str = "pexels-video",
                      work_dir: Optional[Path] = None):
    """Construit le clip d'une scène. Le fond peut venir de quatre sources,
    par ordre de priorité :
      1. Vraie VIDÉO Pexels (--images pexels-video, défaut, + --pexels-key
         fourni) — le contenu le plus réaliste, une vidéo qui bouge
         vraiment (pas une animation procédurale).
      2. Photo Pexels (repli automatique si aucune vidéo n'est trouvée, ou
         si --pexels-key est fourni avec un autre --images).
      3. Wikimedia Commons (--images wikimedia, sans clé) — vraies photos
         libres de droits, aucune clé requise.
      4. Illustration procédurale locale (--images procedural) — 100%
         hors-ligne, animée pour les thèmes ocean/night/city/fire/rain/
         snow.
    Dans tous les cas, si la source choisie échoue (pas de réseau, aucun
    résultat), on retombe automatiquement sur l'étape suivante pour ne
    jamais laisser une scène sans fond.

    Correction mémoire : make_frame() crée systématiquement des images
    temporaires à chaque appel (une par frame vidéo, plusieurs dizaines
    par scène) ; chacune est explicitement fermée dès qu'elle n'est plus
    nécessaire, immédiatement après la conversion en tableau numpy renvoyé
    à moviepy. Sans cela, ces objets PIL restaient référencés jusqu'au
    passage du garbage collector et s'accumulaient sur toute la durée du
    rendu, provoquant le MemoryError observé."""
    theme = detect_theme(scene_text)
    keywords = set(extract_keywords(scene_text, max_keywords=2))
    rng = random.Random(index)

    # audio_path peut avoir été enregistré en .wav par pyttsx3 : on
    # retrouve le bon fichier existant plutôt que de supposer l'extension.
    real_audio_path = audio_path if audio_path.exists() else audio_path.with_suffix(".wav")

    # -- 1. Vraie vidéo Pexels -------------------------------------------
    # Testée en premier si demandée : c'est la source la plus réaliste.
    # Nécessite un dossier de travail persistant (work_dir) pour stocker le
    # fichier .mp4 téléchargé — il ne sera lu qu'au moment de l'écriture
    # finale de la vidéo par moviepy, donc il doit survivre jusque-là (il
    # est nettoyé avec le reste de work_dir à la fin de generate_video).
    if image_source == "pexels-video" and pexels_key and work_dir is not None:
        video_path = fetch_pexels_video_background(scene_text, size, pexels_key, seed=index, dest_dir=work_dir)
        if video_path is not None:
            raw_clip = VideoFileClip(str(video_path)).without_audio()
            fitted = _fit_video_to_size(raw_clip, size)
            if fitted.duration >= duration:
                max_start = max(fitted.duration - duration, 0)
                start = rng.uniform(0, max_start) if max_start > 0 else 0
                trimmed = fitted.subclip(start, start + duration)
            else:
                trimmed = vfx_loop(fitted, duration=duration)
            subtitled_clip = _overlay_subtitles_on_video(trimmed, scene_text, keywords, duration, style)
            # Zoom plus discret que pour les fonds statiques : la vidéo a
            # déjà son propre mouvement de caméra réel, inutile d'en
            # rajouter beaucoup par-dessus.
            zoom_amount = STYLE_ADJUSTMENTS.get(style, STYLE_ADJUSTMENTS["realistic"])["zoom"] * 0.5
            clip = apply_camera_motion(subtitled_clip, duration, zoom_amount, rng)
            audio_clip = AudioFileClip(str(real_audio_path))
            return clip.set_audio(audio_clip)
        # Aucune vidéo trouvée : on continue vers les sources image ci-dessous.

    # -- 2/3/4. Photo Pexels, Wikimedia, ou illustration procédurale ------
    # Toute la scène (fond, illustration, animation, sous-titres) est
    # dessinée à SS_FACTOR fois la résolution finale, puis réduite en fin
    # de make_frame() : c'est le levier de qualité le plus efficace, les
    # bords de formes et le texte sortent nets au lieu de crénelés.
    render_size = (size[0] * SS_FACTOR, size[1] * SS_FACTOR)

    real_bg = None
    if pexels_key:
        real_bg = fetch_pexels_background(scene_text, render_size, pexels_key, seed=index)
    elif image_source == "wikimedia":
        real_bg = fetch_wikimedia_background(scene_text, render_size, seed=index)

    if real_bg is not None:
        base = real_bg
        render_bg = None  # fond fixe (vraie photo)
    elif theme in ANIMATED_SCENES:
        palette = theme_palette(theme, fallback_index=index)
        base = make_gradient_background(render_size, palette)
        build_fn, render_fn = ANIMATED_SCENES[theme]
        scene_data = build_fn(render_size, index)
        render_bg = lambda t: render_fn(base, scene_data, t)  # noqa: E731
    else:
        palette = theme_palette(theme, fallback_index=index)
        gradient = make_gradient_background(render_size, palette)
        base = draw_theme_illustration(gradient, theme, seed=index)
        if base is not gradient:
            gradient.close()
        render_bg = None

    def make_frame(t):
        frame_img = render_bg(t) if render_bg else base
        reveal_ratio = min(1.0, (t + 0.2) / max(duration, 0.01))  # léger temps d'avance sur la voix
        subtitled = draw_subtitle(frame_img, scene_text, highlight_words=keywords, reveal_ratio=reveal_ratio)
        if render_bg and subtitled is not frame_img:
            frame_img.close()  # frame animée temporaire, propre au tirage courant
        styled = apply_style(subtitled, style)
        if styled is not subtitled:
            subtitled.close()
        # Réduction finale de render_size -> size : c'est ici que le
        # supersampling lisse les bords, courbes et texte. LANCZOS donne
        # le meilleur compromis netteté/absence d'artefacts pour ce cas.
        final_img = styled.resize(size, Image.LANCZOS)
        styled.close()
        arr = np.array(final_img)
        final_img.close()
        return arr

    clip = VideoClip(make_frame, duration=duration)

    zoom_amount = STYLE_ADJUSTMENTS.get(style, STYLE_ADJUSTMENTS["realistic"])["zoom"]
    clip = apply_camera_motion(clip, duration, zoom_amount, rng)

    audio_clip = AudioFileClip(str(real_audio_path))
    clip = clip.set_audio(audio_clip)
    return clip


# --------------------------------------------------------------------------- #
#  Programme principal
# --------------------------------------------------------------------------- #

def parse_resolution(value: str) -> tuple[int, int]:
    try:
        w, h = value.lower().split("x")
        return int(w), int(h)
    except Exception:
        raise argparse.ArgumentTypeError("Le format attendu est LARGEURxHAUTEUR, ex: 1080x1920")


def generate_video(
    description: str,
    output: Path,
    lang: str,
    size: tuple[int, int],
    pexels_key: Optional[str],
    music_path: Optional[Path],
    style: str = "realistic",
    tts_engine: str = "pyttsx3",
    target_duration: Optional[float] = None,
    progress_cb: Optional[Callable[[int], None]] = None,
    include_title_card: bool = True,
    crossfade_duration: float = 0.35,
    image_source: str = "pexels-video",
) -> None:
    scenes = split_into_scenes(description)
    print(f"→ {len(scenes)} scène(s) détectée(s) dans la description.")

    def report(pct: float):
        if progress_cb:
            try:
                progress_cb(min(max(int(pct), 0), 99))
            except Exception:
                pass

    work_dir = Path(tempfile.mkdtemp(prefix="videogen_"))
    clips = []
    total_duration = 0.0

    try:
        if include_title_card:
            print("→ Carte de titre d'intro (illustration locale)…")
            clips.append(build_title_clip(description, size))

        for i, scene_text in enumerate(scenes, start=1):
            if target_duration and total_duration >= target_duration:
                print(f"  Budget de durée ({target_duration}s) atteint, scène(s) restante(s) ignorée(s).")
                break

            print(f"[{i}/{len(scenes)}] Voix off : « {scene_text[:60]}{'…' if len(scene_text) > 60 else ''} »")
            audio_path = work_dir / f"scene_{i}.mp3"
            duration = synthesize_voiceover(scene_text, lang, audio_path, engine=tts_engine)
            duration = max(duration, 1.5)

            theme = detect_theme(scene_text) or "abstrait"
            if image_source == "pexels-video" and pexels_key:
                source_label = "vraie vidéo Pexels"
            elif pexels_key:
                source_label = "photo Pexels"
            elif image_source == "wikimedia":
                source_label = "photo Wikimedia"
            else:
                source_label = "illustration locale"
            print(f"    Fond : {source_label} (thème détecté : {theme}), durée {duration:.1f}s…")
            clip = build_scene_clip(scene_text, i, size, audio_path, duration, pexels_key, style, image_source, work_dir)
            clips.append(clip)
            total_duration += duration
            report(10 + (i / len(scenes)) * 70)

        if not clips:
            raise RuntimeError("Aucune scène n'a pu être générée à partir de la description.")

        print("→ Assemblage de la vidéo finale (avec fondus enchaînés)…")
        if crossfade_duration > 0 and len(clips) > 1:
            clips = [clips[0]] + [c.crossfadein(crossfade_duration) for c in clips[1:]]
            final = concatenate_videoclips(clips, method="compose", padding=-crossfade_duration)
        else:
            final = concatenate_videoclips(clips, method="compose")
        report(85)

        if music_path and Path(music_path).exists():
            print("→ Ajout de la musique de fond…")
            bg_music = AudioFileClip(str(music_path)).volumex(0.15)
            if bg_music.duration < final.duration:
                bg_music = audio_loop(bg_music, duration=final.duration)
            else:
                bg_music = bg_music.set_duration(final.duration)
            final_audio = CompositeAudioClip([final.audio, bg_music])
            final = final.set_audio(final_audio)

        # Le zoom de caméra agrandit légèrement le canevas de composition
        # (concatenate_videoclips(method="compose") dimensionne le canevas
        # sur le plus grand frame rencontré) : on recadre au centre pour
        # retomber exactement sur la résolution demandée, sinon le fichier
        # de sortie ne correspond pas au --resolution passé en argument.
        if (final.w, final.h) != size:
            final = crop(
                final,
                width=size[0], height=size[1],
                x_center=final.w / 2, y_center=final.h / 2,
            )

        output.parent.mkdir(parents=True, exist_ok=True)
        # preset="slow" + crf=18 : encodage plus lent mais nettement plus
        # fidèle (crf 18 est considéré visuellement quasi sans perte pour
        # h264) qu'avec les réglages par défaut de moviepy. pix_fmt
        # yuv420p garantit la compatibilité de lecture la plus large
        # (réseaux sociaux, lecteurs mobiles...).
        final.write_videofile(
            str(output),
            fps=30,
            codec="libx264",
            audio_codec="aac",
            audio_bitrate="192k",
            preset="slow",
            ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
            logger=None,
        )
        report(99)

        for clip in clips:
            clip.close()
        final.close()
        print(f"\n✅ Vidéo générée : {output}")

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Génère une vidéo à partir d'une description textuelle (sans API, contenu illustré localement).")
    parser.add_argument("description", help="Description de la vidéo à générer (texte libre).")
    parser.add_argument("--output", "-o", default="output.mp4", help="Chemin du fichier vidéo de sortie.")
    parser.add_argument("--voice", default="fr", help="Code langue pour la voix off (fr, en, es, ...).")
    parser.add_argument("--tts-engine", default="pyttsx3", choices=["pyttsx3", "gtts"],
                         help="Moteur de voix off : pyttsx3 = 100%% hors-ligne (défaut), gtts = en ligne, voix parfois plus naturelle.")
    parser.add_argument("--resolution", type=parse_resolution, default="720x1280",
                         help="Résolution LARGEURxHAUTEUR (défaut: 720x1280, format portrait/Shorts).")
    parser.add_argument("--style", default="realistic", choices=list(STYLE_ADJUSTMENTS),
                         help="Style visuel appliqué au fond.")
    parser.add_argument("--target-duration", type=float, default=None,
                         help="Durée cible en secondes (approximative).")
    parser.add_argument("--images", default="pexels-video", choices=["procedural", "wikimedia", "pexels-video"],
                         help="Source du fond : 'pexels-video' (défaut) = vraie VIDÉO Pexels qui bouge "
                              "réellement pour chaque scène (nécessite --pexels-key, ou la variable "
                              "d'environnement PEXELS_API_KEY) ; 'wikimedia' = vraies photos libres de droits "
                              "cherchées sur Wikimedia Commons (aucune clé requise) ; 'procedural' = "
                              "illustration locale animée générée, 100%% hors-ligne, aucune vraie "
                              "photo/vidéo. Dans tous les cas, en l'absence de clé Pexels ou si rien n'est "
                              "trouvé, le script retombe automatiquement sur l'étape suivante (vidéo -> photo "
                              "Pexels -> Wikimedia/procédural) plutôt que d'échouer.")
    parser.add_argument("--pexels-key", default=os.environ.get("PEXELS_API_KEY", DEFAULT_PEXELS_KEY),
                         help="Clé API Pexels (gratuite sur pexels.com/api), utilisée pour les vraies vidéos "
                              "(--images pexels-video, défaut) et les photos. Une clé par défaut est déjà "
                              "intégrée dans le script pour un usage immédiat sans configuration ; la variable "
                              "d'environnement PEXELS_API_KEY ou cette option restent prioritaires si tu "
                              "préfères utiliser ta propre clé.")
    parser.add_argument("--music", default=None, help="Chemin vers un fichier audio de musique de fond (facultatif).")
    parser.add_argument("--no-title-card", action="store_true", help="Désactive la carte de titre d'intro.")
    parser.add_argument("--crossfade", type=float, default=0.35, help="Durée du fondu enchaîné entre scènes (0 pour désactiver).")

    args = parser.parse_args()

    generate_video(
        description=args.description,
        output=Path(args.output),
        lang=args.voice,
        size=args.resolution,
        pexels_key=args.pexels_key,
        music_path=Path(args.music) if args.music else None,
        style=args.style,
        tts_engine=args.tts_engine,
        target_duration=args.target_duration,
        include_title_card=not args.no_title_card,
        crossfade_duration=args.crossfade,
        image_source=args.images,
    )


if __name__ == "__main__":
    main()