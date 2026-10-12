import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

const SIDEBAR_W = 220;

/* ============================================================
   Mêmes tokens que la page Home (Clipframe / sunset cinématique)
   ink #0a0a0f · ink2 #0e0d16 · plum #3b1d5e · ember #ff7a3d · cream #f4efe9
   Space Grotesk (display) + Inter (body) + IBM Plex Mono (data)
   ============================================================ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  .font-mono { font-family: 'IBM Plex Mono', monospace; }
  .hairline { border-color: rgba(244,239,233,0.10); }
  ::selection { background: #ff7a3d; color: #0a0a0f; }

  .bento-tile {
    background:
      radial-gradient(140% 120% at 15% 0%, rgba(59,29,94,0.55), transparent 60%),
      linear-gradient(160deg,#150d22,#0c0913);
    border: 1px solid rgba(244,239,233,0.10);
    border-radius: 22px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      0 12px 30px -14px rgba(0,0,0,.7),
      0 22px 50px -20px rgba(0,0,0,.8);
    transition: transform .35s cubic-bezier(.34,1.4,.64,1), border-color .35s ease;
  }
  .bento-tile:hover {
    transform: translateY(-4px);
    border-color: rgba(255,122,61,0.35);
  }
  .bento-tile-hero {
    background:
      radial-gradient(120% 100% at 12% 0%, rgba(255,122,61,0.16), transparent 55%),
      radial-gradient(140% 120% at 90% 100%, rgba(139,92,240,0.30), transparent 60%),
      linear-gradient(160deg,#170f21,#0d0a13);
  }
  .feed-scroll::-webkit-scrollbar { width: 5px; }
  .feed-scroll::-webkit-scrollbar-thumb { background: rgba(244,239,233,0.12); border-radius: 4px; }
`;

/* ---------------------------------------------------------------------
   Toutes les données ci-dessous sont dérivées de ce que l'API renvoie
   déjà (adminGetStats / adminListUsers / adminListProjects) : aucune
   valeur n'est inventée. Là où la maquette Pulse suppose des métriques
   qu'on ne calcule pas encore côté back (ex. revenu, sessions), on
   reprend la structure visuelle mais on la nourrit avec l'équivalent
   "métier" ClipStudio le plus proche (inscriptions, statut d'export,
   source des projets, taux d'adoption Pro).
------------------------------------------------------------------------ */

const STATUS_META = {
  done: { label: "Export terminé", color: "#34d399" },
  processing: { label: "En cours de traitement", color: "#f5b544" },
  failed: { label: "Échec de traitement", color: "#fb7185" },
  draft: { label: "Brouillon", color: "#f4efe9" },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Statut inconnu", color: "#f4efe9" };
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return formatDate(iso);
}

function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Série cumulative d'inscriptions sur une fenêtre (7 / 30 jours ou tout l'historique). */
function buildGrowthSeries(users, windowDays) {
  if (!users?.length) return { points: [], deltaCount: 0, latest: 0 };
  const sorted = [...users].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const now = new Date();
  const start = windowDays
    ? new Date(now.getTime() - windowDays * 86400000)
    : new Date(sorted[0].createdAt);

  const before = sorted.filter((u) => new Date(u.createdAt) < start).length;
  const inWindow = sorted.filter((u) => new Date(u.createdAt) >= start);

  const byDay = new Map();
  inWindow.forEach((u) => {
    const k = dayKey(u.createdAt);
    byDay.set(k, (byDay.get(k) || 0) + 1);
  });

  const days = Math.max(1, Math.round((now - start) / 86400000));
  let running = before;
  const points = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const k = d.toISOString().slice(0, 10);
    running += byDay.get(k) || 0;
    points.push({ date: d, value: running });
  }

  return { points, deltaCount: inWindow.length, latest: running };
}

/** Nombre de nouvelles inscriptions par jour, sur les 14 derniers jours (pour la mini sparkline). */
function buildDailySignups(users, days = 14) {
  const now = new Date();
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    buckets.push({ key: d.toISOString().slice(0, 10), value: 0 });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  (users || []).forEach((u) => {
    const k = dayKey(u.createdAt);
    if (map.has(k)) map.get(k).value += 1;
  });
  return buckets.map((b) => b.value);
}

/** Répartition des inscriptions par jour de la semaine (Lun → Dim). */
function buildWeekdayDistribution(users) {
  const counts = [0, 0, 0, 0, 0, 0, 0]; // Lun..Dim
  (users || []).forEach((u) => {
    const jsDay = new Date(u.createdAt).getDay(); // 0=Dim
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    counts[idx] += 1;
  });
  return counts;
}

/** Regroupe les projets par champ `source`. */
function buildSourceBreakdown(projects) {
  const counts = new Map();
  (projects || []).forEach((p) => {
    const key = p.source || "Inconnue";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const total = projects?.length || 0;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 }));
}

const DONUT_COLORS = ["#ff7a3d", "#8b5cf0", "#f5b544", "#2dd4bf"];

/* ------------------------------ Icônes (inline, sans dépendance) ------------------------------ */

function IconGrid(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconUsers(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 5.2c1.7.4 3 2 3 3.8s-1.3 3.4-3 3.8M20 20c0-2.6-1.7-4.8-4-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconFolder(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconRefresh(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" {...props}>
      <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.6 15A8 8 0 1 0 6 6.3L4 9M19.4 9A8 8 0 0 0 18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLogout(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 16.5 19 12l-4.5-4.5M19 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------ Sidebar & Navbar ------------------------------ */

const NAV_ITEMS = [
  { key: "overview", label: "Vue d'ensemble", Icon: IconGrid },
  { key: "users", label: "Utilisateurs", Icon: IconUsers },
  { key: "projects", label: "Projets", Icon: IconFolder },
];

function Sidebar({ section, setSection, open, onClose, onLogout }) {
  return (
    <>
      {open && (
        <div onClick={onClose} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r hairline bg-[#0a0a0f] transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b hairline px-5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ background: "linear-gradient(135deg,#ff7a3d,#8b5cf0)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h4l2 8 4-16 2 8h6" stroke="#0a0a0f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight text-[#f4efe9]">ClipStudio</span>
          </div>
          <button onClick={onClose} className="text-[#f4efe9]/45 hover:text-[#f4efe9] lg:hidden">
            <IconClose />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setSection(key); onClose(); }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-display text-[13px] font-medium transition-colors ${
                section === key
                  ? "bg-[#ff7a3d]/15 text-[#ff7a3d]"
                  : "text-[#f4efe9]/65 hover:bg-[#150d22] hover:text-[#f4efe9]"
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t hairline p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-mono text-[11.5px] text-[#f4efe9]/45 transition-colors hover:bg-[#fb7185]/10 hover:text-[#fb7185]"
          >
            <IconLogout />
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}

function Navbar({ title, user, onMenuClick, onRefresh }) {
  return (
    <div className="sticky top-0 z-20 border-b hairline bg-[#0a0a0f]/85 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="text-[#f4efe9]/65 hover:text-[#f4efe9] lg:hidden">
            <IconMenu />
          </button>
          <span className="font-display text-[14.5px] font-semibold text-[#f4efe9]">{title}</span>
          <span className="ml-1 hidden items-center rounded-full border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#ff7a3d] sm:inline-flex">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-full border hairline px-3.5 py-1.5 font-mono text-[11px] text-[#f4efe9]/65 transition-colors hover:border-[#ff7a3d]/40 hover:text-[#f4efe9]"
          >
            <IconRefresh />
            Actualiser
          </button>
          <span className="font-mono hidden text-[12px] text-[#f4efe9]/65 sm:inline">{user.email}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4efe9]/10 font-mono text-[11px] text-[#f4efe9]">
            {user.email?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Sous-composants visuels (tuiles) ------------------------------ */

function StatTile({ eyebrow, value }) {
  return (
    <div className="bento-tile p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45">{eyebrow}</p>
      <p className="font-mono mt-2 text-[26px] font-medium text-[#f4efe9]">{value}</p>
    </div>
  );
}

function GrowthHero({ users, windowDays, setWindowDays }) {
  const { points, deltaCount, latest } = useMemo(
    () => buildGrowthSeries(users, windowDays),
    [users, windowDays]
  );

  const W = 600;
  const H = 190;
  const max = Math.max(1, ...points.map((p) => p.value));
  const xFor = (i) => (points.length > 1 ? (i / (points.length - 1)) * W : 0);
  const yFor = (v) => H - (v / max) * H;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(" ");
  const areaPath = points.length ? `${linePath} L${W},${H} L0,${H} Z` : "";

  const last = points[points.length - 1];
  const tickIdx = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];

  return (
    <div className="bento-tile bento-tile-hero sm:col-span-2 row-span-2 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45">Inscriptions cumulées</p>
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <span className="font-mono text-[34px] font-medium text-[#f4efe9]">{latest}</span>
            <span className="rounded-full bg-[#34d399]/12 px-2 py-0.5 font-mono text-[11px] text-[#34d399]">
              +{deltaCount} sur la période
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border hairline bg-[#0a0a0f] p-1">
          {[
            { label: "7J", value: 7 },
            { label: "30J", value: 30 },
            { label: "Tout", value: null },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => setWindowDays(opt.value)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] transition-colors ${
                windowDays === opt.value ? "bg-[#ff7a3d]/15 text-[#ff7a3d]" : "text-[#f4efe9]/45 hover:text-[#f4efe9]/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5">
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
            <defs>
              <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7a3d" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ff7a3d" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.33, 0.66, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(244,239,233,0.10)" strokeWidth="1" />
            ))}
            <path d={areaPath} fill="url(#heroFill)" />
            <path d={linePath} fill="none" stroke="#ff7a3d" strokeWidth="2" />
            {last && (
              <>
                <line
                  x1={xFor(points.length - 1)} x2={xFor(points.length - 1)}
                  y1={yFor(last.value) - 26} y2={yFor(last.value)}
                  stroke="rgba(244,239,233,0.10)" strokeWidth="1"
                />
                <circle cx={xFor(points.length - 1)} cy={yFor(last.value)} r="4" fill="#ff7a3d" stroke="#0a0a0f" strokeWidth="2" />
              </>
            )}
          </svg>
        ) : (
          <div className="flex h-[190px] items-center justify-center font-mono text-[12px] text-[#f4efe9]/45">
            Pas assez de données sur cette période
          </div>
        )}
        {points.length > 1 && (
          <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-[#f4efe9]/45">
            {tickIdx.map((i) => (
              <span key={i}>{points[i].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SignupsKpiTile({ users }) {
  const daily = useMemo(() => buildDailySignups(users, 14), [users]);
  const last7 = daily.slice(-7).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...daily);
  const W = 220, H = 44;
  const points = daily.map((v, i) => {
    const x = (i / (daily.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="bento-tile p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45">Nouveaux comptes (7j)</p>
      <p className="font-mono mt-1.5 text-[26px] font-medium text-[#f4efe9]">{last7}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ height: 40 }} preserveAspectRatio="none">
        <polyline points={points.join(" ")} fill="none" stroke="#2dd4bf" strokeWidth="2" />
      </svg>
    </div>
  );
}

function ProAdoptionKpiTile({ users, proCount }) {
  const weekday = useMemo(() => buildWeekdayDistribution(users), [users]);
  const max = Math.max(1, ...weekday);
  const total = users?.length || 0;
  const pct = total ? Math.round((proCount / total) * 100) : 0;

  return (
    <div className="bento-tile p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45">Comptes Pro</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="font-mono text-[26px] font-medium text-[#f4efe9]">{proCount}</p>
        <span className="rounded-full bg-[#ff7a3d]/12 px-2 py-0.5 font-mono text-[10.5px] text-[#ff7a3d]">{pct}% du total</span>
      </div>
      <div className="mt-3 flex h-10 items-end gap-1">
        {weekday.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(6, (v / max) * 100)}%`,
              backgroundColor: i === weekday.length - 1 ? "#f5b544" : "rgba(245,181,68,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function LiveActivityTile({ users, projects }) {
  const events = useMemo(() => {
    const signupEvents = (users || []).map((u) => ({
      id: `u-${u.id}`,
      ts: u.createdAt,
      initials: (u.email?.[0] || "?").toUpperCase(),
      label: `${u.email} a créé un compte`,
      color: "#ff7a3d",
    }));
    const projectEvents = (projects || []).map((p) => {
      const meta = statusMeta(p.status);
      return {
        id: `p-${p.id}`,
        ts: p.updatedAt,
        initials: (p.userEmail?.[0] || "?").toUpperCase(),
        label: `${p.title || "Projet sans titre"} — ${meta.label}${p.trashed ? " (corbeille)" : ""}`,
        color: meta.color,
      };
    });
    return [...signupEvents, ...projectEvents]
      .filter((e) => e.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 10);
  }, [users, projects]);

  return (
    <div className="bento-tile row-span-2 p-5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34d399]" />
        <p className="font-display text-[13.5px] font-semibold text-[#f4efe9]">Activité récente</p>
      </div>
      <div className="feed-scroll mt-4 flex max-h-[300px] flex-col gap-3.5 overflow-y-auto pr-1">
        {events.length === 0 && (
          <p className="font-mono text-[12px] text-[#f4efe9]/45">Aucune activité récente.</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4efe9]/10 font-mono text-[10.5px] text-[#f4efe9]">
              {e.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-[#f4efe9]">{e.label}</p>
              <p className="font-mono text-[10.5px] text-[#f4efe9]/45">{relativeTime(e.ts)}</p>
            </div>
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcesDonutTile({ projects }) {
  const breakdown = useMemo(() => buildSourceBreakdown(projects), [projects]);
  const total = projects?.length || 0;
  const r = 60, c = 2 * Math.PI * r;
  let offsetAcc = 0;

  return (
    <div className="bento-tile row-span-2 p-5">
      <p className="font-display text-[13.5px] font-semibold text-[#f4efe9]">Sources des projets</p>
      <div className="mt-4 flex justify-center">
        <svg viewBox="0 0 160 160" width="150" height="150">
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(244,239,233,0.10)" strokeWidth="18" />
          {breakdown.slice(0, 4).map((seg, i) => {
            const len = (seg.pct / 100) * c;
            const dasharray = `${len} ${c - len}`;
            const dashoffset = -offsetAcc;
            offsetAcc += len;
            return (
              <circle
                key={seg.name}
                cx="80" cy="80" r={r} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="18"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform="rotate(-90 80 80)"
                strokeLinecap="butt"
              />
            );
          })}
          <text x="80" y="76" textAnchor="middle" className="font-mono" fontSize="20" fill="#f4efe9">{total}</text>
          <text x="80" y="94" textAnchor="middle" className="font-mono" fontSize="9" letterSpacing="1" fill="rgba(244,239,233,0.45)">PROJETS</text>
        </svg>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {breakdown.slice(0, 4).map((seg, i) => (
          <div key={seg.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] text-[#f4efe9]/65">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {seg.name}
            </span>
            <span className="font-mono text-[11.5px] text-[#f4efe9]">{seg.pct}%</span>
          </div>
        ))}
        {breakdown.length === 0 && <p className="font-mono text-[12px] text-[#f4efe9]/45">Aucun projet.</p>}
      </div>
    </div>
  );
}

function AdoptionGaugeTile({ proCount, totalUsers }) {
  const pct = totalUsers ? Math.round((proCount / totalUsers) * 100) : 0;
  const r = 52, c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;

  return (
    <div className="bento-tile flex flex-col items-center justify-center p-5">
      <svg viewBox="0 0 140 140" width="128" height="128">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(244,239,233,0.10)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#ff7a3d" strokeWidth="12"
          strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="76" textAnchor="middle" className="font-mono" fontSize="24" fill="#f4efe9">{pct}%</text>
      </svg>
      <p className="font-mono mt-2 text-center text-[10.5px] uppercase tracking-[0.14em] text-[#f4efe9]/45">
        Adoption Pro
      </p>
      <p className="font-mono text-[11.5px] text-[#f4efe9]/65">{proCount} / {totalUsers} comptes</p>
    </div>
  );
}

function UsersTable({ users, usersLoading, usersError, savingUserId, updateUserField }) {
  return (
    <div className="bento-tile overflow-hidden">
      {usersLoading ? (
        <div className="font-mono p-8 text-center text-[13px] text-[#f4efe9]/45">Chargement…</div>
      ) : usersError ? (
        <div className="font-mono p-8 text-center text-[13px] text-[#fb7185]">{usersError}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b hairline">
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Email</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Rôle</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Plan</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Crédits</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const busy = savingUserId === u.id;
                return (
                  <tr key={u.id} className="border-b hairline last:border-0">
                    <td className="px-5 py-3 text-[#f4efe9]">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role || "user"}
                        disabled={busy}
                        onChange={(e) => updateUserField(u, "role", e.target.value)}
                        className="font-mono rounded-md border hairline bg-[#0a0a0f] px-2 py-1 text-[11.5px] text-[#f4efe9] outline-none focus:border-[#ff7a3d]/60 disabled:opacity-50"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.plan || "free"}
                        disabled={busy}
                        onChange={(e) => updateUserField(u, "plan", e.target.value)}
                        className="font-mono rounded-md border hairline bg-[#0a0a0f] px-2 py-1 text-[11.5px] text-[#f4efe9] outline-none focus:border-[#ff7a3d]/60 disabled:opacity-50"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        min="0"
                        defaultValue={u.credits ?? 0}
                        disabled={busy}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val !== u.credits) updateUserField(u, "credits", val);
                        }}
                        className="font-mono w-20 rounded-md border hairline bg-[#0a0a0f] px-2 py-1 text-[11.5px] text-[#f4efe9] outline-none focus:border-[#ff7a3d]/60 disabled:opacity-50"
                      />
                    </td>
                    <td className="font-mono px-5 py-3 text-[#f4efe9]/45">{formatDate(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectsTable({ projects, projectsLoading, projectsError }) {
  return (
    <div className="bento-tile overflow-hidden">
      {projectsLoading ? (
        <div className="font-mono p-8 text-center text-[13px] text-[#f4efe9]/45">Chargement…</div>
      ) : projectsError ? (
        <div className="font-mono p-8 text-center text-[13px] text-[#fb7185]">{projectsError}</div>
      ) : projects.length === 0 ? (
        <div className="font-mono p-8 text-center text-[13px] text-[#f4efe9]/45">Aucun projet pour le moment.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b hairline">
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Titre</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Utilisateur</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Source</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Statut</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Mis à jour</th>
                <th className="font-mono px-5 py-3.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#f4efe9]/45">Vidéo</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const meta = statusMeta(p.status);
                return (
                  <tr key={p.id} className="border-b hairline last:border-0">
                    <td className="px-5 py-3 text-[#f4efe9]">{p.title || "Sans titre"}</td>
                    <td className="font-mono px-5 py-3 text-[#f4efe9]/65">{p.userEmail}</td>
                    <td className="font-mono px-5 py-3 text-[#f4efe9]/45">{p.source || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[#f4efe9]/65">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        {p.status}{p.trashed ? " (corbeille)" : ""}
                      </span>
                    </td>
                    <td className="font-mono px-5 py-3 text-[#f4efe9]/45">{formatDate(p.updatedAt)}</td>
                    <td className="px-5 py-3">
                      {p.videoUrl ? (
                        <a
                          href={p.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[#ff7a3d] hover:underline"
                        >
                          Ouvrir
                        </a>
                      ) : (
                        <span className="font-mono text-[#f4efe9]/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------ Composant principal ------------------------------------ */

export default function AdminDashboard() {
  // NB : on suppose que le contexte d'auth expose une fonction `logout`
  // (pattern habituel de AuthContext) — adapte le nom si le tien diffère.
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState("overview"); // "overview" | "users" | "projects"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heroWindow, setHeroWindow] = useState(30);

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const loadStats = () => {
    setStatsError("");
    api
      .adminGetStats(token)
      .then(setStats)
      .catch((err) => setStatsError(err.message));
  };

  const loadUsers = () => {
    setUsersLoading(true);
    setUsersError("");
    api
      .adminListUsers(token)
      .then(setUsers)
      .catch((err) => setUsersError(err.message))
      .finally(() => setUsersLoading(false));
  };

  const loadProjects = () => {
    setProjectsLoading(true);
    setProjectsError("");
    api
      .adminListProjects(token)
      .then(setProjects)
      .catch((err) => setProjectsError(err.message))
      .finally(() => setProjectsLoading(false));
  };

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    loadStats();
    loadUsers();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  // ---- Garde d'accès : attend la résolution de l'auth avant de trancher ----
  if (loading) {
    return (
      <div className="font-body flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <style>{GLOBAL_CSS}</style>
        <div className="flex items-center gap-2.5 text-[#f4efe9]/45">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#ff7a3d]" />
          <p className="font-mono text-[13px]">Chargement…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const updateUserField = async (targetUser, field, value) => {
    setSavingUserId(targetUser.id);
    const previous = users;
    setUsers((list) =>
      list.map((u) => (u.id === targetUser.id ? { ...u, [field]: value } : u))
    );
    try {
      await api.adminUpdateUser(targetUser.id, { [field]: value }, token);
      loadStats();
    } catch (err) {
      setUsers(previous);
      setUsersError(err.message);
    } finally {
      setSavingUserId(null);
    }
  };

  const refreshAll = () => { loadStats(); loadUsers(); loadProjects(); };
  const handleLogout = () => {
    logout?.();
    navigate("/login", { replace: true });
  };
  const dataReady = stats && !usersLoading && !projectsLoading;
  const sectionTitle = NAV_ITEMS.find((n) => n.key === section)?.label || "Panneau admin";

  return (
    <div className="font-body min-h-screen bg-[#0a0a0f] text-[#f4efe9]">
      <style>{GLOBAL_CSS}</style>

      <Sidebar
        section={section}
        setSection={setSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="lg:pl-[220px]">
        <Navbar title={sectionTitle} user={user} onMenuClick={() => setSidebarOpen(true)} onRefresh={refreshAll} />

        <main className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 lg:px-8">
          {statsError && <p className="font-mono text-[13px] text-[#fb7185]">{statsError}</p>}

          {section === "overview" && (
            dataReady ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <GrowthHero users={users} windowDays={heroWindow} setWindowDays={setHeroWindow} />
                <SignupsKpiTile users={users} />
                <ProAdoptionKpiTile users={users} proCount={stats.proCount} />
                <LiveActivityTile users={users} projects={projects} />
                <SourcesDonutTile projects={projects} />
                <AdoptionGaugeTile proCount={stats.proCount} totalUsers={stats.totalUsers} />
                <StatTile eyebrow="Utilisateurs" value={stats.totalUsers} />
                <StatTile eyebrow="Admins" value={stats.adminCount} />
                <StatTile eyebrow="Projets (total)" value={stats.totalProjects} />
                <StatTile eyebrow="Projets actifs" value={stats.activeProjects} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bento-tile sm:col-span-2 row-span-2 h-[300px] animate-pulse" />
                <div className="bento-tile h-[110px] animate-pulse" />
                <div className="bento-tile h-[110px] animate-pulse" />
                <div className="bento-tile row-span-2 h-[300px] animate-pulse" />
                <div className="bento-tile row-span-2 h-[300px] animate-pulse" />
                <div className="bento-tile h-[110px] animate-pulse" />
              </div>
            )
          )}

          {section === "users" && (
            <UsersTable
              users={users}
              usersLoading={usersLoading}
              usersError={usersError}
              savingUserId={savingUserId}
              updateUserField={updateUserField}
            />
          )}

          {section === "projects" && (
            <ProjectsTable projects={projects} projectsLoading={projectsLoading} projectsError={projectsError} />
          )}
        </main>
      </div>
    </div>
  );
}