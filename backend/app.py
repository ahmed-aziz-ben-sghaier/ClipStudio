import array
import glob
import os
import re
import shutil
import subprocess
import uuid

import numpy as np

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from faster_whisper import WhisperModel
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # port par défaut de Vite
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers additionnels : branchés ici, juste après la config CORS et
# avant toute définition de route, pour que /summarize et /summarize-video
# soient bien enregistrés sur l'app (leur absence provoquait un 404).
from routes_summarize import router as summarize_router
app.include_router(summarize_router)

from routes_video_summary import router as video_summary_router
app.include_router(video_summary_router)

# Chargé une seule fois au démarrage, réutilisé pour chaque requête.
MODEL_SIZE = "base"
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

# Dossier persistant (survit à la requête, contrairement à tempfile.mkdtemp
# utilisé avant) où l'on garde la vidéo source le temps que l'utilisateur
# exporte ses extraits. Un job = un id + la vidéo uploadée.
JOBS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs")
os.makedirs(JOBS_DIR, exist_ok=True)


def get_job_dir(job_id: str) -> str:
    path = os.path.join(JOBS_DIR, job_id)
    os.makedirs(path, exist_ok=True)
    return path


def find_job_video(job_id: str) -> str | None:
    matches = glob.glob(os.path.join(JOBS_DIR, job_id, "source.*"))
    return matches[0] if matches else None


def find_job_audio(job_id: str) -> str | None:
    path = os.path.join(JOBS_DIR, job_id, "audio.wav")
    return path if os.path.exists(path) else None


def get_video_fps(video_path: str) -> float:
    """Framerate de la piste vidéo source, nécessaire pour caler le filtre
    zoompan (Ken Burns) sur le bon nombre d'images sans dérive de vitesse."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=r_frame_rate",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    raw = result.stdout.strip()
    try:
        if "/" in raw:
            num, den = raw.split("/")
            return float(num) / float(den) if float(den) != 0 else 30.0
        return float(raw)
    except (ValueError, ZeroDivisionError):
        return 30.0  # valeur de repli raisonnable si ffprobe échoue


# ------------------------------------------------------------------ #
#  Utilitaires audio — indépendants du contenu de la vidéo testée
# ------------------------------------------------------------------ #
def has_audio_stream(video_path: str) -> bool:
    """Vérifie via ffprobe que le fichier contient bien une piste audio."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "csv=p=0",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return "audio" in result.stdout


def get_audio_duration(audio_path: str) -> float:
    """Retourne la durée réelle (en secondes) du wav extrait."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def extract_audio(video_path: str, audio_path: str):
    """
    16kHz mono WAV = format attendu par Whisper.
    -af loudnorm remonte automatiquement le volume si la source est
    faible (stream, micro éloigné, export mal exporté) — évite d'avoir
    à deviner le gain au cas par cas.
    """
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-ar", "16000", "-ac", "1", "-vn",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode(errors="ignore"))


def run_whisper(audio_path: str, use_vad: bool):
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=use_vad,
        vad_parameters=dict(min_silence_duration_ms=500) if use_vad else None,
        word_timestamps=True,  # nécessaire pour les sous-titres mot-par-mot façon karaoké
        # language non forcé : Whisper détecte automatiquement.
    )
    chunks = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        words = [
            {"text": w.word.strip(), "start": w.start, "end": w.end}
            for w in (seg.words or [])
            if w.word.strip()
        ]
        chunks.append({"text": text, "start": seg.start, "end": seg.end, "words": words})
    return chunks, info


# ------------------------------------------------------------------ #
#  /transcribe
# ------------------------------------------------------------------ #
@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)

    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    video_path = os.path.join(job_dir, f"source{ext}")
    audio_path = os.path.join(job_dir, "audio.wav")

    try:
        with open(video_path, "wb") as f:
            f.write(await file.read())

        # 1. Vérification indépendante : le fichier a-t-il seulement une piste audio ?
        if not has_audio_stream(video_path):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Cette vidéo ne contient aucune piste audio détectable "
                    "(fichier muet ou export sans son). Vérifie la source."
                ),
            )

        extract_audio(video_path, audio_path)

        # 2. Vérification indépendante : l'audio extrait a-t-il une durée réelle ?
        duration = get_audio_duration(audio_path)
        print(f"[transcribe] audio extrait: {duration:.2f}s, {os.path.getsize(audio_path)} octets")
        if duration < 0.5:
            raise HTTPException(
                status_code=422,
                detail=(
                    "L'audio extrait est vide ou quasi nul (durée "
                    f"{duration:.2f}s). Le fichier vidéo est probablement "
                    "corrompu ou la piste audio est vide."
                ),
            )

        # 3. Première tentative avec VAD (filtre les silences/musique).
        chunks, info = run_whisper(audio_path, use_vad=True)

        # 4. Fallback auto-suffisant : si le VAD a tout écarté (0 segment)
        #    alors qu'il y a bien du son, on retente sans VAD avant d'échouer.
        vad_fallback_used = False
        if not chunks:
            print("[transcribe] 0 segment avec VAD actif, nouvel essai sans VAD…")
            chunks, info = run_whisper(audio_path, use_vad=False)
            vad_fallback_used = True

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Aucune voix détectée même sans filtre VAD. L'audio "
                    "contient probablement de la musique/du bruit uniquement, "
                    "ou un volume trop faible malgré la normalisation."
                ),
            )

        print(
            f"[transcribe] {len(chunks)} segments, langue détectée: {info.language} "
            f"(fallback sans VAD: {vad_fallback_used})"
        )

        return {
            "job_id": job_id,
            "chunks": chunks,
            "language": info.language,
            "vad_fallback_used": vad_fallback_used,
        }

    except HTTPException:
        # En cas d'erreur, le job ne sert à rien : on nettoie tout de suite.
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))
    # NB: on NE supprime plus audio.wav ici — /analyze en a besoin pour le
    # scoring basé sur l'énergie/le rythme du signal audio (pas que le texte).


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Permet au frontend (ou à un nettoyage périodique) de libérer le disque
    une fois que l'utilisateur a fini d'exporter ses extraits."""
    job_dir = os.path.join(JOBS_DIR, job_id)
    if os.path.isdir(job_dir):
        shutil.rmtree(job_dir, ignore_errors=True)
    return {"deleted": job_id}


# ------------------------------------------------------------------ #
#  /analyze — scoring heuristique 100% local, aucune API externe
# ------------------------------------------------------------------ #
class TranscriptChunk(BaseModel):
    text: str
    start: float
    end: float


class AnalyzeRequest(BaseModel):
    chunks: list[TranscriptChunk]
    n: int = 10
    min_duration: float = 20.0
    max_duration: float = 60.0
    job_id: str | None = None  # si fourni, active le scoring basé sur le signal audio


# Mots/expressions qui signalent typiquement un passage accrocheur en français.
# Liste volontairement large : mieux vaut quelques faux positifs qu'un passage
# fort raté. Facile à enrichir selon ta niche de contenu.
HOOK_KEYWORDS = [
    "incroyable", "jamais vu", "personne ne", "secret", "vérité", "erreur",
    "attention", "choc", "énorme", "fou", "dingue", "record", "interdit",
    "astuce", "piège", "surprise", "révèle", "révélation", "découvre",
    "pourquoi", "comment faire", "la vérité sur", "ce que personne",
    "tu ne devineras jamais", "arrête de", "ne fais jamais", "la raison",
    "changé ma vie", "ça m'a", "je regrette", "leçon", "j'ai perdu",
    "j'ai gagné", "personne ne parle", "vous devez savoir",
]


def score_window(text: str, duration: float):
    """Calcule un score d'accroche pour un segment de transcription, uniquement
    à partir de règles textuelles simples — aucun appel réseau."""
    text_lower = text.lower()
    score = 0.0
    reasons = []

    matched_kw = [kw for kw in HOOK_KEYWORDS if kw in text_lower]
    if matched_kw:
        score += 3 * len(matched_kw)
        reasons.append("mots-clés accrocheurs : " + ", ".join(matched_kw[:3]))

    if re.search(r"\d+", text):
        score += 2
        reasons.append("contient un chiffre (effet liste/structure, ex: '3 raisons')")

    n_excl = text.count("!")
    if n_excl:
        score += min(n_excl, 3) * 1.5
        reasons.append("ton exclamatif marqué")

    n_quest = text.count("?")
    if n_quest:
        score += min(n_quest, 3) * 1.2
        reasons.append("interpelle directement le spectateur")

    words = text.split()
    wps = len(words) / duration if duration > 0 else 0
    if 1.8 <= wps <= 4.0:
        score += 2
        reasons.append("rythme de parole dense, adapté à un format court")

    if 20 <= duration <= 45:
        score += 1
        reasons.append("durée idéale pour un short")

    if not reasons:
        reasons.append("segment cohérent de longueur exploitable")

    return score, reasons, matched_kw


GENERIC_HASHTAGS = ["#shorts", "#viral", "#fyp", "#reels", "#pourtoi"]


def generate_hashtags(matched_kw: list[str]) -> list[str]:
    """Hashtags dérivés des mots-clés détectés + un socle générique. Purement
    dérivé du texte matché, aucune génération créative — pas d'invention."""
    tags = []
    for kw in matched_kw[:3]:
        slug = re.sub(r"[^a-z0-9]", "", kw.lower().replace(" ", ""))
        tag = f"#{slug}"
        if slug and tag not in tags:
            tags.append(tag)
    for t in GENERIC_HASHTAGS:
        if t not in tags:
            tags.append(t)
    return tags[:8]


def generate_social_caption(hook: str) -> str:
    """Légende de post minimaliste basée sur le hook lui-même — pas de
    texte inventé de toutes pièces, juste une mise en forme prête à coller."""
    hook_clean = hook.strip().rstrip(".!?")
    return f"{hook_clean} 👀"


def make_hook(text: str, max_len: int = 90) -> str:
    """Extrait une phrase courte à utiliser comme accroche en overlay."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    hook = parts[0] if parts else text.strip()
    if len(hook) > max_len:
        hook = hook[:max_len].rsplit(" ", 1)[0] + "…"
    return hook


def build_candidate_windows(chunks: list[TranscriptChunk], min_duration: float, max_duration: float):
    """Génère des fenêtres candidates en regroupant des segments consécutifs,
    en partant de chaque index, jusqu'à atteindre une durée exploitable."""
    candidates = []
    for i in range(len(chunks)):
        merged_text = []
        start = chunks[i].start
        for j in range(i, len(chunks)):
            merged_text.append(chunks[j].text)
            duration = chunks[j].end - start
            if duration > max_duration:
                break
            if duration >= min_duration:
                candidates.append({
                    "start": start,
                    "end": chunks[j].end,
                    "text": " ".join(merged_text),
                    "duration": duration,
                })
    return candidates


def compute_audio_energy_profile(audio_path: str, start: float, end: float):
    """Lit uniquement le segment [start, end] du wav (pas tout le fichier) et
    calcule une variance d'énergie à court terme sur des fenêtres de 0.25s.
    Une forte variance = passage dynamique (rires, exclamations, changements
    de ton) plutôt qu'un débit plat — un bon proxy local, sans modèle ML."""
    import wave

    try:
        with wave.open(audio_path, "rb") as wf:
            sr = wf.getframerate()
            sampwidth = wf.getsampwidth()
            n_channels = wf.getnchannels()
            if sampwidth != 2:
                return None  # on ne gère que du PCM 16 bits (format produit par extract_audio)

            start_frame = max(int(start * sr), 0)
            n_frames = int((end - start) * sr)
            wf.setpos(min(start_frame, wf.getnframes()))
            raw = wf.readframes(max(n_frames, 0))

        if not raw:
            return None

        samples = array.array("h")
        samples.frombytes(raw[: len(raw) - (len(raw) % 2)])
        data = np.array(samples, dtype=np.float32)
        if n_channels > 1:
            data = data.reshape(-1, n_channels).mean(axis=1)
        data /= 32768.0

        window = max(int(0.25 * sr), 1)
        n_windows = len(data) // window
        if n_windows < 2:
            return None

        rms = np.array([
            np.sqrt(np.mean(data[i * window:(i + 1) * window] ** 2))
            for i in range(n_windows)
        ])
        return {"energy_variance": float(np.var(rms)), "energy_mean": float(np.mean(rms))}
    except Exception:
        return None  # dégradation silencieuse : le scoring texte reste utilisable seul


def apply_audio_scoring(candidates: list[dict], audio_path: str):
    """Calcule le profil audio de chaque candidat, normalise la variance
    d'énergie *relativement aux autres candidats* de cette vidéo, et ajoute
    un bonus de score proportionnel (jusqu'à +3 points, même échelle que
    les bonus texte)."""
    profiles = [compute_audio_energy_profile(audio_path, c["start"], c["end"]) for c in candidates]
    variances = [p["energy_variance"] for p in profiles if p]
    if not variances:
        return  # audio illisible/incompatible : on ne pénalise ni ne bonifie personne

    v_min, v_max = min(variances), max(variances)
    spread = (v_max - v_min) or 1.0

    for cand, profile in zip(candidates, profiles):
        if not profile:
            continue
        normalized = (profile["energy_variance"] - v_min) / spread  # 0..1
        bonus = round(normalized * 3, 2)
        cand["score"] += bonus
        if normalized > 0.65:
            cand["reasons"].append("passage vocalement dynamique (rires/exclamations probables)")


def select_top_non_overlapping(scored_candidates, n: int):
    """Trie par score puis garde les N meilleurs qui ne se chevauchent pas
    dans le temps, pour éviter de proposer deux fois le même passage."""
    scored_candidates.sort(key=lambda c: c["score"], reverse=True)
    selected = []
    for cand in scored_candidates:
        overlaps = any(
            not (cand["end"] <= s["start"] or cand["start"] >= s["end"])
            for s in selected
        )
        if not overlaps:
            selected.append(cand)
        if len(selected) >= n:
            break
    selected.sort(key=lambda c: c["start"])
    return selected


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.chunks:
        raise HTTPException(status_code=400, detail="Transcript vide, rien à analyser.")

    candidates = build_candidate_windows(req.chunks, req.min_duration, req.max_duration)
    if not candidates:
        raise HTTPException(
            status_code=422,
            detail=(
                "Impossible de constituer un extrait de durée exploitable "
                f"({req.min_duration:.0f}-{req.max_duration:.0f}s) à partir de "
                "cette transcription. Vidéo probablement trop courte."
            ),
        )

    for cand in candidates:
        score, reasons, matched_kw = score_window(cand["text"], cand["duration"])
        cand["score"] = score
        cand["reasons"] = reasons
        cand["matched_kw"] = matched_kw

    audio_scoring_used = False
    if req.job_id:
        audio_path = find_job_audio(req.job_id)
        if audio_path:
            apply_audio_scoring(candidates, audio_path)
            audio_scoring_used = True

    best = select_top_non_overlapping(candidates, req.n)

    clips = []
    for c in best:
        hook = make_hook(c["text"])
        clips.append({
            "start": round(c["start"], 1),
            "end": round(c["end"], 1),
            "hook": hook,
            "reason": "; ".join(c["reasons"]),
            "social_caption": generate_social_caption(hook),
            "hashtags": generate_hashtags(c["matched_kw"]),
        })

    return {"clips": clips, "audio_scoring_used": audio_scoring_used}


# ------------------------------------------------------------------ #
#  /export — montage "professionnel" : fond flouté (aucun contenu perdu
#             par un recadrage brutal), sous-titres animés mot-par-mot
#             façon karaoké, gradation colorimétrique, vignette, fondus
#             d'entrée/sortie et normalisation du volume final.
# ------------------------------------------------------------------ #
class WordTiming(BaseModel):
    text: str
    start: float
    end: float


class ExportChunk(BaseModel):
    text: str
    start: float
    end: float
    words: list[WordTiming] = []  # timestamps par mot, si dispo (cf. /transcribe)


ASPECT_DIMENSIONS = {
    "9:16": (1080, 1920),  # TikTok / Reels / Shorts
    "1:1": (1080, 1080),   # Feed Instagram/Facebook
    "16:9": (1920, 1080),  # YouTube standard
}


class ExportRequest(BaseModel):
    job_id: str
    start: float
    end: float
    hook: str = ""
    chunks: list[ExportChunk] = []  # transcript complet ; on filtre sur [start, end]
    uppercase_captions: bool = True   # look "punchy" façon templates CapCut/TikTok
    aspect: str = "9:16"               # "9:16", "1:1" ou "16:9"
    enable_zoom: bool = True           # zoom lent façon Ken Burns (effet dynamique)
    enable_denoise: bool = True        # réduction de bruit de fond sur l'audio
    enable_emojis: bool = True         # emoji contextuel sur certaines lignes de sous-titres
    music_path: str = ""               # chemin ABSOLU local vers un morceau libre de droits (optionnel)
    music_volume: float = 0.15         # 0.0-1.0, avant ducking


def _ffmpeg_escape_path(path: str) -> str:
    """Le filtre 'subtitles=' de ffmpeg a besoin d'un chemin avec des '/'
    et les ':' échappés (sinon il confond le ':' du lecteur Windows, ex.
    'C:', avec un séparateur d'options du filtre)."""
    p = path.replace("\\", "/")
    p = p.replace(":", "\\:")
    return p


def _ass_timestamp(t: float) -> str:
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _ass_escape_text(text: str) -> str:
    # \ et { } ont un sens spécial en ASS (tags d'override) : on neutralise.
    return text.replace("\\", "").replace("{", "").replace("}", "")


# Association mot-clé -> emoji pour les sous-titres. Volontairement simple et
# déterministe (pas de génération créative) : un mot détecté = un emoji fixe.
EMOJI_KEYWORDS = {
    "incroyable": "🤯", "jamais vu": "😱", "argent": "💰", "gagné": "💰",
    "perdu": "😢", "secret": "🤫", "attention": "⚠️", "erreur": "❌",
    "record": "🏆", "amour": "❤️", "rire": "😂", "drôle": "😂",
    "peur": "😨", "choc": "😲", "génial": "🔥", "super": "🔥",
    "interdit": "🚫", "temps": "⏰", "pourquoi": "🤔", "comment": "🤔",
    "vérité": "💡", "découvre": "👀", "révèle": "👀",
}


def pick_emoji_for_group(words: list) -> str | None:
    text = " ".join(w[0] for w in words).lower()
    for kw, emoji in EMOJI_KEYWORDS.items():
        if kw in text:
            return emoji
    return None


def get_words_for_chunk(chunk: ExportChunk):
    """Renvoie [(mot, start, end), ...] pour un segment. Si Whisper n'a pas
    fourni de timestamps par mot (ancien job, ou mot vide), on retombe sur
    une répartition uniforme du temps du segment — moins précis mais permet
    quand même d'avoir des sous-titres animés plutôt que rien."""
    if chunk.words:
        return [(w.text, w.start, w.end) for w in chunk.words if w.text]
    words = chunk.text.split()
    if not words:
        return []
    total = max(chunk.end - chunk.start, 0.01)
    step = total / len(words)
    return [(w, chunk.start + i * step, chunk.start + (i + 1) * step) for i, w in enumerate(words)]


def build_caption_groups(chunks: list[ExportChunk], clip_start: float, clip_end: float):
    """Regroupe les mots en petites lignes de 3-5 mots (style captions
    courtes et lisibles, pas des phrases entières) coupées aux pauses
    naturelles ou après ~2.2s, pour un rendu plus dynamique et lisible."""
    all_words = []
    for c in chunks:
        if c.end <= clip_start or c.start >= clip_end:
            continue
        for text, w_start, w_end in get_words_for_chunk(c):
            rel_start = max(w_start, clip_start) - clip_start
            rel_end = min(w_end, clip_end) - clip_start
            if rel_end > rel_start:
                all_words.append((text, rel_start, rel_end))

    all_words.sort(key=lambda w: w[1])

    groups = []
    current = []
    for word in all_words:
        text, w_start, w_end = word
        if current:
            group_start = current[0][1]
            gap_before = w_start - current[-1][2]
            too_long = (w_end - group_start) > 2.2
            too_many = len(current) >= 5
            big_pause = gap_before > 0.6
            ends_sentence = current[-1][0].strip().endswith((".", "!", "?"))
            if too_long or too_many or big_pause or ends_sentence:
                groups.append(current)
                current = []
        current.append(word)
    if current:
        groups.append(current)

    return groups


def write_ass_for_clip(chunks: list[ExportChunk], clip_start: float, clip_end: float,
                        ass_path: str, uppercase: bool, width: int, height: int,
                        enable_emojis: bool):
    """Génère un fichier .ass avec sous-titres karaoké : chaque mot se
    surligne (blanc -> jaune) au moment précis où il est prononcé, rendu
    natif via libass dans le filtre 'subtitles' de ffmpeg. Taille de police
    et marges sont mises à l'échelle selon le format d'export (9:16/1:1/16:9)."""
    font_size = max(int(round(72 * height / 1920)), 24)
    margin_v = max(int(round(170 * height / 1920)), 40)

    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {width}\n"
        f"PlayResY: {height}\n"
        "WrapStyle: 2\n"
        "ScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
        "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
        "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,Arial Black,{font_size},&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,"
        f"-1,0,0,0,100,100,1,0,1,5,0,2,60,60,{margin_v},1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    groups = build_caption_groups(chunks, clip_start, clip_end)
    events = []
    for group in groups:
        group_start = group[0][1]
        group_end = group[-1][2]
        pieces = []
        for i, (text, w_start, w_end) in enumerate(group):
            display = text.upper() if uppercase else text
            display = _ass_escape_text(display.strip())
            next_start = group[i + 1][1] if i + 1 < len(group) else group_end
            k_centisec = max(int(round((next_start - w_start) * 100)), 1)
            pieces.append(f"{{\\k{k_centisec}}}{display}")
        text_line = " ".join(pieces)

        if enable_emojis:
            emoji = pick_emoji_for_group(group)
            if emoji:
                text_line += " {\\fnSegoe UI Emoji}" + emoji + "{\\r}"

        events.append(
            f"Dialogue: 0,{_ass_timestamp(group_start)},{_ass_timestamp(group_end)},"
            f"Default,,0,0,0,,{text_line}"
        )

    if not events:
        events = [f"Dialogue: 0,{_ass_timestamp(0)},{_ass_timestamp(1)},Default,,0,0,0,, "]

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(events) + "\n")


def build_zoom_filter(width: int, height: int, duration: float, fps: float, target_zoom: float = 1.15) -> str:
    """Zoom lent façon Ken Burns, centré, sans dérive de vitesse : l'incrément
    par image est calculé à partir de la durée réelle et du framerate source
    plutôt que d'utiliser une formule générique qui suppose 30fps partout."""
    total_frames = max(int(round(duration * fps)), 1)
    increment = (target_zoom - 1.0) / total_frames
    return (
        f"zoompan=z='min(zoom+{increment:.8f},{target_zoom})':d=1:"
        f"s={width}x{height}:fps={fps:.3f}:"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    )


@app.post("/export")
async def export_clip(req: ExportRequest):
    video_path = find_job_video(req.job_id)
    if not video_path:
        raise HTTPException(
            status_code=404,
            detail="Job introuvable (vidéo source expirée ou déjà supprimée). Retranscris la vidéo.",
        )

    duration = req.end - req.start
    if duration <= 0:
        raise HTTPException(status_code=400, detail="Intervalle de clip invalide (end doit être > start).")

    if req.aspect not in ASPECT_DIMENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format '{req.aspect}' inconnu. Choix possibles : {', '.join(ASPECT_DIMENSIONS)}.",
        )
    width, height = ASPECT_DIMENSIONS[req.aspect]

    use_music = bool(req.music_path.strip()) and os.path.isfile(req.music_path.strip())
    if req.music_path.strip() and not use_music:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier musique introuvable : {req.music_path}. Vérifie le chemin (absolu).",
        )

    job_dir = os.path.dirname(video_path)
    output_path = os.path.join(job_dir, f"clip_{uuid.uuid4().hex[:8]}.mp4")
    ass_path = os.path.join(job_dir, f"subs_{uuid.uuid4().hex[:8]}.ass")
    fade_out_start = max(duration - 0.3, 0)

    try:
        write_ass_for_clip(
            req.chunks, req.start, req.end, ass_path, req.uppercase_captions,
            width, height, req.enable_emojis,
        )
        ass_escaped = _ffmpeg_escape_path(ass_path)

        filter_parts = [
            "[0:v]split=2[bg][fg]",
            f"[bg]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},boxblur=32:2,eq=brightness=-0.12:saturation=1.15[bgb]",
            f"[fg]scale={width}:{height}:force_original_aspect_ratio=decrease[fgs]",
            "[bgb][fgs]overlay=(W-w)/2:(H-h)/2[comp]",
        ]
        current = "comp"

        if req.enable_zoom:
            fps = get_video_fps(video_path)
            filter_parts.append(f"[{current}]{build_zoom_filter(width, height, duration, fps)}[zoomed]")
            current = "zoomed"

        filter_parts.append(f"[{current}]eq=contrast=1.07:saturation=1.12:brightness=0.01,vignette=PI/5[graded]")
        current = "graded"

        filter_parts.append(f"[{current}]subtitles='{ass_escaped}'[subbed]")
        current = "subbed"

        if req.hook.strip():
            hook_text = req.hook.strip().replace("\\", "").replace("'", "").replace(":", "")
            font_path = _ffmpeg_escape_path("C:/Windows/Fonts/arialbd.ttf")
            hook_fontsize = max(int(round(54 * height / 1920)), 20)
            hook_y = max(int(round(140 * height / 1920)), 20)
            filter_parts.append(
                f"[{current}]drawtext=text='{hook_text}':"
                f"fontcolor=white:fontsize={hook_fontsize}:fontfile='{font_path}':"
                f"box=1:boxcolor=black@0.55:boxborderw=20:"
                f"x=(w-text_w)/2:y={hook_y}:enable='lt(t,3)'[hooked]"
            )
            current = "hooked"

        filter_parts.append(f"[{current}]fade=t=in:st=0:d=0.3,fade=t=out:st={fade_out_start:.2f}:d=0.3[vout]")

        denoise = "afftdn=nf=-25" if req.enable_denoise else "anull"
        filter_parts.append(f"[0:a]{denoise}[voice]")

        if use_music:
            filter_parts.append(
                f"[1:a]atrim=0:{duration:.3f},asetpts=PTS-STARTPTS,volume={req.music_volume}[musraw]"
            )
            filter_parts.append(
                "[musraw][voice]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=300[musduck]"
            )
            filter_parts.append("[voice][musduck]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[amixed]")
            audio_label = "amixed"
        else:
            audio_label = "voice"

        filter_parts.append(
            f"[{audio_label}]afade=t=in:st=0:d=0.3,afade=t=out:st={fade_out_start:.2f}:d=0.3,"
            f"loudnorm=I=-14:TP=-1:LRA=11[afinal]"
        )

        filter_complex = ";".join(filter_parts)

        cmd = ["ffmpeg", "-y", "-ss", str(req.start), "-i", video_path]
        if use_music:
            cmd += ["-stream_loop", "-1", "-i", req.music_path.strip()]
        cmd += [
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "[afinal]",
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True)

        if result.returncode != 0 or not os.path.exists(output_path):
            stderr_tail = result.stderr.decode(errors="ignore")[-1200:]
            raise HTTPException(
                status_code=500,
                detail=(
                    "Échec du montage ffmpeg. Si l'erreur mentionne 'subtitles', "
                    "'drawtext' ou 'zoompan' introuvable, ton build ffmpeg n'inclut "
                    "pas libass/freetype (installe la build 'full' de gyan.dev sur "
                    f"Windows). Détail : {stderr_tail}"
                ),
            )

        filename = f"short_{int(req.start)}s-{int(req.end)}s.mp4"
        return FileResponse(output_path, media_type="video/mp4", filename=filename)

    finally:
        if os.path.exists(ass_path):
            os.remove(ass_path)
        # output_path n'est PAS supprimé ici : FileResponse doit encore le
        # streamer au client. En prod, prévoir un nettoyage périodique de
        # JOBS_DIR (ex: tâche planifiée qui purge les dossiers > 24h).