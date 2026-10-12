import { useState, useRef, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Icônes (SVG inline, cohérentes avec le reste de l'app)             */
/* ------------------------------------------------------------------ */
const Icon = {
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 15.5V4M12 4 7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M11 3.5 12.4 8 17 9.4 12.4 10.8 11 15.3 9.6 10.8 5 9.4 9.6 8 11 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 13.5 18.8 16 21.3 16.8 18.8 17.6 18 20.1 17.2 17.6 14.7 16.8 17.2 16 18 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 17v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ratioVertical: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="7" y="3.5" width="10" height="17" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  ratioSquare: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  ratioWide: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="7" width="17" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  zoom: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 20-4.3-4.3M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  denoise: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3.5 12h3l2.5-6 3 12 2.5-9 2 3h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  emoji: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5h.01M15.5 10.5h.01M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  music: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 17.5V6l9-2v11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6.5 3.5h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  languages: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 5.5h9M8.5 3.5v2M6 5.5c.5 3 2.5 5.3 5.5 6.8M11 5.5c-.6 3.4-3 6-6.5 7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m15 20.5 3.5-9 3.5 9M16 17.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bookmark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6.5 4.5h11a1 1 0 0 1 1 1v14l-6.5-4-6.5 4v-14a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  ),
  chevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const API_URL = "http://localhost:8000";

const ASPECTS = [
  { id: "9:16", label: "9:16", icon: "ratioVertical" },
  { id: "1:1", label: "1:1", icon: "ratioSquare" },
  { id: "16:9", label: "16:9", icon: "ratioWide" },
];

const STEPS = [
  { key: "transcribe", label: "Transcrire" },
  { key: "analyze", label: "Analyser" },
  { key: "export", label: "Exporter" },
];

const SORT_OPTIONS = [
  { id: "suggested", label: "Ordre suggéré" },
  { id: "duration-desc", label: "Durée (longue → courte)" },
  { id: "duration-asc", label: "Durée (courte → longue)" },
];

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* Interrupteur compact pour les options d'export */
function Toggle({ checked, onChange, icon, label }) {
  const IconCmp = Icon[icon];
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        checked ? "border-rec/40 bg-rec/5" : "border-line hover:border-muted"
      }`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${checked ? "bg-rec/15 text-rec" : "bg-surface2 text-muted"}`}>
        <IconCmp className="h-4 w-4" />
      </span>
      <span className="flex-1 text-[12.5px] font-medium text-paper">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-rec" : "border border-line bg-surface2"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${checked ? "translate-x-4 bg-ink" : "translate-x-0.5 bg-muted"}`} />
      </span>
    </button>
  );
}

/* Stepper en pilule, centré dans le header */
function Stepper({ currentIndex }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                active ? "bg-rec/15 text-rec" : done ? "text-play" : "text-muted"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                  done ? "bg-play text-ink" : active ? "bg-rec text-ink" : "bg-surface2 text-muted"
                }`}
              >
                {done ? <Icon.check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {step.label.toUpperCase()}
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function ViralGenerator() {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const previewTimeoutRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [jobId, setJobId] = useState(null);

  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(null); // [{text, start, end, words}]
  const [transcribeError, setTranscribeError] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [clips, setClips] = useState(null); // [{start, end, hook, reason, hashtags, social_caption}]
  const [analyzeError, setAnalyzeError] = useState("");
  const [audioScoringUsed, setAudioScoringUsed] = useState(false);
  const [sortBy, setSortBy] = useState("suggested");
  const [starred, setStarred] = useState({});

  const [exportingIndex, setExportingIndex] = useState(null);
  const [exportErrors, setExportErrors] = useState({});
  const [exportedIndexes, setExportedIndexes] = useState({});
  const [previewingIndex, setPreviewingIndex] = useState(null);

  // Options d'export globales, appliquées à chaque clip exporté.
  const [aspect, setAspect] = useState("9:16");
  const [enableZoom, setEnableZoom] = useState(true);
  const [enableDenoise, setEnableDenoise] = useState(true);
  const [enableEmojis, setEnableEmojis] = useState(true);
  const [musicPath, setMusicPath] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.15);

  const currentStepIndex = !transcript ? 0 : !clips ? 1 : 2;

  /* -------------------- Tri d'affichage (ne modifie pas `clips`) -------------------- */
  const orderedClips = useMemo(() => {
    if (!clips) return [];
    const withIndex = clips.map((clip, index) => ({ clip, index }));
    if (sortBy === "duration-desc") {
      withIndex.sort((a, b) => (b.clip.end - b.clip.start) - (a.clip.end - a.clip.start));
    } else if (sortBy === "duration-asc") {
      withIndex.sort((a, b) => (a.clip.end - a.clip.start) - (b.clip.end - b.clip.start));
    }
    return withIndex;
  }, [clips, sortBy]);

  /* -------------------- Import du fichier -------------------- */
  const loadFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setTranscribeError("Ce fichier n'est pas une vidéo.");
      return;
    }
    setTranscribeError("");
    setAnalyzeError("");
    setTranscript(null);
    setClips(null);
    setJobId(null);
    setExportErrors({});
    setExportedIndexes({});
    setStarred({});
    setVideoFile(file);
    setVideoDuration(null);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
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
    setClips(null);
    setJobId(null);

    try {
      const formData = new FormData();
      formData.append("file", videoFile);

      const res = await fetch(`${API_URL}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();

      if (!data.chunks || data.chunks.length === 0) {
        throw new Error(
          "Aucun texte détecté dans l'audio. Vérifie que la vidéo contient bien de la voix audible."
        );
      }

      setTranscript(data.chunks);
      setJobId(data.job_id);
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

  /* -------------------- Étape 2 : Analyse (scoring texte + audio) -------------------- */
  const runAnalysis = useCallback(async () => {
    if (!transcript) return;

    setAnalyzing(true);
    setAnalyzeError("");
    setClips(null);
    setExportErrors({});
    setExportedIndexes({});
    setStarred({});

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks: transcript, n: 10, job_id: jobId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      setClips(data.clips || []);
      setAudioScoringUsed(Boolean(data.audio_scoring_used));
    } catch (err) {
      console.error(err);
      setAnalyzeError("Erreur pendant l'analyse : " + err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, jobId]);

  /* -------------------- Ajustement manuel du timing -------------------- */
  const updateClipTime = (index, field, value) => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    setClips((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: num };
      return next;
    });
  };

  /* -------------------- Aperçu (100% client, sans appel serveur) -------------------- */
  const previewClip = (clip, index) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    videoEl.currentTime = clip.start;
    videoEl.play();
    setPreviewingIndex(index);

    const durationMs = Math.max((clip.end - clip.start) * 1000, 200);
    previewTimeoutRef.current = setTimeout(() => {
      videoEl.pause();
      setPreviewingIndex(null);
    }, durationMs);
  };

  const toggleStar = (index) => {
    setStarred((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /* -------------------- Étape 3 : Export réel (ffmpeg) -------------------- */
  const runExport = useCallback(
    async (clip, index) => {
      if (!jobId) {
        setExportErrors((prev) => ({
          ...prev,
          [index]: "Session expirée : retranscris la vidéo avant d'exporter.",
        }));
        return;
      }

      setExportingIndex(index);
      setExportErrors((prev) => ({ ...prev, [index]: "" }));

      try {
        const res = await fetch(`${API_URL}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: jobId,
            start: clip.start,
            end: clip.end,
            hook: clip.hook,
            chunks: transcript, // le backend filtre lui-même sur [start, end]
            aspect,
            enable_zoom: enableZoom,
            enable_denoise: enableDenoise,
            enable_emojis: enableEmojis,
            music_path: musicPath,
            music_volume: musicVolume,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Erreur serveur (${res.status})`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `short_${Math.round(clip.start)}s-${Math.round(clip.end)}s.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setExportedIndexes((prev) => ({ ...prev, [index]: true }));
      } catch (err) {
        console.error(err);
        setExportErrors((prev) => ({
          ...prev,
          [index]: "Erreur pendant l'export : " + err.message,
        }));
      } finally {
        setExportingIndex(null);
      }
    },
    [jobId, transcript, aspect, enableZoom, enableDenoise, enableEmojis, musicPath, musicVolume]
  );

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* -------------------- Header -------------------- */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rec/15 text-rec">
          <Icon.sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-paper">Viral Studio</span>
          <span className="font-mono text-[10px] text-muted">AI Short Generator v2.0</span>
        </div>

        <div className="order-3 w-full overflow-x-auto sm:order-none sm:ml-auto sm:w-auto sm:mr-auto">
          <Stepper currentIndex={currentStepIndex} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4 sm:ml-0">
          <span className="hidden text-[12px] font-medium text-muted sm:inline">Documentation</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rec text-[12px] font-semibold text-ink">
            <Icon.sparkles className="h-4 w-4" />
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* -------------------- Import -------------------- */}
        {!videoUrl ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors ${
              isDraggingOver ? "border-rec/70 bg-rec/5 text-paper" : "border-line text-muted hover:border-muted"
            }`}
          >
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rec/15 text-rec">
                <Icon.upload className="h-5 w-5" />
              </span>
              <span className="text-[14.5px] font-semibold text-paper">
                {isDraggingOver ? "Dépose ta vidéo ici" : "Importez votre vidéo brute"}
              </span>
              <span className="text-[12px] text-muted">Podcasts, interviews, streams (MP4, MOV, WebM)</span>
              <span className="mt-1 flex gap-2">
                <span className="rounded-full border border-line bg-surface2 px-2.5 py-1 font-mono text-[10px] text-muted">MAX 500 MB</span>
                <span className="rounded-full border border-line bg-surface2 px-2.5 py-1 font-mono text-[10px] text-muted">DURÉE MAX 30 MIN</span>
              </span>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full rounded-2xl bg-black"
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
          />
        )}
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

        {/* -------------------- Étape 1 : Transcription -------------------- */}
        {videoUrl && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Icon.sparkles className="h-3.5 w-3.5" />
                Étape 1 : Intelligence de transcription
              </h3>
              <span className="rounded-full border border-play/20 bg-play/10 px-2.5 py-1 text-[11.5px] font-medium text-play">
                IA locale prête
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-muted">
                    <Icon.languages className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-paper">Détection de la langue</p>
                    <p className="text-[11.5px] text-muted">Automatique</p>
                  </div>
                </div>
                <button
                  onClick={runTranscription}
                  disabled={transcribing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rec py-3 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.01] hover:bg-rec-dim active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {transcribing ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
                      Transcription en cours…
                    </>
                  ) : (
                    <>
                      <Icon.sparkles className="h-4 w-4" />
                      Lancer la transcription IA
                    </>
                  )}
                </button>
                <p className="mt-2.5 text-center text-[11px] text-muted">
                  Utilise l'accélération GPU locale pour une vitesse optimale.
                </p>
                {transcribeError && (
                  <div className="mt-3 rounded-lg border border-rec/30 bg-rec/10 px-3 py-2.5 text-[12px] text-rec">
                    {transcribeError}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6">
                {transcript ? (
                  <>
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Transcript ({transcript.length} segments)
                    </h4>
                    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                      {transcript.map((seg, i) => (
                        <div key={i} className="flex gap-3 rounded-lg bg-surface2 p-2.5">
                          <span className="shrink-0 font-mono text-[11px] text-muted">{formatTime(seg.start)}</span>
                          <span className="text-[13px] text-paper">{seg.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center text-muted">
                    <Icon.doc className="h-6 w-6" />
                    <p className="text-[12.5px]">En attente du traitement de la vidéo pour générer le transcript…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- Configuration de l'export -------------------- */}
        {transcript && (
          <div>
            <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
              Configuration de l'export
            </h3>
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Ratio d'aspect</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECTS.map((a) => {
                      const active = aspect === a.id;
                      const AspectIcon = Icon[a.icon];
                      return (
                        <button
                          key={a.id}
                          onClick={() => setAspect(a.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-[11px] font-medium transition-colors ${
                            active ? "border-rec/50 bg-rec/10 text-rec" : "border-line text-muted hover:border-muted hover:text-paper"
                          }`}
                        >
                          <AspectIcon className="h-4 w-4" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Effets intelligents</p>
                  <div className="flex flex-col gap-2">
                    <Toggle checked={enableZoom} onChange={setEnableZoom} icon="zoom" label="Zoom dynamique" />
                    <Toggle checked={enableDenoise} onChange={setEnableDenoise} icon="denoise" label="Débruitage audio" />
                    <Toggle checked={enableEmojis} onChange={setEnableEmojis} icon="emoji" label="Emojis contextuels" />
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <Icon.music className="h-3.5 w-3.5" />
                  Musique de fond (optionnel)
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={musicPath}
                    onChange={(e) => setMusicPath(e.target.value)}
                    placeholder="Coller un lien ou chemin local…"
                    className="flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 text-[12.5px] text-paper placeholder:text-muted/50 outline-none focus:border-rec/60"
                  />
                  <div className="flex items-center gap-2.5 sm:w-56">
                    <span className="whitespace-nowrap text-[11px] text-muted">Volume musique</span>
                    <input
                      type="range"
                      min="0"
                      max="0.6"
                      step="0.02"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-rec"
                    />
                    <span className="w-9 text-right font-mono text-[11px] text-muted">
                      {Math.round((musicVolume / 0.6) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- Étape 2 : lancer l'analyse -------------------- */}
        {transcript && !clips && (
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center justify-center gap-2 rounded-xl bg-rec py-3.5 text-[13.5px] font-semibold text-ink transition-transform hover:scale-[1.01] hover:bg-rec-dim active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
          >
            {analyzing ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Icon.sparkles className="h-4 w-4" />
                Trouver les meilleurs passages
              </>
            )}
          </button>
        )}

        {analyzeError && (
          <div className="rounded-lg border border-rec/30 bg-rec/10 px-4 py-3 text-[12.5px] text-rec">
            {analyzeError}
          </div>
        )}

        {/* -------------------- Étape 3 : segments détectés -------------------- */}
        {clips && (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                Segments détectés ({clips.length})
              </h3>
              <div className="flex items-center gap-2">
                {audioScoringUsed && (
                  <span className="rounded-full border border-play/20 bg-play/10 px-2.5 py-1 text-[11.5px] font-medium text-play">
                    Scoring audio activé
                  </span>
                )}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none rounded-lg border border-line bg-surface2 py-1.5 pl-3 pr-7 text-[11.5px] font-medium text-paper outline-none focus:border-rec/60"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Icon.chevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {orderedClips.map(({ clip, index: i }) => (
                <div key={i} className="relative rounded-xl border border-line bg-surface2 p-5">
                  <button
                    onClick={() => toggleStar(i)}
                    aria-label="Marquer ce segment"
                    className={`absolute right-3.5 top-3.5 transition-colors ${starred[i] ? "text-rec" : "text-muted hover:text-paper"}`}
                  >
                    <Icon.bookmark className={`h-4 w-4 ${starred[i] ? "fill-current" : ""}`} />
                  </button>

                  <div className="mb-2.5 flex flex-wrap items-center gap-2 pr-8">
                    <label className="font-mono text-[11.5px] text-muted">Début</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={videoDuration || undefined}
                      value={clip.start}
                      onChange={(e) => updateClipTime(i, "start", e.target.value)}
                      className="w-16 rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] text-paper outline-none focus:border-rec/60"
                    />
                    <label className="font-mono text-[11.5px] text-muted">Fin</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={videoDuration || undefined}
                      value={clip.end}
                      onChange={(e) => updateClipTime(i, "end", e.target.value)}
                      className="w-16 rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] text-paper outline-none focus:border-rec/60"
                    />
                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11.5px] text-muted">
                      {formatTime(clip.start)} → {formatTime(clip.end)} · {Math.round(clip.end - clip.start)}s
                    </span>
                  </div>

                  <p className="font-display text-[15px] font-semibold text-paper">"{clip.hook}"</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{clip.reason}</p>

                  {clip.social_caption && (
                    <p className="mt-2.5 rounded-lg bg-surface px-3 py-2 text-[12px] text-paper">
                      <span className="text-muted">Légende suggérée : </span>
                      {clip.social_caption}
                    </p>
                  )}
                  {clip.hashtags?.length > 0 && (
                    <p className="mt-2 text-[11.5px] font-medium text-play">{clip.hashtags.join(" ")}</p>
                  )}

                  <div className="mt-3.5 flex gap-2">
                    <button
                      onClick={() => previewClip(clip, i)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[12.5px] font-medium text-paper transition-colors hover:border-muted hover:bg-surface"
                    >
                      <Icon.play className="h-3.5 w-3.5" />
                      {previewingIndex === i ? "Lecture…" : "Aperçu"}
                    </button>

                    <button
                      onClick={() => runExport(clip, i)}
                      disabled={exportingIndex === i}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                        exportedIndexes[i] ? "bg-play/15 text-play hover:bg-play/20" : "bg-rec text-ink hover:bg-rec-dim"
                      }`}
                    >
                      {exportingIndex === i ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                      ) : exportedIndexes[i] ? (
                        <Icon.check className="h-4 w-4" />
                      ) : (
                        <Icon.download className="h-4 w-4" />
                      )}
                      {exportingIndex === i ? "Découpage en cours…" : exportedIndexes[i] ? "Exporté — relancer ?" : "Exporter"}
                    </button>
                  </div>

                  {exportErrors[i] && (
                    <div className="mt-2.5 rounded-lg border border-rec/30 bg-rec/10 px-3 py-2 text-[11.5px] text-rec">
                      {exportErrors[i]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 font-mono text-[12px] leading-relaxed text-muted/70">
              L'aperçu relit l'extrait directement dans le lecteur ci-dessus (aucun appel serveur).
              L'export génère le vrai fichier : format choisi, fond flouté, sous-titres karaoké, zoom,
              gradation, fondus et volume normalisé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}