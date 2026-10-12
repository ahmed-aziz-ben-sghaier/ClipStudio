"""
routes_summarize.py
====================

Router FastAPI pour le résumé de vidéo. Fichier autonome : branché dans
app.py via :

    from routes_summarize import router as summarize_router
    app.include_router(summarize_router)

Ne redéfinit AUCUN des modèles Pydantic existants pour /transcribe —
réutilise directement les `chunks` que le frontend a déjà en mémoire depuis
l'étape de transcription, exactement comme le fait /analyze.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from summarizer import summarize_transcript

router = APIRouter()


class TranscriptChunk(BaseModel):
    text: str
    start: float
    end: float


class SummarizeRequest(BaseModel):
    chunks: list[TranscriptChunk]
    target_sentences: int = 5


@router.post("/summarize")
def summarize(payload: SummarizeRequest):
    if not payload.chunks:
        raise HTTPException(status_code=400, detail="Aucun transcript fourni — transcris la vidéo d'abord.")

    try:
        result = summarize_transcript(
            [c.dict() for c in payload.chunks],
            target_sentences=payload.target_sentences,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Erreur pendant le résumé : {exc}")