"""
summarizer.py
=============

Résumé automatique EXTRACTIF d'une transcription vidéo, sans dépendance
lourde (pas de modèle de langage, pas d'appel API) : TF-IDF + graphe de
similarité + PageRank ("TextRank"), implémenté en pur Python + numpy.

Format de sortie
-----------------
Aligné sur ce que consomme le composant frontend VideoSummarizer.jsx :

    {
        "summary": str,                 # résumé (paragraphe)
        "key_points": [str, ...],       # phrases clés, dans l'ordre chronologique
        "stats": {
            "video_duration_seconds": float,  # durée totale de la vidéo (end du dernier chunk)
            "word_count": int,                # nombre de mots dans le transcript COMPLET
            "reading_time_minutes": int,       # estimation à 200 mots/minute
        },
    }

Principe de l'algorithme
-------------------------
1. Les chunks (mots ou groupes de mots avec start/end) sont recomposés en
   phrases complètes, en conservant pour chaque phrase le timestamp de
   début du premier chunk qui la compose et celui de fin du dernier.
2. Chaque phrase est vectorisée en TF-IDF (implémentation manuelle).
3. Un graphe de similarité cosinus entre phrases est construit ; les
   scores d'importance sont calculés par PageRank (méthode des
   puissances, sans dépendance à networkx).
4. Les `target_sentences` phrases les mieux notées sont sélectionnées
   puis ré-ordonnées chronologiquement pour former des points clés qui se
   lisent naturellement (et non dans l'ordre d'importance).

Un léger biais positionnel favorise les toutes premières phrases : dans
une vidéo, l'introduction du sujet est souvent structurellement
importante même quand son score TextRank brut est moyen.

Dépendance : numpy uniquement.
"""

from __future__ import annotations

import re
from collections import Counter

import numpy as np

WORDS_PER_MINUTE = 200  # vitesse de lecture moyenne, pour reading_time_minutes


# --------------------------------------------------------------------------- #
#  Stopwords (volontairement léger : pas de dépendance NLP lourde type spaCy)
# --------------------------------------------------------------------------- #

STOPWORDS_FR = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux",
    "en", "dans", "pour", "avec", "sur", "sous", "par", "que", "qui", "quoi", "ce",
    "cette", "ces", "cet", "il", "elle", "ils", "elles", "on", "nous", "vous", "je",
    "tu", "son", "sa", "ses", "leur", "leurs", "mon", "ma", "mes", "ton", "ta", "tes",
    "notre", "votre", "est", "sont", "était", "être", "avoir", "a", "ont", "plus",
    "très", "tout", "toute", "tous", "toutes", "comme", "mais", "donc", "car", "ni",
    "pas", "ne", "se", "y", "d", "l", "qu", "s", "n", "c", "j", "m", "alors", "aussi",
    "ainsi", "cela", "ça", "ceci", "dont", "où", "bien", "encore", "entre",
}

STOPWORDS_EN = {
    "the", "a", "an", "and", "or", "of", "in", "on", "for", "with", "to", "is",
    "are", "was", "were", "be", "been", "this", "that", "these", "those", "it",
    "as", "at", "by", "from", "into", "very", "so", "but", "not", "no", "do",
    "does", "did", "has", "have", "had", "will", "would", "can", "could",
}

STOPWORDS = STOPWORDS_FR | STOPWORDS_EN


# --------------------------------------------------------------------------- #
#  Étape 1 : reconstruction de phrases complètes à partir des chunks
# --------------------------------------------------------------------------- #

def _merge_chunks_to_sentences(chunks: list[dict]) -> list[dict]:
    """Recompose des phrases complètes à partir des chunks de transcription
    (mots ou groupes de mots horodatés), en conservant pour chaque phrase
    le timestamp de début du premier chunk qui la compose et celui de fin
    du dernier."""
    full_text_parts: list[str] = []
    boundaries: list[tuple[int, int, float, float]] = []
    cursor = 0

    for chunk in chunks:
        text = (chunk.get("text") or "").strip()
        if not text:
            continue
        if full_text_parts:
            full_text_parts.append(" ")
            cursor += 1
        start_char = cursor
        full_text_parts.append(text)
        cursor += len(text)
        boundaries.append((start_char, cursor, chunk["start"], chunk["end"]))

    full_text = "".join(full_text_parts)
    if not full_text.strip():
        return []

    # Découpage sur la ponctuation forte ; fallback si le transcript n'a
    # aucune ponctuation (fréquent avec certains moteurs ASR) : tout le
    # texte forme une seule "phrase".
    sentence_spans = []
    last = 0
    for match in re.finditer(r"[.!?]+(?:\s+|$)", full_text):
        end = match.end()
        sentence_spans.append((last, end))
        last = end
    if last < len(full_text):
        sentence_spans.append((last, len(full_text)))
    if not sentence_spans:
        sentence_spans = [(0, len(full_text))]

    sentences = []
    for s_start, s_end in sentence_spans:
        text = full_text[s_start:s_end].strip()
        if not text:
            continue
        overlapping = [b for b in boundaries if b[1] > s_start and b[0] < s_end]
        if not overlapping:
            continue
        t_start = min(b[2] for b in overlapping)
        t_end = max(b[3] for b in overlapping)
        sentences.append({"text": text, "start": t_start, "end": t_end})

    return sentences


# --------------------------------------------------------------------------- #
#  Étape 2 : TF-IDF (implémentation manuelle, sans scikit-learn)
# --------------------------------------------------------------------------- #

def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ']+", text.lower())
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]


def _build_tfidf_matrix(sentences: list[str]) -> np.ndarray:
    tokenized = [_tokenize(s) for s in sentences]
    vocab = sorted({w for tokens in tokenized for w in tokens})
    if not vocab:
        return np.zeros((len(sentences), 0))
    vocab_index = {w: i for i, w in enumerate(vocab)}

    n_docs = len(sentences)
    df = np.zeros(len(vocab))
    tf_matrix = np.zeros((n_docs, len(vocab)))

    for i, tokens in enumerate(tokenized):
        counts = Counter(tokens)
        total = max(len(tokens), 1)
        for w, c in counts.items():
            j = vocab_index[w]
            tf_matrix[i, j] = c / total
            df[j] += 1

    idf = np.log((n_docs + 1) / (df + 1)) + 1  # idf lissé (évite log(0)/div0)
    return tf_matrix * idf


def _cosine_similarity_matrix(tfidf: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
    norms[norms == 0] = 1e-9
    normalized = tfidf / norms
    sim = normalized @ normalized.T
    np.fill_diagonal(sim, 0.0)  # une phrase n'est pas "similaire à elle-même" dans le graphe
    return sim


# --------------------------------------------------------------------------- #
#  Étape 3 : PageRank par méthode des puissances (sans networkx)
# --------------------------------------------------------------------------- #

def _pagerank(sim_matrix: np.ndarray, damping: float = 0.85, max_iter: int = 100, tol: float = 1e-6) -> np.ndarray:
    n = sim_matrix.shape[0]
    if n == 0:
        return np.array([])

    row_sums = sim_matrix.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1e-9
    transition = sim_matrix / row_sums

    scores = np.full(n, 1.0 / n)
    for _ in range(max_iter):
        new_scores = (1 - damping) / n + damping * (transition.T @ scores)
        if np.abs(new_scores - scores).sum() < tol:
            scores = new_scores
            break
        scores = new_scores
    return scores


# --------------------------------------------------------------------------- #
#  Stats (durée vidéo, nombre de mots, temps de lecture)
# --------------------------------------------------------------------------- #

def _compute_stats(chunks: list[dict]) -> dict:
    """Stats calculées sur le transcript COMPLET (pas seulement les phrases
    retenues dans le résumé) — c'est la durée réelle de la vidéo et le
    volume de mots réel qui intéressent l'utilisateur ici."""
    video_duration_seconds = max((c.get("end", 0.0) for c in chunks), default=0.0)
    word_count = sum(len((c.get("text") or "").split()) for c in chunks)
    reading_time_minutes = max(1, round(word_count / WORDS_PER_MINUTE))
    return {
        "video_duration_seconds": video_duration_seconds,
        "word_count": word_count,
        "reading_time_minutes": reading_time_minutes,
    }


# --------------------------------------------------------------------------- #
#  Point d'entrée principal, appelé par routes_summarize.py
# --------------------------------------------------------------------------- #

def summarize_transcript(chunks: list[dict], target_sentences: int = 5) -> dict:
    """Résume une transcription horodatée.

    Args:
        chunks: liste de dicts {"text": str, "start": float, "end": float},
            typiquement les chunks bruts renvoyés par /transcribe.
        target_sentences: nombre de points clés à extraire.

    Returns:
        {
            "summary": str,
            "key_points": list[str],       # texte seul, pour l'affichage
            "clips": [                     # mêmes segments, AVEC horodatage —
                {"text": str, "start": float, "end": float},  # pour découper la vraie vidéo (voir video_clipper.py)
                ...
            ],
            "stats": {
                "video_duration_seconds": float,
                "word_count": int,
                "reading_time_minutes": int,
            },
        }

    Raises:
        ValueError: si target_sentences < 1, ou si le transcript est vide
            / ne contient aucun texte exploitable.
    """
    if target_sentences < 1:
        raise ValueError("target_sentences doit être >= 1.")

    stats = _compute_stats(chunks)

    sentences = _merge_chunks_to_sentences(chunks)
    if not sentences:
        raise ValueError("Transcript vide ou illisible — impossible de le résumer.")

    texts = [s["text"] for s in sentences]

    # Rien à résumer si la transcription est déjà plus courte (ou aussi
    # longue) que le nombre de points clés demandé.
    if len(sentences) <= target_sentences:
        return {
            "summary": " ".join(texts),
            "key_points": texts,
            "clips": sentences,
            "stats": stats,
        }

    tfidf = _build_tfidf_matrix(texts)

    if tfidf.shape[1] == 0:
        # Que des stopwords / aucun mot significatif : on retombe sur les
        # premières phrases plutôt que d'échouer.
        selected = sentences[:target_sentences]
        return {
            "summary": " ".join(s["text"] for s in selected),
            "key_points": [s["text"] for s in selected],
            "clips": selected,
            "stats": stats,
        }

    sim_matrix = _cosine_similarity_matrix(tfidf)
    scores = _pagerank(sim_matrix)

    # Léger biais positionnel : la ou les toutes premières phrases
    # (introduction du sujet) restent favorisées même si leur score
    # TextRank pur est moyen.
    position_bonus = np.array(
        [1.15 if i == 0 else 1.05 if i < 3 else 1.0 for i in range(len(sentences))]
    )
    scores = scores * position_bonus

    ranked_indices = np.argsort(-scores)[:target_sentences]
    ranked_indices_sorted_by_time = sorted(ranked_indices.tolist())

    selected = [sentences[idx] for idx in ranked_indices_sorted_by_time]

    return {
        "summary": " ".join(s["text"] for s in selected),
        "key_points": [s["text"] for s in selected],
        "clips": selected,
        "stats": stats,
    }