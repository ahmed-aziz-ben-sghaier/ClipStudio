import { useRef, useState, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Icônes (cohérentes avec le reste de l'app)                         */
/* ------------------------------------------------------------------ */
const Icon = {
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 15.5V4M12 4 7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6.5 3.5h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  copy: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 15.5h-1a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.2l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  list: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M8 6.5h11M8 12h11M8 17.5h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="4.2" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="4.2" cy="12" r="1.1" fill="currentColor" />
      <circle cx="4.2" cy="17.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M11 3.5 12.4 8 17 9.4 12.4 10.8 11 15.3 9.6 10.8 5 9.4 9.6 8 11 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  film: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 5v14M16 5v14M3.5 9.5h4.5M15.5 9.5H20M3.5 14.5h4.5M15.5 14.5H20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  share: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="18" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="18.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.7 16 6.3M8 13.3l8 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="m19 19-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17.2 4.9v3.2h-3.2M6.8 19.1v-3.2H10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  ),
  crown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 8.5 8 12l4-6 4 6 4-3.5-1.4 9.5H5.4L4 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

const API_URL = "http://localhost:8000";
const INTENSITIES = [
  { label: "Court", points: 3 },
  { label: "Moyen", points: 5 },
  { label: "Long", points: 8 },
];

/* Cinematic sunset tokens, partagés avec le reste de l'app.
   Si déjà chargé une fois à la racine, supprime la balise <style> ci-dessous. */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  ::selection { background: #ff7a3d; color: #0a0a0f; }
`;

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* Petit badge de step réutilisable pour la colonne "Flux de travail" */
function StepRow({ n, label, state }) {
  // state: "done" | "current" | "pending"
  const circle =
    state === "done"
      ? "bg-[#8b5cf0] text-[#0a0a0f]"
      : state === "current"
      ? "border border-[#8b5cf0] text-[#8b5cf0]"
      : "border border-[rgba(244,239,233,0.15)] text-[#f4efe9]/40";
  const text = state === "pending" ? "text-[#f4efe9]/40" : "text-[#f4efe9]";
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-semibold ${circle}`}>
        {state === "done" ? <Icon.check className="h-3 w-3" /> : n}
      </span>
      <span className={`text-[13px] font-medium ${text}`}>{label}</span>
    </div>
  );
}

export default function VideoSummarizer() {
  const fileRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(null); // [{text, start, end}]
  const [transcribeError, setTranscribeError] = useState("");

  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(null); // {summary, key_points, clips, stats}
  const [summarizeError, setSummarizeError] = useState("");
  const [targetPoints, setTargetPoints] = useState(5);
  const [copied, setCopied] = useState(false);

  /* -------------------- Étape 3 : vidéo résumé -------------------- */
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [summaryVideoUrl, setSummaryVideoUrl] = useState(null);
  const [videoGenError, setVideoGenError] = useState("");

  /* -------------------- Étape courante du flux -------------------- */
  const currentStep = !videoFile ? 1 : !transcript ? 2 : !summary ? 3 : !summaryVideoUrl ? 4 : 5;
  const stepState = (n) => (n < currentStep ? "done" : n === currentStep ? "current" : "pending");

  /* -------------------- Import du fichier -------------------- */
  const loadFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setTranscribeError("Ce fichier n'est pas une vidéo.");
      return;
    }
    setTranscribeError("");
    setSummarizeError("");
    setVideoGenError("");
    setTranscript(null);
    setSummary(null);
    setSummaryVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoFile(file);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const resetAll = () => {
    setVideoFile(null);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTranscript(null);
    setSummary(null);
    setTranscribeError("");
    setSummarizeError("");
    setVideoGenError("");
    setSummaryVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e) => loadFile(e.target.files?.[0]);
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  /* -------------------- Étape 1 : Transcription -------------------- */
  const runTranscription = useCallback(async () => {
    if (!videoFile) return;

    setTranscribing(true);
    setTranscribeError("");
    setTranscript(null);
    setSummary(null);
    setSummaryVideoUrl(null);
    setVideoGenError("");

    try {
      const formData = new FormData();
      formData.append("file", videoFile);

      const res = await fetch(`${API_URL}/transcribe`, { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      if (!data.chunks || data.chunks.length === 0) {
        throw new Error("Aucun texte détecté dans l'audio. Vérifie que la vidéo contient bien de la voix audible.");
      }
      setTranscript(data.chunks);
    } catch (err) {
      console.error(err);
      setTranscribeError(
        "Erreur pendant la transcription : " +
          err.message +
          " — vérifie que le serveur Python (uvicorn) tourne bien sur http://localhost:8000."
      );
    } finally {
      setTranscribing(false);
    }
  }, [videoFile]);

  /* -------------------- Étape 2 : Résumé (texte) -------------------- */
  const runSummary = useCallback(async () => {
    if (!transcript) return;

    setSummarizing(true);
    setSummarizeError("");
    setSummary(null);
    setSummaryVideoUrl(null);
    setVideoGenError("");

    try {
      const res = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks: transcript, target_sentences: targetPoints }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
      setSummarizeError("Erreur pendant le résumé : " + err.message);
    } finally {
      setSummarizing(false);
    }
  }, [transcript, targetPoints]);

  /* -------------------- Étape 3 : Vidéo résumé (montage réel) -------------------- */
  const runVideoSummary = useCallback(async () => {
    if (!videoFile || !summary?.clips?.length) return;

    setGeneratingVideo(true);
    setVideoGenError("");
    setSummaryVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const formData = new FormData();
      formData.append("file", videoFile); // même vidéo originale, ré-envoyée pour la découpe
      formData.append("clips", JSON.stringify(summary.clips));
      formData.append("padding", "0.3");
      formData.append("crossfade", "0.25");

      const res = await fetch(`${API_URL}/summarize-video`, { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Erreur serveur (${res.status})`);
      }

      const blob = await res.blob();
      setSummaryVideoUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setVideoGenError("Erreur pendant la génération de la vidéo résumé : " + err.message);
    } finally {
      setGeneratingVideo(false);
    }
  }, [videoFile, summary]);

  const copySummary = () => {
    if (!summary) return;
    const text = [
      summary.summary,
      "",
      "Points clés :",
      ...summary.key_points.map((p) => `• ${p}`),
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareVideo = () => {
    if (navigator.share && summaryVideoUrl) {
      navigator.share({ title: "Vidéo résumé", text: "Voici la vidéo résumé générée." }).catch(() => {});
    } else if (summaryVideoUrl) {
      navigator.clipboard.writeText(summaryVideoUrl);
    }
  };

  const timeSavedPct = useMemo(() => {
    if (!summary?.stats?.video_duration_seconds || !summary?.stats?.reading_time_minutes) return null;
    const readingSeconds = summary.stats.reading_time_minutes * 60;
    const pct = Math.round((1 - readingSeconds / summary.stats.video_duration_seconds) * 100);
    return Number.isFinite(pct) ? pct : null;
  }, [summary]);

  /* -------------------- Bouton d'action contextuel (sidebar) -------------------- */
  const renderPrimaryAction = () => {
    if (currentStep === 2) {
      return (
        <button
          onClick={runTranscription}
          disabled={transcribing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf0] py-3 text-[13px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {transcribing ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] animate-spin" />
              Transcription en cours…
            </>
          ) : (
            "Transcrire la vidéo"
          )}
        </button>
      );
    }
    if (currentStep === 3) {
      return (
        <button
          onClick={runSummary}
          disabled={summarizing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf0] py-3 text-[13px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {summarizing ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Icon.sparkles className="h-4 w-4" />
              Générer le résumé
            </>
          )}
        </button>
      );
    }
    if (currentStep === 4) {
      return (
        <button
          onClick={runVideoSummary}
          disabled={generatingVideo}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf0] py-3 text-[13px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {generatingVideo ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] animate-spin" />
              Montage en cours…
            </>
          ) : (
            <>
              <Icon.film className="h-4 w-4" />
              Générer la vidéo résumé
            </>
          )}
        </button>
      );
    }
    if (currentStep === 5) {
      return (
        <button
          onClick={resetAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(244,239,233,0.10)] py-3 text-[13px] font-semibold text-[#f4efe9] transition-colors hover:border-[#f4efe9]/25 hover:bg-[#13101d]"
        >
          <Icon.refresh className="h-4 w-4" />
          Recommencer avec une autre vidéo
        </button>
      );
    }
    return null;
  };

  return (
    <div className="font-body min-h-screen bg-[#0a0a0f] text-[#f4efe9]">
      <style>{GLOBAL_CSS}</style>

      {/* -------------------- Header -------------------- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[rgba(244,239,233,0.10)] px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8b5cf0]/15 text-[#8b5cf0]">
          <Icon.doc className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#f4efe9]">
            Résumé de vidéo
            <span className="rounded-full bg-[#8b5cf0]/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-[#8b5cf0]">PRO</span>
          </span>
          <span className="font-display text-[11px] text-[#f4efe9]/55">
            Transcription locale + résumé automatique
          </span>
        </div>
        <nav className="ml-auto flex items-center gap-5">
          
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8b5cf0]/30 text-[#8b5cf0]">
            <Icon.crown className="h-4 w-4" />
          </span>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[300px_1fr]">
        {/* ================= Colonne latérale ================= */}
        <aside className="flex flex-col gap-5">
          {/* Flux de travail */}
          <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">Flux de travail</h3>
            <div className="flex flex-col gap-4">
              <StepRow n={1} label="Import vidéo" state={stepState(1)} />
              <StepRow n={2} label="Transcription IA" state={stepState(2)} />
              <StepRow n={3} label="Analyse sémantique" state={stepState(3)} />
              <StepRow n={4} label="Montage résumé" state={stepState(4)} />
            </div>
          </div>

          {/* Import / fichier chargé */}
          {!videoUrl ? (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                isDraggingOver ? "border-[#8b5cf0]/70 bg-[#8b5cf0]/5" : "border-[rgba(244,239,233,0.10)] hover:border-[#f4efe9]/25"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8b5cf0]/10 text-[#8b5cf0]">
                <Icon.upload className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-[#f4efe9]">Importer une vidéo</p>
                <p className="mt-1 text-[11.5px] text-[#f4efe9]/55">
                  Glisse ton fichier ici ou clique pour parcourir. MP4, MOV, AVI supportés.
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1 w-full rounded-xl bg-[#8b5cf0] py-2.5 text-[12.5px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Sélectionner le fichier
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">
                <Icon.film className="h-3.5 w-3.5" />
                Vidéo importée
              </h3>
              <p className="truncate text-[12.5px] text-[#f4efe9]">{videoFile?.name}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-3 w-full rounded-lg border border-[rgba(244,239,233,0.10)] py-2 text-[12px] font-medium text-[#f4efe9]/70 transition-colors hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
              >
                Changer de fichier
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

          {/* Paramètres d'analyse */}
          {videoUrl && (
            <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">
                Intensité du résumé
              </h3>
              <div className="flex gap-1.5">
                {INTENSITIES.map(({ label, points }) => (
                  <button
                    key={points}
                    onClick={() => setTargetPoints(points)}
                    className={`flex-1 rounded-lg border py-2 font-display text-[12.5px] font-medium transition-colors ${
                      targetPoints === points
                        ? "border-[#8b5cf0]/50 bg-[#8b5cf0]/10 text-[#8b5cf0]"
                        : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-[#f4efe9]/40">
                {targetPoints} points clés seront extraits du résumé.
              </p>
            </div>
          )}

          {/* Action contextuelle */}
          {videoUrl && <div className="flex flex-col gap-2">{renderPrimaryAction()}</div>}

          {(transcribeError || summarizeError || videoGenError) && (
            <div className="rounded-lg border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 px-4 py-3 text-[12px] text-[#ff7a3d]">
              {transcribeError || summarizeError || videoGenError}
            </div>
          )}
        </aside>

        {/* ================= Colonne principale ================= */}
        <main className="flex flex-col gap-5">
          {/* Aperçu vidéo */}
          {videoUrl ? (
            <video src={videoUrl} controls className="aspect-video w-full rounded-2xl border border-[rgba(244,239,233,0.10)] bg-black" />
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] text-[#f4efe9]/55 transition-colors hover:text-[#f4efe9]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#8b5cf0]/30 text-[#8b5cf0]">
                <Icon.play className="h-6 w-6" />
              </span>
              <span className="text-[13px] font-medium">Aperçu de la vidéo source</span>
            </button>
          )}

          {/* Transcript + Points clés */}
          {(transcript || summary) && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Transcription */}
              {transcript && (
                <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">
                      <Icon.list className="h-3.5 w-3.5" />
                      Transcription
                    </h3>
                    <Icon.search className="h-3.5 w-3.5 text-[#f4efe9]/40" />
                  </div>
                  <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                    {transcript.map((seg, i) => (
                      <div key={i} className="flex gap-3 rounded-lg bg-[#13101d] p-2.5">
                        <span className="shrink-0 font-display text-[11px] text-[#8b5cf0]">{formatTime(seg.start)}</span>
                        <span className="text-[13px] leading-relaxed text-[#f4efe9]">{seg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Points clés */}
              {summary && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">
                        <Icon.sparkles className="h-3.5 w-3.5" />
                        Points clés (IA)
                      </h3>
                      <button
                        onClick={copySummary}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#8b5cf0] transition-opacity hover:opacity-75"
                      >
                        {copied ? <Icon.check className="h-3 w-3" /> : <Icon.copy className="h-3 w-3" />}
                        {copied ? "Copié" : "Copier tout"}
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {summary.key_points.map((point, i) => (
                        <div key={i} className="flex gap-2.5 rounded-lg bg-[#13101d] p-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8b5cf0]/15 font-display text-[10.5px] font-semibold text-[#8b5cf0]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[12.5px] leading-relaxed text-[#f4efe9]">{point}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[13px] leading-relaxed text-[#f4efe9]/70">{summary.summary}</p>
                  </div>

                  {/* Statistiques IA */}
                  <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#f4efe9]/45">Statistiques IA</h3>
                    {timeSavedPct !== null && (
                      <p className="font-display text-[26px] font-bold text-[#8b5cf0]">
                        {timeSavedPct > 0 ? "-" : "+"}
                        {Math.abs(timeSavedPct)}%
                      </p>
                    )}
                    <p className="mb-3 text-[11px] text-[#f4efe9]/55">Gain de temps de lecture estimé</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-2.5 py-1 text-[11px] text-[#f4efe9]/55">
                        <Icon.clock className="h-3.5 w-3.5" />
                        {formatTime(summary.stats.video_duration_seconds)}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-2.5 py-1 text-[11px] text-[#f4efe9]/55">
                        <Icon.doc className="h-3.5 w-3.5" />
                        {summary.stats.word_count} mots
                      </span>
                      <span className="rounded-full border border-[#8b5cf0]/20 bg-[#8b5cf0]/10 px-2.5 py-1 text-[11px] font-medium text-[#8b5cf0]">
                        {summary.stats.reading_time_minutes} min
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vidéo résumé générée */}
          {summaryVideoUrl && (
            <div className="rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8b5cf0]/15 text-[#8b5cf0]">
                    <Icon.film className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[13px] font-semibold text-[#f4efe9]">Vidéo résumé générée</p>
                    <p className="text-[11.5px] text-[#f4efe9]/55">Version condensée, prête à partager</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={shareVideo}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(244,239,233,0.10)] px-3 py-2 text-[12px] font-medium text-[#f4efe9] transition-colors hover:border-[#f4efe9]/25 hover:bg-[#13101d]"
                  >
                    <Icon.share className="h-3.5 w-3.5" />
                    Partager
                  </button>
                  <a
                    href={summaryVideoUrl}
                    download="resume.mp4"
                    className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf0] px-3 py-2 text-[12px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Icon.download className="h-3.5 w-3.5" />
                    Télécharger
                  </a>
                </div>
              </div>
              <video src={summaryVideoUrl} controls className="mt-4 w-full rounded-xl bg-black" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}