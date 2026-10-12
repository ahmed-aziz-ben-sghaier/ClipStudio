import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const ffmpeg = createFFmpeg({ log: true });

/* Cinematic sunset tokens, shared with Home.jsx / Login.jsx / Register.jsx / Pricing.jsx / Dashboard.jsx / Navbar.jsx.
   If this is already loaded once at the app root, delete the <style> tag below. */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  .ember-text {
    background: linear-gradient(100deg,#ff9b5e 0%,#ff7a3d 38%,#c06ad6 78%,#8b5cf0 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
  }
  ::selection { background: #ff7a3d; color: #0a0a0f; }
`;

/* ------------------------------------------------------------------ */
/*  Icônes (SVG inline)                                                */
/* ------------------------------------------------------------------ */
const Icon = {
  upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 15.5V4M12 4 7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  scissors: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 8 20 19M20 5 8.5 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  text: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 6.5h14M12 6.5V18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  audio: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 17.5V6l9-2v11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15.5" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  effects: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  ),
  pause: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <rect x="7" y="5.5" width="4" height="13" rx="1" />
      <rect x="13" y="5.5" width="4" height="13" rx="1" />
    </svg>
  ),
  zoomOut: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-4.3-4.3M8 10.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  zoomIn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-4.3-4.3M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17.5v1.5A1.5 1.5 0 0 0 6.5 20.5h11a1.5 1.5 0 0 0 1.5-1.5v-1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  volumeOn: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15.5 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  volumeOff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m15 9.5 4 4M19 9.5l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  speed: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 16a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 16 16.2 9.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M11 3.5 12.4 8 17 9.4 12.4 10.8 11 15.3 9.6 10.8 5 9.4 9.6 8 11 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 13.5 18.8 16 21.3 16.8 18.8 17.6 18 20.1 17.2 17.6 14.7 16.8 17.2 16 18 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  wand: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m5 19 10-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.5 4.5v2.2M18.3 6.7l-1.6 1.6M19.5 11.5h2.2M17 13.9l1.6 1.6M8.5 5.5l1.3 1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function formatTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t - Math.floor(t)) * 30);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

function buildWaveform(seed, count = 120) {
  return Array.from({ length: count }, (_, i) =>
    10 + Math.round(38 * Math.abs(Math.sin(i * 0.45 + seed)))
  );
}

const FORMATS = [
  { id: "original", label: "Original", icon: "ratioWide", crop: null, ratio: null },
  { id: "vertical", label: "9:16", icon: "ratioVertical", crop: "crop=ih*9/16:ih", ratio: 9 / 16 },
  { id: "square", label: "1:1", icon: "ratioSquare", crop: "crop='min(iw,ih)':'min(iw,ih)'", ratio: 1 },
  { id: "landscape", label: "16:9", icon: "ratioWide", crop: "crop=iw:iw*9/16", ratio: 16 / 9 },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MAX_RECOMMENDED_SIZE = 500 * 1024 * 1024; // 500 Mo — au-delà, ffmpeg.wasm (client) devient instable

const EFFECTS = [
  { id: "none", label: "Original", filter: null, swatch: "linear-gradient(135deg,#8A8F98,#EDEAE3)", css: "" },
  { id: "bw", label: "Noir Master", filter: "hue=s=0", swatch: "linear-gradient(135deg,#3A3A3A,#DDDDDD)", css: "grayscale(1)" },
  { id: "contrast", label: "Contraste Pro", filter: "eq=contrast=1.35:saturation=1.15", swatch: "linear-gradient(135deg,#ff7a3d,#8b5cf0)", css: "contrast(1.35) saturate(1.15)" },
  { id: "warm", label: "Sunset Glow", filter: "colorbalance=rs=0.15:gs=0.05:bs=-0.1", swatch: "linear-gradient(135deg,#ffb86b,#ff7a3d)", css: "sepia(0.25) saturate(1.15)" },
  { id: "vignette", label: "Vignette Ciné", filter: "vignette=PI/5", swatch: "radial-gradient(circle,#f4efe9,#0a0a0f)", css: "" },
];

const TEXT_SIZE_CLASS = {
  sm: "text-sm sm:text-base",
  md: "text-lg sm:text-xl",
  lg: "text-2xl sm:text-3xl",
};

const TEXT_SIZE_FACTOR = { sm: 0.035, md: 0.05, lg: 0.07 };
const TEXT_Y_EXPR = { top: "h*0.08", center: "(h-text_h)/2", bottom: "h*0.85-text_h" };

/* ------------------------------------------------------------------ */
/*  Génération vidéo par IA — réglages                                 */
/* ------------------------------------------------------------------ */
const AI_STYLES = [
  { id: "realistic", label: "Réaliste", swatch: "linear-gradient(135deg,#4A5568,#CBD5E0)" },
  { id: "cinematic", label: "Cinématique", swatch: "linear-gradient(135deg,#3b1d5e,#ff7a3d)" },
  { id: "animation", label: "Animation", swatch: "linear-gradient(135deg,#ff9a76,#ffd97d)" },
  { id: "cartoon", label: "Cartoon", swatch: "linear-gradient(135deg,#8b5cf0,#ff7a3d)" },
];

const AI_DURATIONS = [5, 10, 15];

const AI_RATIOS = [
  { id: "vertical", label: "9:16", icon: "ratioVertical" },
  { id: "square", label: "1:1", icon: "ratioSquare" },
  { id: "landscape", label: "16:9", icon: "ratioWide" },
];

const AI_GENERATION_COST = 1; // crédits consommés pour une génération IA
const AI_PROMPT_MAX = 500;

const AI_LOADING_MESSAGES = [
  "Analyse de la description…",
  "Composition des scènes…",
  "Génération des images clés…",
  "Animation des mouvements…",
  "Rendu final en cours…",
];

/* Échappe le texte pour l'insérer dans un filtre ffmpeg drawtext */
function escapeDrawtext(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

/* Construit le filtre drawtext à partir des réglages de texte */
function buildTextFilter(overlay) {
  if (!overlay.enabled || !overlay.content.trim()) return null;
  const sizeFactor = TEXT_SIZE_FACTOR[overlay.size] || TEXT_SIZE_FACTOR.md;
  const yExpr = TEXT_Y_EXPR[overlay.position] || TEXT_Y_EXPR.bottom;
  const color = overlay.color.replace("#", "0x");
  const text = escapeDrawtext(overlay.content);
  return `drawtext=fontfile=/font.ttf:text='${text}':fontsize=h*${sizeFactor}:fontcolor=${color}:x=(w-text_w)/2:y=${yExpr}:box=1:boxcolor=0x000000@0.35:boxborderw=14`;
}

/* Construit les filtres ffmpeg à partir des réglages globaux */
function buildFilters({ cropFilter, effectFilter, textFilter, speed, volume, muted }) {
  const vParts = [];
  if (cropFilter) vParts.push(cropFilter);
  if (effectFilter) vParts.push(effectFilter);
  if (textFilter) vParts.push(textFilter);
  if (speed !== 1) vParts.push(`setpts=PTS/${speed}`);
  const vf = vParts.length ? vParts.join(",") : null;

  const aParts = [];
  if (speed !== 1) aParts.push(`atempo=${speed}`);
  if (!muted && volume !== 1) aParts.push(`volume=${volume}`);
  const af = aParts.length ? aParts.join(",") : null;

  return { vf, af };
}

export default function VideoEditor({ initialProject, initialFile } = {}) {
  const { token, refreshUser, user } = useAuth();
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);
  const trackRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pxPerSecond, setPxPerSecond] = useState(60);
  const [dragging, setDragging] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [splitFlash, setSplitFlash] = useState(false);

  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Réglages d'export globaux
  const [format, setFormat] = useState("original");
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [effect, setEffect] = useState("none");
  const [textOverlay, setTextOverlay] = useState({
    enabled: false,
    content: "",
    position: "bottom", // top | center | bottom
    color: "#f4efe9",
    size: "md", // sm | md | lg
  });

  // Outil actif dans le rail (pilote le défilement du panneau latéral)
  const [activeTool, setActiveTool] = useState("trim");
  const speedSectionRef = useRef(null);
  const audioSectionRef = useRef(null);
  const textSectionRef = useRef(null);
  const effectsSectionRef = useRef(null);
  const fontLoadedRef = useRef(false);

  const scrollToSection = (ref, tool) => {
    setActiveTool(tool);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Liste de clips (plusieurs extraits d'une même vidéo)
  const [clipList, setClipList] = useState([]); // { id, start, end }
  const [exportingId, setExportingId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [resultsById, setResultsById] = useState({}); // { [id]: url }

  /* -------------------- Génération vidéo par IA -------------------- */
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("cinematic");
  const [aiDuration, setAiDuration] = useState(10);
  const [aiRatio, setAiRatio] = useState("vertical");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessageIdx, setAiMessageIdx] = useState(0);
  const [aiResultUrl, setAiResultUrl] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiInserting, setAiInserting] = useState(false);
  const aiPollRef = useRef(null);
  const aiMessageIntervalRef = useRef(null);

  const waveform = useMemo(() => buildWaveform(duration || 1), [duration]);

  // Charge la vidéo existante quand on ouvre un projet depuis le dashboard
  // (ex: clic sur une carte dans "Projets récents"), ou un fichier en attente
  // (ex: import direct depuis le dashboard).
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;

    if (initialProject?.videoUrl) {
      initialLoadDone.current = true;
      setError("");
      setNotice("");
      setVideoUrl(initialProject.videoUrl);

      // ffmpeg.wasm a besoin d'un fichier local (pas d'une URL distante) pour
      // pouvoir ré-exporter/monter la vidéo -> on récupère aussi le blob.
      fetch(initialProject.videoUrl)
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.blob();
        })
        .then((blob) => {
          const file = new File(
            [blob],
            `${initialProject.title || "projet"}.mp4`,
            { type: blob.type || "video/mp4" }
          );
          setVideoFile(file);
        })
        .catch((err) => {
          console.error("Impossible de charger la vidéo du projet :", err);
          setError(
            "La vidéo de ce projet n'a pas pu être chargée depuis le serveur."
          );
        });
    } else if (initialFile) {
      initialLoadDone.current = true;
      loadFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject, initialFile]);

  useEffect(() => {
    ffmpeg.setProgress(({ ratio }) => setProgress(Math.round(Math.max(0, ratio) * 100)));
    ffmpeg
      .load()
      .then(() => setFfmpegReady(true))
      .catch(() => setError("Impossible de charger le moteur vidéo (ffmpeg.wasm)."));
  }, []);

  // Libère les URL de blobs à la fermeture du studio, pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      Object.values(resultsById).forEach((url) => URL.revokeObjectURL(url));
      if (aiPollRef.current) clearTimeout(aiPollRef.current);
      if (aiMessageIntervalRef.current) clearInterval(aiMessageIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- Chargement du fichier -------------------- */
  const loadFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Ce fichier n'est pas une vidéo. Formats acceptés : MP4, MOV, WebM…");
      return;
    }
    setError("");
    setNotice(
      file.size > MAX_RECOMMENDED_SIZE
        ? "Fichier volumineux : le traitement se fait dans ton navigateur, il peut être lent au-delà de 500 Mo."
        : ""
    );
    setVideoFile(file);
    setClipList([]);
    setResultsById((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
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

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    const d = v.duration;
    setDuration(d);
    setEnd(d);
    setStart(0);
    setPlayhead(0);
    setVideoDims({ width: v.videoWidth, height: v.videoHeight });
    const containerWidth = scrollRef.current?.clientWidth || 800;
    setPxPerSecond(Math.max(20, Math.min(160, Math.floor(containerWidth / Math.max(d, 1)))));
  };

  /* -------------------- Lecture / pause -------------------- */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.currentTime = Math.max(start, Math.min(playhead, end));
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      setPlayhead(v.currentTime);
      if (v.currentTime >= end) {
        v.pause();
        setIsPlaying(false);
      }
    };
    const onEnded = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, [end]);

  /* -------------------- Découpage (division au niveau du curseur) -------------------- */
  const canSplit = videoUrl && playhead > start + 0.15 && playhead < end - 0.15;

  const splitAtPlayhead = useCallback(() => {
    if (!videoUrl) return;
    if (playhead <= start + 0.15 || playhead >= end - 0.15) {
      setNotice("Place la tête de lecture entre les points IN et OUT pour diviser.");
      return;
    }
    const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const splitPoint = playhead;
    setClipList((list) => [
      ...list,
      { id: makeId(), start, end: splitPoint },
      { id: makeId(), start: splitPoint, end },
    ]);
    setNotice("Clip divisé en 2 segments, ajoutés à ta liste.");
    setSplitFlash(true);
    window.setTimeout(() => setSplitFlash(false), 350);
  }, [videoUrl, playhead, start, end]);

  /* -------------------- Raccourcis clavier -------------------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!videoUrl) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "i" || e.key === "I") {
        if (playhead < end - 0.1) setStart(playhead);
      } else if (e.key === "o" || e.key === "O") {
        if (playhead > start + 0.1) setEnd(playhead);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        splitAtPlayhead();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const delta = e.shiftKey ? 1 : 1 / 30;
        const t = Math.max(start, playhead - delta);
        setPlayhead(t);
        if (videoRef.current) videoRef.current.currentTime = t;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.shiftKey ? 1 : 1 / 30;
        const t = Math.min(end, playhead + delta);
        setPlayhead(t);
        if (videoRef.current) videoRef.current.currentTime = t;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoUrl, playhead, start, end, splitAtPlayhead]);

  /* -------------------- Conversion pixel <-> temps -------------------- */
  const timeToPx = useCallback((t) => t * pxPerSecond, [pxPerSecond]);

  const pxToTime = useCallback(
    (clientX) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      return Math.max(0, Math.min(duration, px / pxPerSecond));
    },
    [duration, pxPerSecond]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const t = pxToTime(clientX);
      if (dragging === "start") {
        setStart((s) => Math.min(t, end - 0.1));
      } else if (dragging === "end") {
        setEnd((en) => Math.max(t, start + 0.1));
      } else if (dragging === "playhead") {
        const clamped = Math.max(start, Math.min(end, t));
        setPlayhead(clamped);
        if (videoRef.current) videoRef.current.currentTime = clamped;
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, pxToTime, start, end]);

  const seekFromTrackClick = (e) => {
    if (dragging) return;
    const t = pxToTime(e.clientX);
    const clamped = Math.max(start, Math.min(end, t));
    setPlayhead(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
  };

  const zoom = (dir) => setPxPerSecond((v) => Math.max(20, Math.min(300, v + dir * 20)));

  /* -------------------- Aperçu de cadrage (overlay sur la vidéo) -------------------- */
  const cropOverlay = useMemo(() => {
    const activeFormat = FORMATS.find((f) => f.id === format);
    if (!activeFormat?.ratio || !videoDims.width || !videoDims.height) return null;
    const sourceRatio = videoDims.width / videoDims.height;
    const targetRatio = activeFormat.ratio;
    let wFrac, hFrac;
    if (targetRatio <= sourceRatio) {
      wFrac = targetRatio / sourceRatio;
      hFrac = 1;
    } else {
      wFrac = 1;
      hFrac = sourceRatio / targetRatio;
    }
    return {
      width: `${wFrac * 100}%`,
      height: `${hFrac * 100}%`,
      top: `${((1 - hFrac) / 2) * 100}%`,
      left: `${((1 - wFrac) / 2) * 100}%`,
    };
  }, [format, videoDims]);

  /* -------------------- Liste de clips -------------------- */
  const addToClipList = () => {
    if (end - start < 0.2) {
      setNotice("La sélection doit durer au moins 0,2 seconde avant d'être ajoutée.");
      return;
    }
    setNotice("");
    setClipList((list) => [
      ...list,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, start, end },
    ]);
  };

  const removeClip = (id) => {
    setClipList((list) => list.filter((c) => c.id !== id));
    setResultsById((r) => {
      if (r[id]) URL.revokeObjectURL(r[id]);
      const copy = { ...r };
      delete copy[id];
      return copy;
    });
  };

  const dismissResult = (id) => {
    setResultsById((r) => {
      if (r[id]) URL.revokeObjectURL(r[id]);
      const copy = { ...r };
      delete copy[id];
      return copy;
    });
  };

  /* -------------------- Export (utilisé pour le clip courant ET la liste) -------------------- */
  const runExport = async (id, clipStart, clipEnd) => {
    if (!videoFile || !ffmpegReady || exportingId) return;
    if (!user || user.credits <= 0) {
      setError("Crédits insuffisants pour exporter ce clip.");
      return;
    }

    setError("");
    setExportingId(id);
    setProgress(0);

    try {
      ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

      const activeFormat = FORMATS.find((f) => f.id === format);
      const activeEffect = EFFECTS.find((fx) => fx.id === effect);
      const textFilter = buildTextFilter(textOverlay);

      if (textFilter && !fontLoadedRef.current) {
        try {
          const fontData = await fetchFile("/fonts/clipstudio-text.ttf");
          ffmpeg.FS("writeFile", "font.ttf", fontData);
          fontLoadedRef.current = true;
        } catch (fontErr) {
          throw new Error("FONT_MISSING");
        }
      }

      const { vf, af } = buildFilters({
        cropFilter: activeFormat?.crop || null,
        effectFilter: activeEffect?.filter || null,
        textFilter,
        speed,
        volume,
        muted,
      });

      const clipDuration = (clipEnd - clipStart).toFixed(2);
      const args = ["-i", "input.mp4", "-ss", `${clipStart}`, "-t", `${clipDuration}`];
      if (vf) args.push("-vf", vf);
      if (muted) {
        args.push("-an");
      } else if (af) {
        args.push("-af", af);
      }
      args.push("-c:v", "libx264", "-preset", "ultrafast");
      if (!muted) args.push("-c:a", "aac");
      args.push("output.mp4");

      await ffmpeg.run(...args);

      const data = ffmpeg.FS("readFile", "output.mp4");
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setResultsById((r) => {
        if (r[id]) URL.revokeObjectURL(r[id]);
        return { ...r, [id]: url };
      });

      await api.consumeCredit(token);
      await refreshUser();

      // Sauvegarde le clip fini côté serveur pour qu'il reste disponible dans
      // "Mes projets" — n'empêche jamais le téléchargement local si ça échoue.
      try {
        const baseTitle = videoFile?.name?.replace(/\.[^.]+$/, "") || "Clip sans titre";
        const form = new FormData();
        form.append("video", blob, id === "current" ? "export.mp4" : `clip-${id}.mp4`);
        form.append("title", id === "current" ? baseTitle : `${baseTitle} — extrait`);
        form.append("duration", clipDuration);
        form.append("ratio", activeFormat?.label || "16:9");
        form.append("status", "exporté");
        await api.createProject(form, token);
      } catch (persistErr) {
        console.error("Sauvegarde du projet impossible :", persistErr);
        setNotice("Le clip est téléchargeable, mais n'a pas pu être sauvegardé dans « Mes projets ».");
      }
    } catch (err) {
      console.error(err);
      if (err?.message === "FONT_MISSING") {
        setError("Police introuvable pour le texte. Ajoute un fichier public/fonts/clipstudio-text.ttf à ton projet.");
      } else {
        setError("Erreur pendant le traitement de la vidéo.");
      }
    } finally {
      setExportingId(null);
      setProgress(0);
      try {
        ffmpeg.FS("unlink", "output.mp4");
      } catch (_) {}
    }
  };

  /* -------------------- Génération vidéo par IA -------------------- */
  const openAiModal = () => {
    setAiModalOpen(true);
    setActiveTool("ai");
  };

  const closeAiModal = () => {
    if (aiGenerating) return; // on ne ferme pas pendant un rendu en cours
    setAiModalOpen(false);
    setAiError("");
  };

  // Fait défiler les messages de statut pendant la génération, pour un rendu "vivant"
  useEffect(() => {
    if (!aiGenerating) {
      if (aiMessageIntervalRef.current) clearInterval(aiMessageIntervalRef.current);
      return;
    }
    setAiMessageIdx(0);
    aiMessageIntervalRef.current = setInterval(() => {
      setAiMessageIdx((i) => Math.min(i + 1, AI_LOADING_MESSAGES.length - 1));
    }, 3200);
    return () => clearInterval(aiMessageIntervalRef.current);
  }, [aiGenerating]);

  // Interroge périodiquement le statut d'une génération IA en cours (pattern job asynchrone)
  const pollAiJob = useCallback(
    (jobId) => {
      aiPollRef.current = setTimeout(async () => {
        try {
          const status = await api.getAiGenerationStatus(token, jobId);
          setAiProgress(status.progress ?? 0);

          if (status.status === "completed" && status.videoUrl) {
            setAiGenerating(false);
            setAiResultUrl(status.videoUrl);
            await refreshUser();
          } else if (status.status === "failed") {
            setAiGenerating(false);
            setAiError(status.errorMessage || "La génération a échoué. Réessaie avec une description différente.");
          } else {
            pollAiJob(jobId); // toujours en cours de traitement
          }
        } catch (err) {
          console.error(err);
          setAiGenerating(false);
          setAiError("Impossible de récupérer le statut de la génération.");
        }
      }, 2500);
    },
    [token]
  );

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Décris la vidéo que tu veux générer.");
      return;
    }
    if (!user || user.credits < AI_GENERATION_COST) {
      setAiError(`Il te faut au moins ${AI_GENERATION_COST} crédits pour générer une vidéo IA.`);
      return;
    }

    setAiError("");
    setAiResultUrl(null);
    setAiGenerating(true);
    setAiProgress(0);

    try {
      // api.generateAiVideo doit appeler ton backend, qui relaie la demande au
      // fournisseur de génération vidéo choisi (ex. Runway, Luma, Pika, Kling…)
      // et retourne un identifiant de job à interroger.
      const { jobId } = await api.generateAiVideo(token, {
        prompt: aiPrompt.trim(),
        style: aiStyle,
        duration: aiDuration,
        ratio: aiRatio,
      });
      pollAiJob(jobId);
    } catch (err) {
      console.error(err);
      setAiGenerating(false);
      setAiError("Impossible de lancer la génération. Réessaie dans un instant.");
    }
  };

  const regenerateWithAI = () => {
    setAiResultUrl(null);
    generateWithAI();
  };

  // Récupère la vidéo générée par l'IA et l'insère directement dans le studio de montage
  const insertGeneratedVideo = async () => {
    if (!aiResultUrl) return;
    setAiInserting(true);
    try {
      const res = await fetch(aiResultUrl);
      const blob = await res.blob();
      const file = new File([blob], "generation-ia.mp4", { type: blob.type || "video/mp4" });
      loadFile(file);

      // Sauvegarde le résultat brut de l'IA en brouillon, pour ne pas le perdre
      // (ni le crédit dépensé) même si le montage n'est jamais terminé/exporté.
      try {
        const ratioLabel = AI_RATIOS.find((r) => r.id === aiRatio)?.label || "9:16";
        const form = new FormData();
        form.append("video", blob, "generation-ia.mp4");
        form.append("title", aiPrompt.trim().slice(0, 60) || "Vidéo générée par IA");
        form.append("duration", String(aiDuration));
        form.append("ratio", ratioLabel);
        form.append("status", "brouillon");
        await api.createProject(form, token);
      } catch (persistErr) {
        console.error("Sauvegarde du brouillon IA impossible :", persistErr);
      }

      setAiModalOpen(false);
      setAiResultUrl(null);
      setAiPrompt("");
    } catch (err) {
      console.error(err);
      setAiError("Impossible d'importer la vidéo générée dans le studio.");
    } finally {
      setAiInserting(false);
    }
  };

  const trackWidth = Math.max(duration * pxPerSecond, scrollRef.current?.clientWidth || 0);
  const clipSeconds = Math.max(0, end - start);
  const isCreditsError = error.includes("Crédits insuffisants");

  const rulerStep = pxPerSecond > 90 ? 1 : pxPerSecond > 40 ? 5 : 10;
  const rulerMarks = [];
  for (let t = 0; t <= duration; t += rulerStep) rulerMarks.push(t);

  return (
    <div className="font-body flex h-screen flex-col bg-[#0a0a0f] pt-14 text-[#f4efe9]">
      <style>{GLOBAL_CSS}</style>
      <div className="hidden items-center justify-center gap-2 border-b border-[rgba(244,239,233,0.10)] bg-[#13101d] px-4 py-2 text-center font-display text-[11px] text-[#f4efe9]/55 max-lg:flex">
        Le studio est optimisé pour un écran large — passe sur ordinateur pour la meilleure expérience.
      </div>

      {/* ---------- Barre supérieure ---------- */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(244,239,233,0.10)] bg-[#0e0d16] px-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_6px_16px_-6px_rgba(139,92,240,0.6)]"
            style={{ background: "linear-gradient(135deg,#8b5cf0,#ff7a3d)" }}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#0a0a0f">
              <path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3.4l4-2.3v9.8l-4-2.3V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
            </svg>
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-bold text-[#f4efe9]">
              ClipStudio <span className="text-[#ff7a3d]">Pro</span>
            </span>
            <span className="max-w-[240px] truncate font-display text-[10px] uppercase tracking-[0.14em] text-[#f4efe9]/45">
              {videoFile ? videoFile.name : "AI Mastering Engine v3.0"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#13101d] border border-[rgba(244,239,233,0.10)] px-3.5 py-1.5 font-display text-[12px] font-medium text-[#f4efe9]">
            {user?.credits ?? 0} Crédits
          </span>
          <button
            onClick={openAiModal}
            className="flex items-center gap-1.5 rounded-full border border-[#ff7a3d]/40 bg-[#ff7a3d]/10 px-3.5 py-2 text-[13px] font-medium text-[#ff7a3d] transition-colors hover:bg-[#ff7a3d]/20"
          >
            <Icon.sparkles className="h-4 w-4" />
            Générer IA
          </button>
          <button
            onClick={addToClipList}
            disabled={!videoUrl}
            className="hidden lg:flex rounded-full border border-[rgba(244,239,233,0.10)] px-3.5 py-2 text-[13px] font-medium text-[#f4efe9] transition-colors hover:border-[#f4efe9]/25 hover:bg-[#13101d] disabled:opacity-30"
          >
            + Ma liste
          </button>
          <button
            onClick={() => runExport("current", start, end)}
            disabled={!videoFile || !ffmpegReady || !!exportingId}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] shadow-[0_8px_18px_-8px_rgba(255,122,61,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: "linear-gradient(100deg,#ff9b5e,#ff7a3d)" }}
          >
            <Icon.download className="h-3.5 w-3.5" />
            {exportingId === "current" ? `Export… ${progress}%` : "Exporter"}
          </button>
        </div>
      </header>

      {resultsById.current && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[rgba(244,239,233,0.10)] bg-[#8b5cf0]/10 px-6 py-2">
          <span className="flex items-center gap-2 text-[12.5px] text-[#8b5cf0]">
            <Icon.check className="h-3.5 w-3.5" />
            Export prêt
          </span>
          <div className="flex items-center gap-4">
            <a
              href={resultsById.current}
              download="clip.mp4"
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#8b5cf0] hover:underline"
            >
              <Icon.download className="h-3.5 w-3.5" />
              Télécharger
            </a>
            <button
              onClick={() => dismissResult("current")}
              className="text-[#f4efe9]/55 hover:text-[#f4efe9]"
              aria-label="Fermer la notification"
            >
              <Icon.close className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ---------- Corps ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* Rail d'outils */}
        <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-[rgba(244,239,233,0.10)] bg-[#0e0d16] py-4">
          <button
            onClick={() => fileRef.current?.click()}
            title="Importer un média"
            aria-label="Importer un média"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#f4efe9]/55 transition-colors hover:bg-[#13101d] hover:text-[#f4efe9]"
          >
            <Icon.upload className="h-[18px] w-[18px]" />
          </button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

          <button
            onClick={openAiModal}
            title="Générer avec l'IA"
            aria-label="Générer une vidéo avec l'IA"
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
              activeTool === "ai"
                ? "bg-[#ff7a3d] text-[#0a0a0f] shadow-[0_6px_16px_-6px_rgba(255,122,61,0.7)]"
                : "text-[#f4efe9]/55 hover:bg-[#13101d] hover:text-[#f4efe9]"
            }`}
          >
            <Icon.sparkles className="h-[18px] w-[18px]" />
          </button>

          <div className="my-1 h-px w-8 bg-[rgba(244,239,233,0.10)]" />

          <div
            title="Découpe"
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              activeTool === "trim"
                ? "bg-[#ff7a3d] text-[#0a0a0f] shadow-[0_6px_16px_-6px_rgba(255,122,61,0.7)]"
                : "text-[#f4efe9]/55"
            }`}
          >
            <Icon.scissors className="h-[18px] w-[18px]" />
          </div>

          {[
            { icon: "speed", label: "Vitesse", ref: speedSectionRef, tool: "speed" },
            { icon: "audio", label: "Audio", ref: audioSectionRef, tool: "audio" },
            { icon: "text", label: "Texte", ref: textSectionRef, tool: "text" },
            { icon: "effects", label: "Effets", ref: effectsSectionRef, tool: "effects" },
          ].map((t) => {
            const active = activeTool === t.tool;
            return (
              <button
                key={t.icon}
                onClick={() => scrollToSection(t.ref, t.tool)}
                title={t.label}
                aria-label={t.label}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-[#ff7a3d] text-[#0a0a0f] shadow-[0_6px_16px_-6px_rgba(255,122,61,0.7)]"
                    : "text-[#f4efe9]/55 hover:bg-[#13101d] hover:text-[#f4efe9]"
                }`}
              >
                {Icon[t.icon]({ className: "h-[18px] w-[18px]" })}
              </button>
            );
          })}

          {/* Bas du rail — repères visuels, purement décoratifs */}
          <div className="mt-auto flex flex-col items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[#f4efe9]/40">
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 13.5a1.7 1.7 0 0 0 .35 1.9l.05.05a2 2 0 1 1-2.9 2.9l-.05-.05a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.9.35l-.05.05a2 2 0 1 1-2.9-2.9l.05-.05a1.7 1.7 0 0 0 .35-1.9 1.7 1.7 0 0 0-1.55-1H4.4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.35-1.9l-.05-.05a2 2 0 1 1 2.9-2.9l.05.05a1.7 1.7 0 0 0 1.9.35H10.5a1.7 1.7 0 0 0 1-1.55V4.4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.9-.35l.05-.05a2 2 0 1 1 2.9 2.9l-.05.05a1.7 1.7 0 0 0-.35 1.9v.1a1.7 1.7 0 0 0 1.55 1H19.6a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.55 1Z" />
              </svg>
            </span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full font-display text-[12px] font-semibold text-[#f4efe9]"
              style={{ background: "linear-gradient(135deg,#8b5cf0,#ff7a3d)" }}
            >
              {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </aside>

        {/* Colonne centrale : aperçu + lecture */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="flex flex-1 items-center justify-center bg-black/40 p-6"
          >
            {!videoUrl ? (
              <div className="flex w-full max-w-md flex-col items-center gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-[#f4efe9]/55 transition-colors ${
                    isDraggingOver
                      ? "border-[#ff7a3d]/70 bg-[#ff7a3d]/5 text-[#f4efe9]"
                      : "border-[rgba(244,239,233,0.10)] hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                  }`}
                >
                  <Icon.upload className="h-8 w-8" />
                  <span className="text-[13.5px] font-medium">
                    {isDraggingOver ? "Dépose ton fichier ici" : "Importer une vidéo pour commencer"}
                  </span>
                  <span className="text-[11.5px]">Glisser-déposer ou clic — MP4 recommandé</span>
                </button>
                <div className="flex w-full items-center gap-3 text-[11px] text-[#f4efe9]/40">
                  <div className="h-px flex-1 bg-[rgba(244,239,233,0.10)]" />
                  ou
                  <div className="h-px flex-1 bg-[rgba(244,239,233,0.10)]" />
                </div>
                <button
                  onClick={openAiModal}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ff7a3d]/40 bg-[#ff7a3d]/10 py-4 text-[13.5px] font-medium text-[#ff7a3d] transition-colors hover:bg-[#ff7a3d]/20"
                >
                  <Icon.sparkles className="h-[18px] w-[18px]" />
                  Générer une vidéo à partir d'une description
                </button>
              </div>
            ) : (
              <div className="relative inline-block max-h-full max-w-full overflow-hidden rounded-xl leading-none">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={onLoadedMetadata}
                  className="block max-h-full max-w-full bg-black"
                  style={{ filter: EFFECTS.find((fx) => fx.id === effect)?.css || "" }}
                />
                {effect === "vignette" && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ boxShadow: "inset 0 0 12% 4% rgba(0,0,0,0.55)" }}
                    aria-hidden="true"
                  />
                )}
                {cropOverlay && (
                  <div
                    className="pointer-events-none absolute border-2 border-[#8b5cf0]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    style={cropOverlay}
                    aria-hidden="true"
                  />
                )}
                {textOverlay.enabled && textOverlay.content.trim() && (
                  <div
                    className={`pointer-events-none absolute inset-0 flex justify-center px-[6%] py-[6%] text-center font-display font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ${TEXT_SIZE_CLASS[textOverlay.size]} ${
                      textOverlay.position === "top"
                        ? "items-start"
                        : textOverlay.position === "center"
                        ? "items-center"
                        : "items-end"
                    }`}
                    style={{ color: textOverlay.color }}
                    aria-hidden="true"
                  >
                    <span className="whitespace-pre-wrap rounded-md bg-black/35 px-3 py-1.5">
                      {textOverlay.content}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="relative flex h-16 shrink-0 items-center justify-center border-t border-[rgba(244,239,233,0.10)] px-6">
              <div className="flex items-center gap-4 rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-3 py-2">
                <button
                  onClick={() => {
                    const t = Math.max(start, playhead - 1 / 30);
                    setPlayhead(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                  aria-label="Image précédente"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#f4efe9]/60 transition-colors hover:bg-[#0e0d16] hover:text-[#f4efe9]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18 6.5v11l-9-5.5 9-5.5ZM6 6h2v12H6V6Z" /></svg>
                </button>
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Mettre en pause" : "Lire"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4efe9] text-[#0a0a0f] shadow-[0_6px_16px_-4px_rgba(244,239,233,0.4)]"
                >
                  {isPlaying ? <Icon.pause className="h-4 w-4" /> : <Icon.play className="h-4 w-4 translate-x-0.5" />}
                </button>
                <button
                  onClick={() => {
                    const t = Math.min(end, playhead + 1 / 30);
                    setPlayhead(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                  aria-label="Image suivante"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#f4efe9]/60 transition-colors hover:bg-[#0e0d16] hover:text-[#f4efe9]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M6 6.5v11l9-5.5-9-5.5ZM16 6h2v12h-2V6Z" /></svg>
                </button>
                <span className="font-display text-[12.5px] tabular-nums text-[#f4efe9] pl-1">
                  {formatTime(playhead)}
                  <span className="text-[#f4efe9]/45"> / {formatTime(duration)}</span>
                </span>
                <button
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Activer le son" : "Couper le son"}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#f4efe9]/60 transition-colors hover:bg-[#0e0d16] hover:text-[#f4efe9]"
                >
                  {muted ? <Icon.volumeOff className="h-4 w-4" /> : <Icon.volumeOn className="h-4 w-4" />}
                </button>
              </div>
              <span className="absolute right-6 font-display text-[12.5px] text-[#f4efe9]/55">
                Sélection : <span className="text-[#f4efe9]">{formatTime(clipSeconds)}</span>
              </span>
            </div>
          )}

          {error && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[rgba(244,239,233,0.10)] bg-[#ff7a3d]/10 px-6 py-2.5 text-[12.5px] text-[#ff7a3d]">
              <span>{error}</span>
              {isCreditsError && (
                <Link to="/pricing" className="shrink-0 font-medium underline hover:text-[#f4efe9]">
                  Voir les tarifs
                </Link>
              )}
            </div>
          )}
          {!error && notice && (
            <div className="shrink-0 border-t border-[rgba(244,239,233,0.10)] bg-[#8b5cf0]/10 px-6 py-2.5 text-[12.5px] text-[#8b5cf0]">
              {notice}
            </div>
          )}

          {/* ---------- Timeline ---------- */}
          <div className="flex h-56 shrink-0 flex-col border-t border-[rgba(244,239,233,0.10)] bg-[#0e0d16]">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[rgba(244,239,233,0.10)] px-4">
              <button
                onClick={splitAtPlayhead}
                title="Diviser au niveau du curseur (S)"
                disabled={!canSplit}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#f4efe9]/70 transition-colors hover:bg-[#13101d] hover:text-[#f4efe9] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Icon.scissors className="h-3.5 w-3.5" />
                Diviser
              </button>
              <button
                title="Supprimer (bientôt disponible)"
                disabled={!videoUrl}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#f4efe9]/70 transition-colors hover:bg-[#13101d] hover:text-[#f4efe9] disabled:opacity-30"
              >
                <Icon.trash className="h-3.5 w-3.5" />
                Supprimer
              </button>
              <div className="flex items-center gap-1 rounded-full border border-[rgba(244,239,233,0.10)] px-1 py-1">
                <button
                  onClick={() => zoom(-1)}
                  aria-label="Zoom arrière"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#f4efe9]/55 hover:bg-[#13101d] hover:text-[#f4efe9]"
                >
                  <Icon.zoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="px-1 font-display text-[11px] text-[#f4efe9]/55">Zoom</span>
                <button
                  onClick={() => zoom(1)}
                  aria-label="Zoom avant"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#f4efe9]/55 hover:bg-[#13101d] hover:text-[#f4efe9]"
                >
                  <Icon.zoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="ml-auto rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-3 py-1.5 font-display text-[11px] text-[#f4efe9]/60">
                Séquence 01
              </span>
            </div>

            <div ref={scrollRef} className="relative flex-1 overflow-x-auto overflow-y-hidden px-4 py-3">
              {!videoUrl ? (
                <div className="flex h-full items-center text-[12.5px] text-[#f4efe9]/40">
                  La timeline apparaîtra ici après l'import d'une vidéo.
                </div>
              ) : (
                <div ref={trackRef} className="relative" style={{ width: trackWidth }}>
                  <div className="relative h-5 select-none">
                    {rulerMarks.map((t) => (
                      <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: timeToPx(t) }}>
                        <div className="h-2 w-px bg-[rgba(244,239,233,0.10)]" />
                        <span className="mt-0.5 font-display text-[10px] text-[#f4efe9]/40">{formatTime(t).slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    onMouseDown={seekFromTrackClick}
                    className="relative mt-2 h-[72px] cursor-pointer overflow-hidden rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#13101d]"
                  >
                    <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: timeToPx(start) }} />
                    <div className="absolute inset-y-0 bg-black/55" style={{ left: timeToPx(end), right: 0 }} />

                    <div className="absolute inset-x-0 bottom-2 flex h-8 items-end gap-[2px] px-1">
                      {waveform.map((h, i) => (
                        <span
                          key={i}
                          className="rounded-sm"
                          style={{
                            height: `${h}%`,
                            width: Math.max(2, trackWidth / waveform.length - 2),
                            background: "linear-gradient(180deg,#ff9b5e,#ff7a3d)",
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>

                    <div
                      onMouseDown={(e) => { e.stopPropagation(); setDragging("playhead"); }}
                      onTouchStart={(e) => { e.stopPropagation(); setDragging("playhead"); }}
                      className={`absolute top-0 z-20 h-full w-[2px] cursor-ew-resize bg-[#ff7a3d] transition-transform duration-150 ${
                        splitFlash ? "scale-x-[3]" : ""
                      }`}
                      style={{ left: timeToPx(playhead) }}
                    >
                      <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-[#ff7a3d]" />
                    </div>
                  </div>

                  <div
                    onMouseDown={(e) => { e.stopPropagation(); setDragging("start"); }}
                    onTouchStart={(e) => { e.stopPropagation(); setDragging("start"); }}
                    className="absolute top-[28px] z-10 flex h-[72px] w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-full bg-[#8b5cf0]"
                    style={{ left: timeToPx(start) }}
                  >
                    <div className="h-6 w-[3px] rounded-full bg-[#0a0a0f]/70" />
                  </div>
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); setDragging("end"); }}
                    onTouchStart={(e) => { e.stopPropagation(); setDragging("end"); }}
                    className="absolute top-[28px] z-10 flex h-[72px] w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-full bg-[#8b5cf0]"
                    style={{ left: timeToPx(end) }}
                  >
                    <div className="h-6 w-[3px] rounded-full bg-[#0a0a0f]/70" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Panneau latéral : réglages + liste de clips ---------- */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-[rgba(244,239,233,0.10)] bg-[#0e0d16]">
          <div className="border-b border-[rgba(244,239,233,0.10)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">
                Format &amp; qualité
              </h3>
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-[#f4efe9]/35">?</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map((f) => {
                const active = format === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[10.5px] font-medium transition-all ${
                      active
                        ? "border-[#ff7a3d] bg-[#ff7a3d]/10 text-[#ff7a3d] shadow-[0_0_0_1px_rgba(255,122,61,0.3),0_8px_20px_-8px_rgba(255,122,61,0.5)]"
                        : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/45 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                    }`}
                  >
                    {Icon[f.icon]({ className: "h-5 w-5" })}
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-display text-[10.5px] text-[#f4efe9]/40">
              L'aperçu montre la zone conservée après recadrage.
            </p>
          </div>

          <div ref={audioSectionRef} className="border-b border-[rgba(244,239,233,0.10)] p-5">
            <h3 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">Audio</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Activer le son" : "Couper le son"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#f4efe9] hover:bg-[#13101d]"
              >
                {muted ? <Icon.volumeOff className="h-[18px] w-[18px]" /> : <Icon.volumeOn className="h-[18px] w-[18px]" />}
              </button>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volume}
                disabled={muted}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-[#ff7a3d] disabled:opacity-30"
              />
              <span className="w-10 text-right font-display text-[11.5px] text-[#f4efe9]/55">
                {muted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          <div ref={speedSectionRef} className="border-b border-[rgba(244,239,233,0.10)] p-5">
            <h3 className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">Vitesse</h3>
            <div className="flex flex-wrap gap-1.5">
              {SPEEDS.map((s) => {
                const active = speed === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`rounded-md border px-2.5 py-1.5 font-display text-[11.5px] font-medium transition-colors ${
                      active
                        ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                        : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                    }`}
                  >
                    {s}x
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={textSectionRef} className="border-b border-[rgba(244,239,233,0.10)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">Typography Engine</h3>
              <button
                onClick={() => setTextOverlay((t) => ({ ...t, enabled: !t.enabled }))}
                aria-pressed={textOverlay.enabled}
                aria-label={textOverlay.enabled ? "Désactiver le texte" : "Activer le texte"}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  textOverlay.enabled ? "bg-[#ff7a3d]" : "bg-[#13101d] border border-[rgba(244,239,233,0.10)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                    textOverlay.enabled ? "translate-x-4 bg-[#0a0a0f]" : "translate-x-0.5 bg-[#f4efe9]/40"
                  }`}
                />
              </button>
            </div>

            <textarea
              value={textOverlay.content}
              onChange={(e) => setTextOverlay((t) => ({ ...t, content: e.target.value }))}
              disabled={!textOverlay.enabled}
              placeholder="Ton titre ou sous-titre…"
              rows={2}
              className="mb-3 w-full resize-none rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-3 py-2 text-[12.5px] text-[#f4efe9] placeholder:text-[#f4efe9]/35 focus:outline-none focus:border-[#ff7a3d]/60 disabled:opacity-40"
            />

            <p className="mb-1.5 font-display text-[10px] uppercase tracking-wide text-[#f4efe9]/45">Position</p>
            <div className="mb-3 flex gap-1.5">
              {[
                { id: "top", label: "Haut" },
                { id: "center", label: "Centre" },
                { id: "bottom", label: "Bas" },
              ].map((pos) => {
                const active = textOverlay.position === pos.id;
                return (
                  <button
                    key={pos.id}
                    onClick={() => setTextOverlay((t) => ({ ...t, position: pos.id }))}
                    disabled={!textOverlay.enabled}
                    className={`flex-1 rounded-md border py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                      active
                        ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                        : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                    }`}
                  >
                    {pos.label}
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 font-display text-[10px] uppercase tracking-wide text-[#f4efe9]/45">Couleur</p>
            <div className="mb-3 flex items-center gap-2">
              {["#f4efe9", "#ff7a3d", "#8b5cf0", "#000000"].map((c) => (
                <button
                  key={c}
                  onClick={() => setTextOverlay((t) => ({ ...t, color: c }))}
                  disabled={!textOverlay.enabled}
                  aria-label={`Couleur ${c}`}
                  className={`h-6 w-6 rounded-full border-2 transition-colors disabled:opacity-40 ${
                    textOverlay.color === c ? "border-[#f4efe9]" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>

            <p className="mb-1.5 font-display text-[10px] uppercase tracking-wide text-[#f4efe9]/45">Taille</p>
            <div className="flex gap-1.5">
              {[
                { id: "sm", label: "S" },
                { id: "md", label: "M" },
                { id: "lg", label: "L" },
              ].map((sz) => {
                const active = textOverlay.size === sz.id;
                return (
                  <button
                    key={sz.id}
                    onClick={() => setTextOverlay((t) => ({ ...t, size: sz.id }))}
                    disabled={!textOverlay.enabled}
                    className={`flex-1 rounded-md border py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                      active
                        ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                        : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div ref={effectsSectionRef} className="border-b border-[rgba(244,239,233,0.10)] p-5">
            <h3 className="mb-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">Studio Presets</h3>
            <p className="mb-3 font-display text-[10.5px] text-[#f4efe9]/40">
              Appliqués à l'aperçu et gravés à l'export.
            </p>
            <div className="flex flex-col gap-2">
              {EFFECTS.map((fx) => {
                const active = effect === fx.id;
                return (
                  <button
                    key={fx.id}
                    onClick={() => setEffect(fx.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                      active ? "border-[#ff7a3d]/40 bg-[#ff7a3d]/5" : "border-[rgba(244,239,233,0.10)] hover:border-[#f4efe9]/25"
                    }`}
                  >
                    <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: fx.swatch }} />
                    <span className="flex-1 text-[12.5px] font-medium text-[#f4efe9]">{fx.label}</span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        active ? "bg-[#ff7a3d]" : "bg-[#13101d] border border-[rgba(244,239,233,0.10)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                          active ? "translate-x-4 bg-[#0a0a0f]" : "translate-x-0.5 bg-[#f4efe9]/40"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f4efe9]/55">
                Ma liste de clips
              </h3>
              <span className="text-[11px] text-[#f4efe9]/45">{clipList.length}</span>
            </div>

            {clipList.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-[#f4efe9]/45">
                Place tes points IN/OUT sur la timeline, puis clique sur
                « + Ajouter à ma liste » pour empiler plusieurs extraits à
                exporter d'une même vidéo (idéal pour tirer plusieurs shorts
                d'un stream ou d'un podcast).
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {clipList.map((c, idx) => {
                  const isExporting = exportingId === c.id;
                  const resultUrl = resultsById[c.id];
                  return (
                    <div key={c.id} className="rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#13101d] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[#f4efe9]">Clip {idx + 1}</span>
                        <button
                          onClick={() => removeClip(c.id)}
                          className="text-[#f4efe9]/55 hover:text-[#ff7a3d]"
                          title="Retirer de la liste"
                          aria-label={`Retirer le clip ${idx + 1} de la liste`}
                        >
                          <Icon.trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mb-2 font-display text-[11px] text-[#f4efe9]/55">
                        {formatTime(c.start).slice(0, 5)} → {formatTime(c.end).slice(0, 5)}
                        <span className="text-[#f4efe9]/40"> ({formatTime(c.end - c.start).slice(0, 5)})</span>
                      </p>

                      {resultUrl ? (
                        <a
                          href={resultUrl}
                          download={`clip-${idx + 1}.mp4`}
                          className="flex items-center justify-center gap-1.5 rounded-md border border-[rgba(244,239,233,0.10)] py-1.5 text-[11.5px] font-medium text-[#8b5cf0] transition-colors hover:bg-[#0e0d16]"
                        >
                          <Icon.download className="h-3.5 w-3.5" />
                          Télécharger
                        </a>
                      ) : (
                        <button
                          onClick={() => runExport(c.id, c.start, c.end)}
                          disabled={!!exportingId}
                          className="flex w-full items-center justify-center rounded-md bg-[#ff7a3d] py-1.5 text-[11.5px] font-semibold text-[#0a0a0f] disabled:opacity-40"
                        >
                          {isExporting ? `Export… ${progress}%` : "Exporter ce clip"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-auto pt-4">
              <p className="font-display text-[10px] leading-relaxed text-[#f4efe9]/40">
                <span className="text-[#f4efe9]/55">Espace</span> lecture · <span className="text-[#f4efe9]/55">I / O</span> in / out ·{" "}
                <span className="text-[#f4efe9]/55">S</span> diviser · <span className="text-[#f4efe9]/55">← →</span> image par image (maj = 1s)
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------- Modale de génération vidéo par IA ---------- */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeAiModal(); }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#ff7a3d]/30 bg-[#0e0d16] shadow-[0_30px_80px_-20px_rgba(255,122,61,0.3)]">
            {/* liseré dégradé en haut de la modale — les deux couleurs de la marque */}
            <div className="h-[3px] w-full bg-gradient-to-r from-[#ff7a3d] via-[#ff9b5e] to-[#8b5cf0]" />

            <div className="flex items-center justify-between border-b border-[rgba(244,239,233,0.10)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff7a3d]/15 text-[#ff7a3d]">
                  <Icon.sparkles className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h2 className="text-[14.5px] font-semibold text-[#f4efe9]">Générer avec l'IA</h2>
                  <p className="text-[11.5px] text-[#f4efe9]/55">Texte → vidéo, prêt à monter</p>
                </div>
              </div>
              <button
                onClick={closeAiModal}
                disabled={aiGenerating}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f4efe9]/55 transition-colors hover:bg-[#13101d] hover:text-[#f4efe9] disabled:opacity-30"
              >
                <Icon.close className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
              {aiResultUrl ? (
                /* -------- Résultat de la génération -------- */
                <div className="flex flex-col gap-4">
                  <div className="overflow-hidden rounded-xl border border-[rgba(244,239,233,0.10)] bg-black">
                    <video src={aiResultUrl} controls autoPlay loop className="max-h-[360px] w-full" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#8b5cf0]/20 bg-[#8b5cf0]/10 px-3.5 py-2.5 text-[12.5px] text-[#8b5cf0]">
                    <Icon.check className="h-4 w-4 shrink-0" />
                    Vidéo générée avec succès.
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={insertGeneratedVideo}
                      disabled={aiInserting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff7a3d] px-4 py-2.5 text-[13.5px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.02] hover:bg-[#ff9b5e] active:scale-[0.98] disabled:opacity-50"
                    >
                      {aiInserting ? "Import…" : "Utiliser dans le studio"}
                    </button>
                    <a
                      href={aiResultUrl}
                      download="generation-ia.mp4"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(244,239,233,0.10)] px-3.5 py-2.5 text-[13px] font-medium text-[#f4efe9] transition-colors hover:bg-[#13101d]"
                    >
                      <Icon.download className="h-4 w-4" />
                    </a>
                  </div>
                  <button
                    onClick={regenerateWithAI}
                    className="text-[12.5px] font-medium text-[#f4efe9]/55 transition-colors hover:text-[#f4efe9]"
                  >
                    Générer une nouvelle variante
                  </button>
                </div>
              ) : aiGenerating ? (
                /* -------- État de chargement -------- */
                <div className="flex flex-col items-center gap-5 py-10 text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#ff7a3d]/20" />
                    <span className="absolute inset-0 rounded-full border-2 border-[#ff7a3d]/30 border-t-[#ff7a3d] animate-spin" />
                    <Icon.wand className="h-6 w-6 text-[#ff7a3d]" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium text-[#f4efe9]">{AI_LOADING_MESSAGES[aiMessageIdx]}</p>
                    <p className="mt-1 font-display text-[11px] text-[#f4efe9]/55">Ça prend en général 30 à 90 secondes</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#13101d]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff7a3d] to-[#8b5cf0] transition-all duration-500"
                      style={{ width: `${Math.max(6, aiProgress)}%` }}
                    />
                  </div>
                </div>
              ) : (
                /* -------- Formulaire de génération -------- */
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[12px] font-medium text-[#f4efe9]">Description de la vidéo</label>
                      <span className="font-display text-[10.5px] text-[#f4efe9]/45">
                        {aiPrompt.length}/{AI_PROMPT_MAX}
                      </span>
                    </div>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value.slice(0, AI_PROMPT_MAX))}
                      placeholder="Ex : Un plan aérien d'une côte tunisienne au coucher du soleil, vagues douces, ambiance chaleureuse et cinématique…"
                      rows={4}
                      className="w-full resize-none rounded-xl border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-3.5 py-3 text-[13px] text-[#f4efe9] placeholder:text-[#f4efe9]/35 focus:outline-none focus:border-[#ff7a3d]/60"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] font-medium text-[#f4efe9]">Style</p>
                    <div className="grid grid-cols-4 gap-2">
                      {AI_STYLES.map((s) => {
                        const active = aiStyle === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setAiStyle(s.id)}
                            className={`flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-[10.5px] font-medium transition-colors ${
                              active
                                ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                                : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                            }`}
                          >
                            <span className="h-4 w-4 rounded-full" style={{ background: s.swatch }} />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div className="flex-1">
                      <p className="mb-2 text-[12px] font-medium text-[#f4efe9]">Durée</p>
                      <div className="flex gap-1.5">
                        {AI_DURATIONS.map((d) => {
                          const active = aiDuration === d;
                          return (
                            <button
                              key={d}
                              onClick={() => setAiDuration(d)}
                              className={`flex-1 rounded-lg border py-2 font-display text-[12px] font-medium transition-colors ${
                                active
                                  ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                                  : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                              }`}
                            >
                              {d}s
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="mb-2 text-[12px] font-medium text-[#f4efe9]">Format</p>
                      <div className="flex gap-1.5">
                        {AI_RATIOS.map((r) => {
                          const active = aiRatio === r.id;
                          return (
                            <button
                              key={r.id}
                              onClick={() => setAiRatio(r.id)}
                              className={`flex flex-1 items-center justify-center rounded-lg border py-2 transition-colors ${
                                active
                                  ? "border-[#ff7a3d]/50 bg-[#ff7a3d]/10 text-[#ff7a3d]"
                                  : "border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 hover:border-[#f4efe9]/25 hover:text-[#f4efe9]"
                              }`}
                              title={r.label}
                              aria-label={r.label}
                            >
                              {Icon[r.icon]({ className: "h-4 w-4" })}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {aiError && (
                    <div className="rounded-lg border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 px-3.5 py-2.5 text-[12px] text-[#ff7a3d]">
                      {aiError}
                    </div>
                  )}

                  <button
                    onClick={generateWithAI}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#ff7a3d] px-4 py-3 text-[13.5px] font-semibold text-[#0a0a0f] transition-transform hover:scale-[1.015] hover:bg-[#ff9b5e] active:scale-[0.98]"
                  >
                    <Icon.sparkles className="h-4 w-4" />
                    Générer la vidéo
                    <span className="flex items-center gap-1 rounded-full bg-[#0a0a0f]/15 px-2 py-0.5 text-[11.5px]">
                      {AI_GENERATION_COST} crédits
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}