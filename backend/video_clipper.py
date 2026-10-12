"""
video_clipper.py
=================

Construit une VRAIE vidéo résumé : découpe, dans la vidéo source uploadée
par l'utilisateur, les segments correspondant aux phrases-clés retenues
par summarizer.py (champ "clips", avec start/end), puis les concatène
avec un léger fondu enchaîné entre segments pour un montage qui ne
saute pas brutalement d'un passage à l'autre.

Rien n'est généré ici (pas d'illustration, pas d'IA) : ce sont les
images/le son réels de la vidéo originale, juste raboutés.
"""

from __future__ import annotations

from pathlib import Path

from moviepy.editor import VideoFileClip, concatenate_videoclips


def build_summary_video(
    source_path: Path,
    clips: list[dict],
    output_path: Path,
    padding: float = 0.3,
    crossfade: float = 0.25,
    max_clip_duration: float | None = None,
) -> float:
    """Découpe et concatène les segments-clés en une vidéo résumé.

    Args:
        source_path: chemin de la vidéo originale (déjà sauvegardée sur
            disque par l'endpoint appelant).
        clips: liste de {"start": float, "end": float, ...}, typiquement
            le champ "clips" renvoyé par summarize_transcript(). L'ordre
            n'a pas d'importance, la fonction re-trie par "start".
        output_path: chemin du fichier .mp4 de sortie.
        padding: marge (secondes) ajoutée avant/après chaque segment,
            pour éviter de couper un mot ou un son en plein milieu.
        crossfade: durée (secondes) du fondu enchaîné entre segments
            consécutifs. 0 pour des coupes franches.
        max_clip_duration: limite optionnelle par segment, pour éviter
            qu'une phrase anormalement longue ne domine tout le résumé.

    Returns:
        Durée totale (secondes) de la vidéo résumé générée.

    Raises:
        ValueError: si `clips` est vide, ou si aucun segment n'a pu être
            découpé (tous trop courts ou hors des limites de la vidéo).
    """
    if not clips:
        raise ValueError("Aucun clip à assembler — le résumé n'a produit aucun segment.")

    source = VideoFileClip(str(source_path))
    subclips: list = []
    final = None

    try:
        total_duration = source.duration
        ordered = sorted(clips, key=lambda c: c["start"])

        for clip_info in ordered:
            start = max(0.0, clip_info["start"] - padding)
            end = min(total_duration, clip_info["end"] + padding)
            if max_clip_duration is not None:
                end = min(end, start + max_clip_duration)
            if end - start < 0.15:
                continue  # segment trop court pour être exploitable une fois recadré
            subclips.append(source.subclip(start, end))

        if not subclips:
            raise ValueError("Tous les segments calculés étaient trop courts ou hors des limites de la vidéo.")

        if crossfade > 0 and len(subclips) > 1:
            faded = [subclips[0]] + [c.crossfadein(crossfade) for c in subclips[1:]]
            final = concatenate_videoclips(faded, method="compose", padding=-crossfade)
        else:
            final = concatenate_videoclips(subclips, method="compose")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        final.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            preset="medium",
            ffmpeg_params=["-crf", "20", "-pix_fmt", "yuv420p"],
            logger=None,
        )
        return final.duration

    finally:
        # Libération explicite : plusieurs VideoFileClip / sous-clips
        # ouverts en parallèle sur un même process FastAPI long-lived
        # peuvent sinon accumuler des handles ffmpeg non fermés.
        for c in subclips:
            c.close()
        if final is not None:
            final.close()
        source.close()