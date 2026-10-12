"""
routes_video_summary.py
========================

Router FastAPI qui génère une VRAIE vidéo résumé (et pas seulement un
texte) : reçoit la vidéo originale + la liste des segments-clés déjà
calculés par POST /summarize (champ "clips" de la réponse), découpe et
concatène ces segments avec video_clipper.py, et renvoie le fichier .mp4
résultant.

Flux complet côté frontend :
    1. POST /transcribe   (déjà existant)      -> chunks horodatés
    2. POST /summarize    (déjà existant)      -> summary, key_points, clips, stats
    3. POST /summarize-video (ce fichier)      -> fichier vidéo résumé, en
       renvoyant le même fichier vidéo original + le champ "clips" reçu
       à l'étape 2.

Branché dans app.py :
    from routes_video_summary import router as video_summary_router
    app.include_router(video_summary_router)
"""

from __future__ import annotations

import json
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from video_clipper import build_summary_video

router = APIRouter()

# Répertoire temporaire dédié : évite de polluer /tmp et permet un nettoyage
# ciblé. Chaque requête a son propre sous-préfixe (job_id) pour ne jamais
# mélanger les fichiers de deux utilisateurs simultanés.
OUTPUT_DIR = Path(tempfile.gettempdir()) / "clipping-app-video-summaries"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/summarize-video")
async def summarize_video(
    file: UploadFile = File(...),
    clips: str = Form(...),           # JSON : [{"start": float, "end": float, "text": str}, ...]
    padding: float = Form(0.3),
    crossfade: float = Form(0.25),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier vidéo fourni.")

    try:
        parsed_clips = json.loads(clips)
        if not isinstance(parsed_clips, list) or not parsed_clips:
            raise ValueError("liste vide")
        for c in parsed_clips:
            if "start" not in c or "end" not in c:
                raise ValueError("chaque clip doit avoir 'start' et 'end'")
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Le champ 'clips' doit être une liste JSON non vide de {{start, end}} ({exc}).",
        )

    job_id = uuid.uuid4().hex
    suffix = Path(file.filename).suffix or ".mp4"
    source_path = OUTPUT_DIR / f"{job_id}_source{suffix}"
    output_path = OUTPUT_DIR / f"{job_id}_summary.mp4"

    try:
        with source_path.open("wb") as f:
            f.write(await file.read())

        build_summary_video(
            source_path=source_path,
            clips=parsed_clips,
            output_path=output_path,
            padding=padding,
            crossfade=crossfade,
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="La génération de la vidéo résumé a échoué.")

        # Le fichier source n'est plus utile une fois le rendu terminé ;
        # le fichier de sortie, lui, doit survivre le temps d'être
        # transmis au client — nettoyé après l'envoi via BackgroundTask.
        source_path.unlink(missing_ok=True)

        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename="resume.mp4",
            background=BackgroundTask(lambda: output_path.unlink(missing_ok=True)),
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Erreur pendant la génération de la vidéo résumé : {exc}")
    finally:
        source_path.unlink(missing_ok=True)