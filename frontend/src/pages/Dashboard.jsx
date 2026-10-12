import { Component, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import VideoEditor from "../components/VideoEditor.jsx";
import ViralGenerator from "../components/ViralGenerator.jsx";
import VideoSummarizer from "../components/VideoSummarizer.jsx";

/* Cinematic sunset tokens, shared with Home.jsx / Login.jsx / Register.jsx / Pricing.jsx.
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
  .grain { position: relative; }
  .grain::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .3; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  ::selection { background: #ff7a3d; color: #0a0a0f; }
`;

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard a rencontré une erreur :", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="font-body flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] px-6 text-center text-[#f4efe9]">
          <style>{GLOBAL_CSS}</style>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 text-[#ff7a3d]">
            <Icon.alert className="h-5 w-5" />
          </div>
          <p className="font-display text-xl font-semibold">Une erreur est survenue</p>
          <p className="max-w-md text-[13.5px] leading-relaxed text-[#f4efe9]/55">
            {this.state.error?.message || "Le tableau de bord n'a pas pu s'afficher."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#ff7a3d] px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] transition-colors hover:bg-[#ff9b5e]"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Icon = {
  home: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  folder: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2a1.5 1.5 0 0 1 1.1.48L11.6 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  template: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  restore: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4.5 9.5A7.5 7.5 0 1 1 5 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.5 5v4.5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-4.3-4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3M15.5 16l4-4-4-4M19 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.2l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 9v4.5M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  sparkle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6l5.4-1.6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 3.2.9 4.9 1.6 5.8H4.4c.7-.9 1.6-2.6 1.6-5.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chevronRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6.5 3.5h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  gridView: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="4" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  listView: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="5.5" width="16" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  storage: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 6v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V6M4.5 12v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M8.5 3.5 9.6 7l3.4 1-3.4 1-1.1 3.5-1.1-3.5-3.4-1 3.4-1L8.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 11.5 17.3 14l2.4.7-2.4.7-.8 2.6-.8-2.6-2.4-.7 2.4-.7.8-2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  glitch: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3.5 7h7l-1 3h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12h-7l1-3H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d="M4.5 17h7l-1-3h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  ),
  clapper: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 9.5 5.3 5h13.4l1.3 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m6.5 5.3 2.4 4.2M11 5.3l2.4 4.2M15.5 5.3l2.4 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4" y="9.5" width="16" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  ratioVertical: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="7.5" y="3.5" width="9" height="17" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 6.5v.01M12 17v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  tag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12.5 3.5h5A1.5 1.5 0 0 1 19 5v5l-8 8-6.5-6.5 8-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { key: "accueil", label: "Accueil", icon: "home" },
  { key: "projets", label: "Mes projets", icon: "folder" },
  { key: "modeles", label: "Modèles", icon: "template" },
  { key: "corbeille", label: "Corbeille", icon: "trash" },
];

const STATUS_STYLES = {
  "exporté": { dot: "bg-[#8b5cf0]", text: "text-[#8b5cf0]", border: "border-[#8b5cf0]/25", bg: "bg-[#8b5cf0]/10" },
  "en cours": { dot: "bg-[#ff7a3d]", text: "text-[#ff7a3d]", border: "border-[#ff7a3d]/25", bg: "bg-[#ff7a3d]/10" },
  "brouillon": { dot: "bg-[#f4efe9]/40", text: "text-[#f4efe9]/55", border: "border-[rgba(244,239,233,0.10)]", bg: "bg-[#13101d]" },
};

function statusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES["brouillon"];
}

function hueFromId(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return "--:--";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return null;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} Mo`;
  return `${(bytes / 1024).toFixed(0)} Ko`;
}

function formatRelativeTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Il y a ${weeks} sem.`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function SkeletonGrid({ count, className }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16]">
          <div className="h-36 bg-[#13101d]" />
          <div className="space-y-2 px-3.5 py-3">
            <div className="h-3 w-3/4 rounded bg-[#13101d]" />
            <div className="h-2.5 w-1/2 rounded bg-[#13101d]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#ff7a3d]/20 bg-[#ff7a3d]/[0.06] px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ff7a3d]/25 bg-[#ff7a3d]/10 text-[#ff7a3d]">
        <Icon.alert className="h-5 w-5" />
      </div>
      <p className="max-w-sm text-[13.5px] leading-relaxed text-[#f4efe9]">{message || "Impossible de charger le contenu."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-[rgba(244,239,233,0.10)] px-3.5 py-1.5 text-[12.5px] font-medium text-[#f4efe9] transition-colors hover:border-[#f4efe9]/25 hover:bg-[#17131f]"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(244,239,233,0.10)] px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] text-[#f4efe9]/55">
        <Icon.folder className="h-4.5 w-4.5" />
      </div>
      <p className="text-[13.5px] font-medium text-[#f4efe9]">{title}</p>
      {hint && <p className="max-w-sm text-[12.5px] text-[#f4efe9]/55">{hint}</p>}
    </div>
  );
}

function ProjectCard({ project, trashed, compact, onOpen, onDelete, onRestore }) {
  const hue = project.hue ?? hueFromId(project.id);
  const bars = useMemo(
    () => Array.from({ length: 24 }, (_, i) => 8 + Math.round(18 * Math.abs(Math.sin(i * 0.7 + hue)))),
    [hue]
  );
  const st = statusStyle(project.status);
  const size = formatSize(project.sizeBytes);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#ff7a3d]/30 hover:shadow-[0_20px_44px_-18px_rgba(255,122,61,0.35)]">
      <button onClick={() => onOpen(project)} className="flex flex-col text-left">
        <div
          className={`relative flex items-center justify-center overflow-hidden ${compact ? "h-24" : "h-36"}`}
          style={
            project.thumbnailUrl
              ? { backgroundImage: `url(${project.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: `linear-gradient(140deg, hsl(${hue} 45% 15%), hsl(${hue + 40} 35% 9%))` }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="relative flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-[#ff7a3d] text-[#0a0a0f] opacity-0 shadow-[0_8px_20px_-6px_rgba(255,122,61,0.6)] transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Icon.play className="h-5 w-5 translate-x-[1px]" />
          </span>

          <span className="absolute right-2.5 top-2.5 rounded-md bg-black/55 px-1.5 py-0.5 font-display text-[11px] tabular-nums text-[#f4efe9]/90 backdrop-blur-sm">
            {formatDuration(project.duration)}
          </span>
          <span
            className={`absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md border ${st.border} ${st.bg} px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${st.text} backdrop-blur-sm`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {project.status || "brouillon"}
          </span>

          <div className="absolute inset-x-2.5 bottom-2.5 flex h-5 items-end gap-[2px] opacity-70 transition-opacity group-hover:opacity-100">
            {bars.map((h, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-[#f4efe9]/50 transition-all duration-300 group-hover:bg-[#ff7a3d]/85"
                style={{ height: `${h}%`, transitionDelay: `${i * 12}ms` }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
          <h3 className="truncate text-[13.5px] font-medium text-[#f4efe9]">{project.title || "Sans titre"}</h3>
          <div className="flex items-center gap-3 text-[11px] text-[#f4efe9]/55">
            <span className="flex items-center gap-1">
              <Icon.calendar className="h-3.5 w-3.5" />
              {formatRelativeTime(project.updatedAt)}
            </span>
            {size && (
              <span className="flex items-center gap-1">
                <Icon.storage className="h-3.5 w-3.5" />
                {size}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          trashed ? onRestore(project.id) : onDelete(project.id);
        }}
        title={trashed ? "Restaurer" : "Supprimer"}
        aria-label={trashed ? "Restaurer le projet" : "Supprimer le projet"}
        className="absolute right-2.5 bottom-[4.6rem] flex h-8 w-8 translate-y-1 items-center justify-center rounded-lg bg-black/55 text-[#f4efe9]/80 opacity-0 backdrop-blur-sm transition-all duration-200 hover:text-[#f4efe9] group-hover:translate-y-0 group-hover:opacity-100"
      >
        {trashed ? <Icon.restore className="h-4 w-4" /> : <Icon.trash className="h-4 w-4" />}
      </button>
    </div>
  );
}

function TemplateThumbnail({ template, hue }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = template.thumbnailUrl && !imgFailed;

  return (
    <div
      className="relative flex h-24 items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 42% 20%), hsl(${hue + 60} 32% 12%))` }}
    >
      {!showImage && template.icon && Icon[template.icon] && Icon[template.icon]({ className: "h-7 w-7 text-white/70" })}
      {template.thumbnailUrl && (
        <img
          src={template.thumbnailUrl}
          alt=""
          onError={() => setImgFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${imgFailed ? "opacity-0" : "opacity-100"}`}
        />
      )}
    </div>
  );
}

function DashboardHome({
  activeNav,
  search,
  projects,
  projectsLoading,
  projectsError,
  onRetryProjects,
  templates,
  templatesLoading,
  templatesError,
  onRetryTemplates,
  trashed,
  cardView,
  onChangeCardView,
  onOpenProject,
  onNewProject,
  onImportFile,
  onUseTemplate,
  onOpenViral,
  onOpenSummary,
  onDelete,
  onRestore,
}) {
  const filtered = projects.filter((p) => (p.title || "").toLowerCase().includes(search.toLowerCase()));
  const showTemplates = activeNav === "accueil" || activeNav === "modeles";
  const showProjects = activeNav !== "modeles";
  const compact = cardView === "compact";

  const exportedCount = projects.filter((p) => p.status === "exporté").length;

  return (
    <div className="flex flex-col gap-10 px-8 py-8">
      {activeNav === "accueil" && (
        <section>
          <div className="relative overflow-hidden rounded-3xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] grain p-8">
            <div
              className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full opacity-25 blur-3xl"
              style={{ background: "radial-gradient(circle, #ff7a3d, transparent 70%)" }}
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full opacity-[0.18] blur-3xl"
              style={{ background: "radial-gradient(circle, #3b1d5e, transparent 70%)" }}
            />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d]/70 px-3 py-1 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-[#f4efe9]/55">
                <Icon.sparkle className="h-3 w-3 text-[#ff7a3d]" />
                Studio de montage
              </span>

              <h1 className="mt-4 max-w-xl font-display text-[32px] font-semibold leading-[1.15] text-[#f4efe9]">
                Reprenez le <span className="ember-text">montage</span> là où vous l'avez laissé.
              </h1>
              <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-[#f4efe9]/55">
                Importez un fichier, choisissez un modèle, ou continuez l'un de vos projets récents.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenViral}
                  className="group flex items-center gap-2 rounded-full bg-[#f4efe9] px-4 py-2.5 text-[13.5px] font-semibold text-[#0a0a0f] shadow-[0_10px_24px_-8px_rgba(244,239,233,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-[15px] leading-none">🔥</span>
                  Shorts viraux IA
                  <Icon.chevronRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={onOpenSummary}
                  className="group flex items-center gap-2 rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] px-4 py-2.5 text-[13.5px] font-semibold text-[#f4efe9] transition-all hover:scale-[1.02] hover:border-[#8b5cf0]/40 hover:text-[#8b5cf0] active:scale-[0.98]"
                >
                  <Icon.doc className="h-4 w-4" />
                  Résumer une vidéo
                </button>
                <button
                  onClick={onNewProject}
                  className="flex items-center gap-2 rounded-full bg-[#ff7a3d] px-4 py-2.5 text-[13.5px] font-semibold text-[#0a0a0f] shadow-[0_10px_24px_-8px_rgba(255,122,61,0.5)] transition-all hover:scale-[1.02] hover:bg-[#ff9b5e] active:scale-[0.98]"
                >
                  <Icon.plus className="h-4 w-4" />
                  Importer un média
                </button>
              </div>

              {!projectsLoading && !projectsError && projects.length > 0 && (
                <div className="mt-7 flex flex-wrap gap-6 border-t border-[rgba(244,239,233,0.10)] pt-5">
                  <div>
                    <p className="font-display text-[20px] font-semibold text-[#f4efe9]">{projects.length}</p>
                    <p className="text-[11.5px] text-[#f4efe9]/55">Projet{projects.length > 1 ? "s" : ""} au total</p>
                  </div>
                  <div>
                    <p className="font-display text-[20px] font-semibold text-[#f4efe9]">{exportedCount}</p>
                    <p className="text-[11.5px] text-[#f4efe9]/55">Exporté{exportedCount > 1 ? "s" : ""}</p>
                  </div>
                  <div>
                    <p className="font-display text-[20px] font-semibold text-[#f4efe9]">{templates.length}</p>
                    <p className="text-[11.5px] text-[#f4efe9]/55">Modèles disponibles</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showTemplates && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#f4efe9]">Modèles populaires</h2>
            {!templatesLoading && !templatesError && templates.length > 0 && (
              <span className="text-[12.5px] text-[#f4efe9]/55">{templates.length} disponibles</span>
            )}
          </div>

          {templatesLoading ? (
            <SkeletonGrid count={4} className="grid grid-cols-2 gap-3.5 sm:grid-cols-4" />
          ) : templatesError ? (
            <ErrorState message={templatesError} onRetry={onRetryTemplates} />
          ) : templates.length === 0 ? (
            <EmptyState title="Aucun modèle disponible pour le moment." />
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {templates.map((t) => {
                const hue = t.hue ?? hueFromId(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onUseTemplate(t)}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[rgba(244,239,233,0.10)] bg-[#0e0d16] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff7a3d]/30 hover:shadow-[0_14px_30px_-16px_rgba(255,122,61,0.35)]"
                  >
                    <div className="relative">
                      <TemplateThumbnail template={t} hue={hue} />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[#f4efe9] opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                        <Icon.plus className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="truncate text-[12.5px] font-medium text-[#f4efe9]">{t.title}</p>
                      <p className="text-[11px] text-[#f4efe9]/55">{t.tag}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showProjects && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#f4efe9]">
              {trashed
                ? "Corbeille"
                : search
                ? `Résultats pour « ${search} »`
                : activeNav === "projets"
                ? "Mes projets"
                : "Projets récents"}
            </h2>
            <div className="flex items-center gap-3">
              {!projectsLoading && !projectsError && (
                <span className="text-[12.5px] text-[#f4efe9]/55">
                  {filtered.length} projet{filtered.length > 1 ? "s" : ""}
                </span>
              )}
              <div className="flex items-center gap-1 rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#13101d] p-1">
                <button
                  onClick={() => onChangeCardView("comfort")}
                  title="Vue confortable"
                  aria-label="Vue confortable"
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    !compact ? "bg-[#ff7a3d]/15 text-[#ff7a3d]" : "text-[#f4efe9]/45 hover:text-[#f4efe9]"
                  }`}
                >
                  <Icon.gridView className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onChangeCardView("compact")}
                  title="Vue compacte"
                  aria-label="Vue compacte"
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    compact ? "bg-[#ff7a3d]/15 text-[#ff7a3d]" : "text-[#f4efe9]/45 hover:text-[#f4efe9]"
                  }`}
                >
                  <Icon.listView className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {projectsLoading ? (
            <SkeletonGrid count={6} className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" />
          ) : projectsError ? (
            <ErrorState message={projectsError} onRetry={onRetryProjects} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={
                trashed
                  ? "La corbeille est vide."
                  : search
                  ? "Aucun projet ne correspond à cette recherche."
                  : "Aucun projet pour l'instant."
              }
              hint={!trashed && !search ? "Importez un fichier ou choisissez un modèle pour commencer." : null}
            />
          ) : (
            <div className={`grid gap-4 ${compact ? "grid-cols-3 sm:grid-cols-4 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"}`}>
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  trashed={trashed}
                  compact={compact}
                  onOpen={onOpenProject}
                  onDelete={onDelete}
                  onRestore={onRestore}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DashboardInner() {
  const { user, loading, logout, token } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [activeNav, setActiveNav] = useState("accueil");
  const [search, setSearch] = useState("");
  const [cardView, setCardView] = useState("comfort");

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState("");

  const [openedProject, setOpenedProject] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingTemplate, setPendingTemplate] = useState(null);

  const trashed = activeNav === "corbeille";

  const loadProjects = () => {
    if (!token) return;
    setProjectsLoading(true);
    setProjectsError("");
    try {
      Promise.resolve(api.listProjects(token, { trashed }))
        .then((data) => setProjects(Array.isArray(data) ? data : []))
        .catch((err) => setProjectsError(err.message || "Erreur de chargement des projets."))
        .finally(() => setProjectsLoading(false));
    } catch (err) {
      setProjectsError("La fonction api.listProjects n'est pas encore disponible (backend à connecter).");
      setProjectsLoading(false);
    }
  };

  const loadTemplates = () => {
    if (!token) return;
    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      Promise.resolve(api.listTemplates(token))
        .then((data) => setTemplates(Array.isArray(data) ? data : []))
        .catch((err) => setTemplatesError(err.message || "Erreur de chargement des modèles."))
        .finally(() => setTemplatesLoading(false));
    } catch (err) {
      setTemplatesError("La fonction api.listTemplates n'est pas encore disponible (backend à connecter).");
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, trashed,view]);

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <div className="font-body flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <style>{GLOBAL_CSS}</style>
        <div className="flex items-center gap-2.5 text-[#f4efe9]/55">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#ff7a3d]" />
          <p className="text-[13.5px]">Chargement…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const handleOpenProject = (project) => {
    setOpenedProject(project);
    setPendingFile(null);
    setPendingTemplate(null);
    setView("editor");
  };

  const handleNewProject = () => {
    setOpenedProject(null);
    setPendingFile(null);
    setPendingTemplate(null);
    setView("editor");
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpenedProject(null);
    setPendingFile(file);
    setPendingTemplate(null);
    setView("editor");
  };

  const handleUseTemplate = (template) => {
    setOpenedProject(null);
    setPendingFile(null);
    setPendingTemplate(template);
    setView("editor");
  };

  const handleDelete = (id) => {
    const previous = projects;
    setProjects((list) => list.filter((p) => p.id !== id));
    try {
      Promise.resolve(api.deleteProject(id, token)).catch(() => {
        setProjects(previous);
        setProjectsError("Impossible de supprimer ce projet.");
      });
    } catch (err) {
      setProjects(previous);
      setProjectsError("La fonction api.deleteProject n'est pas encore disponible (backend à connecter).");
    }
  };

  const handleRestore = (id) => {
    const previous = projects;
    setProjects((list) => list.filter((p) => p.id !== id));
    try {
      Promise.resolve(api.restoreProject(id, token)).catch(() => {
        setProjects(previous);
        setProjectsError("Impossible de restaurer ce projet.");
      });
    } catch (err) {
      setProjects(previous);
      setProjectsError("La fonction api.restoreProject n'est pas encore disponible (backend à connecter).");
    }
  };

  const initials = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();

  const handleOpenViral = () => setView("viral");
  const handleOpenSummary = () => setView("summary");
  const handleGoPricing = () => navigate("/pricing");

  if (view === "viral") {
    return (
      <div className="relative min-h-screen bg-[#0a0a0f]">
        <button
          onClick={() => setView("dashboard")}
          className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#0e0d16]/90 px-3 py-1.5 text-[12.5px] font-medium text-[#f4efe9] backdrop-blur transition-colors hover:bg-[#17131f]"
        >
          <Icon.arrowLeft className="h-3.5 w-3.5" />
          Tableau de bord
        </button>
        <ViralGenerator />
      </div>
    );
  }

  if (view === "summary") {
    return (
      <div className="relative min-h-screen bg-[#0a0a0f]">
        <button
          onClick={() => setView("dashboard")}
          className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#0e0d16]/90 px-3 py-1.5 text-[12.5px] font-medium text-[#f4efe9] backdrop-blur transition-colors hover:bg-[#17131f]"
        >
          <Icon.arrowLeft className="h-3.5 w-3.5" />
          Tableau de bord
        </button>
        <VideoSummarizer />
      </div>
    );
  }

  if (view === "editor") {
    return (
      <div className="relative min-h-screen bg-[#0a0a0f]">
        <button
          onClick={() => setView("dashboard")}
          className="fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-lg border border-[rgba(244,239,233,0.10)] bg-[#0e0d16]/90 px-3 py-1.5 text-[12.5px] font-medium text-[#f4efe9] backdrop-blur transition-colors hover:bg-[#17131f]"
        >
          <Icon.arrowLeft className="h-3.5 w-3.5" />
          Tableau de bord
        </button>
        <VideoEditor initialProject={openedProject} initialFile={pendingFile} initialTemplate={pendingTemplate} />
      </div>
    );
  }

  const pageTitle = NAV_ITEMS.find((n) => n.key === activeNav)?.label || "Accueil";

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] font-body text-[#f4efe9]">
      <style>{GLOBAL_CSS}</style>
      <aside className="flex w-[224px] shrink-0 flex-col border-r border-[rgba(244,239,233,0.10)] bg-[#0e0d16] px-3 py-5">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full font-display text-[13px] font-bold text-[#0a0a0f] shadow-[0_6px_16px_-6px_rgba(255,122,61,0.55)]"
            style={{ background: "linear-gradient(135deg,#ff7a3d,#8b5cf0)" }}
          >
            V
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-[#f4efe9]">
            Clip<span className="text-[#ff7a3d]">frame</span> Studio
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.key;
            const IconCmp = Icon[item.icon];
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveNav(item.key);
                  setSearch("");
                }}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-[#ff7a3d]/10 text-[#ff7a3d]" : "text-[#f4efe9]/55 hover:bg-[#17131f]/60 hover:text-[#f4efe9]"
                }`}
              >
                <IconCmp className={`h-[18px] w-[18px] transition-colors ${active ? "text-[#ff7a3d]" : ""}`} />
                {item.label}
              </button>
            );
          })}

          {/* Lien vers la page Tarifs (route à part, pas une vue interne du dashboard) */}
          <button
            onClick={handleGoPricing}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[#f4efe9]/55 transition-colors hover:bg-[#17131f]/60 hover:text-[#f4efe9]"
          >
            <Icon.tag className="h-[18px] w-[18px]" />
            Tarifs
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-[rgba(244,239,233,0.10)] pt-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-[#13101d] px-2.5 py-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-semibold text-[#0a0a0f]"
              style={{ background: "linear-gradient(135deg,#ff9b5e,#8b5cf0)" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-[#f4efe9]">{user?.name || "Mon compte"}</p>
              <p className="truncate text-[11px] text-[#f4efe9]/55">{user?.email}</p>
            </div>
          </div>
          {logout && (
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#f4efe9]/55 transition-colors hover:bg-[#17131f]/60 hover:text-[#f4efe9]"
            >
              <Icon.logout className="h-4 w-4" />
              Déconnexion
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-[rgba(244,239,233,0.10)] px-8 py-4">
          <h2 className="shrink-0 font-display text-[19px] font-semibold text-[#ff7a3d]">{pageTitle}</h2>

          <div className="relative ml-2 w-full max-w-sm">
            <Icon.search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f4efe9]/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet…"
              className="w-full rounded-full border border-[rgba(244,239,233,0.10)] bg-[#13101d] py-2 pl-10 pr-3 text-[13px] text-[#f4efe9] outline-none transition-colors placeholder:text-[#f4efe9]/40 focus:border-[#ff7a3d]/50 focus:ring-2 focus:ring-[#ff7a3d]/15"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleGoPricing}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(244,239,233,0.10)] px-3.5 py-2 text-[12.5px] font-semibold text-[#f4efe9]/80 transition-colors hover:border-[#ff7a3d]/40 hover:text-[#ff7a3d]"
            >
              <Icon.tag className="h-3.5 w-3.5" />
              Tarifs
            </button>
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(244,239,233,0.10)] text-[#f4efe9]/55 transition-colors hover:border-[#f4efe9]/25 hover:bg-[#17131f] hover:text-[#f4efe9]"
            >
              <Icon.bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff7a3d]" />
            </button>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-1.5 rounded-full bg-[#ff7a3d] px-4 py-2 text-[12.5px] font-semibold uppercase tracking-wide text-[#0a0a0f] shadow-[0_8px_18px_-8px_rgba(255,122,61,0.5)] transition-all hover:scale-[1.02] hover:bg-[#ff9b5e] active:scale-[0.98]"
            >
              <Icon.plus className="h-4 w-4" />
              Créer
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <DashboardHome
            activeNav={activeNav}
            search={search}
            projects={projects}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onRetryProjects={loadProjects}
            templates={templates}
            templatesLoading={templatesLoading}
            templatesError={templatesError}
            onRetryTemplates={loadTemplates}
            trashed={trashed}
            cardView={cardView}
            onChangeCardView={setCardView}
            onOpenProject={handleOpenProject}
            onNewProject={handleNewProject}
            onImportFile={handleImportFile}
            onUseTemplate={handleUseTemplate}
            onOpenViral={handleOpenViral}
            onOpenSummary={handleOpenSummary}
            onDelete={handleDelete}
            onRestore={handleRestore}
          />
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardInner />
    </DashboardErrorBoundary>
  );
}