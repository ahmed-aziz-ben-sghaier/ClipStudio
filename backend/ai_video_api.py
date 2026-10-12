"""
ai_video_api.py
================

Microservice FastAPI qui expose video_generator.py comme backend pour le
bouton "Générer avec l'IA" de VideoEditor.jsx.

Contrat respecté (celui déjà attendu par le composant React, tel qu'il
appelle api.generateAiVideo / api.getAiGenerationStatus) :

    POST /ai/generate            -> {"jobId": "..."}
    GET  /ai/generate/{id}/status -> {"status": "processing"|"completed"|"failed",
                                       "progress": 0-100,
                                       "videoUrl": "...",       # si completed
                                       "errorMessage": "..."}   # si failed
    GET  /ai/generate/{id}/video -> le fichier .mp4

La génération tourne dans un thread d'arrière-plan (FastAPI BackgroundTasks
exécute automatiquement les fonctions synchrones dans un threadpool, donc
ça ne bloque pas les autres requêtes) pendant que le frontend interroge
/status toutes les 2.5s, exactement comme le fait déjà pollAiJob() côté React.

Ce que corrige cette version par rapport à la précédente
----------------------------------------------------------
video_generator.py a évolué : il sait maintenant chercher automatiquement
de vraies vidéos/photos Pexels (et a une clé Pexels par défaut intégrée,
DEFAULT_PEXELS_KEY, utilisée si aucune n'est fournie). Mais ce microservice
appelle generate_video() directement (pas via la ligne de commande), donc
il ne profitait pas de ce nouveau défaut :
    - pexels_key=os.environ.get("PEXELS_API_KEY") valait None si la
      variable d'environnement n'était pas définie -> jamais de vraie
      vidéo/photo Pexels via l'API, contrairement au script en ligne de
      commande. Corrigé en import ant DEFAULT_PEXELS_KEY comme repli.
    - image_source n'était jamais transmis à generate_video() -> ajouté
      comme champ de la requête (imageSource), exposé au frontend, avec
      "pexels-video" par défaut pour rester cohérent avec le script.

Limites honnêtes :
    - Le stockage des jobs est en mémoire (dict Python) : un redémarrage du
      serveur perd les jobs en cours. Suffisant pour un usage local/dev,
      pas pour de la prod multi-instance (il faudrait Redis ou une base).
    - Aucune authentification ici : n'importe qui joignant ce service peut
      lancer une génération. Le contrôle des crédits vu dans VideoEditor.jsx
      reste géré côté client (donc contournable) — si les crédits doivent
      être appliqués de façon fiable, ce service doit être appelé par TON
      backend principal (qui gère l'auth/les crédits), pas directement
      depuis le navigateur.
    - gTTS a besoin d'internet ; ce service n'est donc pas 100% local.
    - La clé Pexels par défaut (DEFAULT_PEXELS_KEY, définie dans
      video_generator.py) est utilisée si PEXELS_API_KEY n'est pas définie
      dans l'environnement. Pratique pour démarrer sans configuration,
      mais à retirer/remplacer avant tout partage public du code (voir
      l'avertissement de sécurité dans video_generator.py).

Lancement :
    pip install fastapi "uvicorn[standard]" moviepy gTTS pillow requests numpy --break-system-packages
    uvicorn ai_video_api:app --reload --port 8001
"""

import os
import threading
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from video_generator import DEFAULT_PEXELS_KEY, STYLE_ADJUSTMENTS, generate_video

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # origine du frontend Vite — adapte si besoin
    allow_methods=["*"],
    allow_headers=["*"],
)

# Port volontairement différent de 8000 : évite un conflit si tu as aussi le
# backend du projet de clipping (ViralGenerator) qui tourne sur 8000.
BACKEND_BASE_URL = os.environ.get("AI_VIDEO_BASE_URL", "http://localhost:8001")

# Clé Pexels effective pour ce service : priorité à la variable
# d'environnement PEXELS_API_KEY si définie, sinon repli sur la même clé
# par défaut que le script en ligne de commande (DEFAULT_PEXELS_KEY),
# pour un comportement identique entre `python video_generator.py ...` et
# ce microservice.
EFFECTIVE_PEXELS_KEY = os.environ.get("PEXELS_API_KEY", DEFAULT_PEXELS_KEY)

JOBS_DIR = Path(__file__).parent / "ai_jobs"
JOBS_DIR.mkdir(exist_ok=True)

RATIO_TO_SIZE = {
    "vertical": (720, 1280),
    "square": (1080, 1080),
    "landscape": (1280, 720),
}

# Sources de fond acceptées côté API, alignées sur --images dans
# video_generator.py. "pexels-video" est le défaut : vraie vidéo Pexels
# qui bouge réellement, avec repli automatique (vidéo -> photo Pexels ->
# Wikimedia/procédural) déjà géré à l'intérieur de generate_video().
VALID_IMAGE_SOURCES = {"pexels-video", "wikimedia", "procedural"}

# AI_JOBS est un simple dict en mémoire — protégé par un verrou car
# BackgroundTasks exécute les jobs dans des threads séparés du thread
# principal qui répond aux requêtes /status.
AI_JOBS: dict[str, dict] = {}
_jobs_lock = threading.Lock()


class AiGenerateRequest(BaseModel):
    prompt: str
    style: str = "realistic"
    duration: int = 10  # secondes, cible approximative (cf. target_duration dans video_generator)
    ratio: str = "vertical"
    imageSource: str = "pexels-video"  # "pexels-video" | "wikimedia" | "procedural"


def _update_job(job_id: str, **fields):
    with _jobs_lock:
        if job_id in AI_JOBS:
            AI_JOBS[job_id].update(fields)


def _run_generation_job(job_id: str, req: AiGenerateRequest):
    try:
        size = RATIO_TO_SIZE[req.ratio]
        style = req.style if req.style in STYLE_ADJUSTMENTS else "realistic"
        image_source = req.imageSource if req.imageSource in VALID_IMAGE_SOURCES else "pexels-video"
        output_path = JOBS_DIR / f"{job_id}.mp4"

        generate_video(
            description=req.prompt,
            output=output_path,
            lang="fr",
            size=size,
            pexels_key=EFFECTIVE_PEXELS_KEY,
            music_path=None,
            style=style,
            target_duration=float(req.duration),
            progress_cb=lambda pct: _update_job(job_id, progress=pct),
            image_source=image_source,
        )
        _update_job(job_id, status="completed", progress=100)

    except Exception as exc:  # noqa: BLE001 - on veut capturer toute erreur pour la remonter au frontend
        _update_job(job_id, status="failed", error=str(exc))


@app.post("/ai/generate")
async def ai_generate(req: AiGenerateRequest, background_tasks: BackgroundTasks):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="La description ne peut pas être vide.")
    if req.ratio not in RATIO_TO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Format '{req.ratio}' inconnu. Choix possibles : {', '.join(RATIO_TO_SIZE)}.",
        )
    if req.duration <= 0:
        raise HTTPException(status_code=400, detail="La durée doit être positive.")
    if req.imageSource not in VALID_IMAGE_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Source d'image '{req.imageSource}' inconnue. Choix possibles : {', '.join(VALID_IMAGE_SOURCES)}.",
        )

    job_id = str(uuid.uuid4())
    with _jobs_lock:
        AI_JOBS[job_id] = {"status": "processing", "progress": 0, "error": None}

    background_tasks.add_task(_run_generation_job, job_id, req)
    return {"jobId": job_id}


@app.get("/ai/generate/{job_id}/status")
async def ai_status(job_id: str):
    job = AI_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable (identifiant invalide ou serveur redémarré).")

    response = {"status": job["status"], "progress": job["progress"]}
    if job["status"] == "completed":
        # URL absolue : le frontend (localhost:5173) et ce service
        # (localhost:8001) sont sur des origines différentes, une URL
        # relative résoudrait sur le mauvais port.
        response["videoUrl"] = f"{BACKEND_BASE_URL}/ai/generate/{job_id}/video"
    if job["status"] == "failed":
        response["errorMessage"] = job.get("error") or "La génération a échoué pour une raison inconnue."
    return response


@app.get("/ai/generate/{job_id}/video")
async def ai_video(job_id: str):
    job = AI_JOBS.get(job_id)
    if not job or job["status"] != "completed":
        raise HTTPException(status_code=404, detail="Vidéo indisponible (génération non terminée ou échouée).")
    video_path = JOBS_DIR / f"{job_id}.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Fichier vidéo manquant sur le serveur.")
    return FileResponse(video_path, media_type="video/mp4", filename=f"generation-ia-{job_id[:8]}.mp4")


@app.delete("/ai/generate/{job_id}")
async def ai_delete(job_id: str):
    """Permet de libérer le disque une fois la vidéo récupérée par le frontend."""
    with _jobs_lock:
        AI_JOBS.pop(job_id, None)
    video_path = JOBS_DIR / f"{job_id}.mp4"
    if video_path.exists():
        video_path.unlink()
    return {"deleted": job_id}