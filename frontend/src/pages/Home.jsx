import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ============================================================
   CINEMATIC SUNSET DESIGN TOKENS
   ink #0a0a0f · ink2 #0e0d16 · plum #3b1d5e · ember #ff7a3d · cream #f4efe9
   Space Grotesk (display) + Inter (body)
   These are injected once as global CSS so no tailwind.config edits
   are required. If your project's tailwind.config already defines
   these tokens as named colors (ink / ink2 / plum / ember / cream),
   you can swap the arbitrary-value classes below for the plain ones.
   ============================================================ */

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }

  .sunset-wash {
    background:
      radial-gradient(120% 90% at 12% 8%, rgba(59,29,94,0.85), rgba(59,29,94,0) 55%),
      radial-gradient(130% 120% at 88% 18%, rgba(255,122,61,0.42), rgba(255,122,61,0) 50%),
      radial-gradient(160% 140% at 50% 120%, rgba(255,122,61,0.28), rgba(10,10,15,0) 55%),
      linear-gradient(180deg,#0a0a0f 0%,#120a1c 45%,#0a0a0f 100%);
  }
  .panel-plum {
    background:
      radial-gradient(140% 120% at 20% 0%, rgba(59,29,94,0.6), transparent 60%),
      linear-gradient(160deg,#150d22,#0c0913);
  }
  .ember-text {
    background: linear-gradient(100deg,#ff9b5e 0%,#ff7a3d 38%,#c06ad6 78%,#8b5cf0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
  .hairline { border-color: rgba(244,239,233,0.10); }
  .chip { background: rgba(244,239,233,0.04); border: 1px solid rgba(244,239,233,0.10); }

  .grain { position: relative; }
  .grain::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    opacity: .45;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .work-img { transition: transform .9s cubic-bezier(.16,1,.3,1), filter .9s ease; }
  .work-card:hover .work-img { transform: scale(1.045); filter: saturate(1.15) brightness(1.05); }

  .marquee-track { animation: slide 28s linear infinite; }
  @keyframes slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }

  ::selection { background: #ff7a3d; color: #0a0a0f; }
  html { scroll-behavior: smooth; }
`;

/* ============================================================
   CONTENT — Clipframe's real product data, unchanged in meaning
   ============================================================ */
const IMG = {
  heroSide:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1200&auto=format&fit=crop",
  studioWide:
    "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1600&auto=format&fit=crop",
  clip1:
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=900&auto=format&fit=crop",
  clip2:
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=900&auto=format&fit=crop",
  clip3:
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=900&auto=format&fit=crop",
  clip4:
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=900&auto=format&fit=crop",
  avatar1:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop",
  avatar2:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
  avatar3:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
};

const LOGOS = ["Studio Nova", "Radiant", "Cadence", "Northline", "Kilo Media", "Verve"];

const STATS = [
  { value: "2,4 M", label: "clips exportés" },
  { value: "38 s", label: "durée moy. d'export" },
  { value: "97 %", label: "clients satisfaits" },
  { value: "140+", label: "pays actifs" },
];

const WORK_ITEMS = [
  {
    span: 2,
    meta: "Interview podcast · Vertical 9:16",
    title: "Un clip percutant en moins d'une minute.",
    img: IMG.clip1,
  },
  {
    span: 2,
    meta: "Talk conférence · Carré 1:1",
    title: "Le bon extrait, sans revoir toute la vidéo.",
    img: IMG.clip2,
  },
  {
    span: 1,
    meta: "Stream gaming",
    title: "Highlights prêts à publier.",
    img: IMG.clip3,
  },
  {
    span: 1,
    meta: "Cours en ligne",
    title: "Des extraits pédagogiques nets.",
    img: IMG.clip4,
  },
];

const CAPABILITIES = [
  {
    title: "Découpe précise",
    desc: "Positionne tes points d'entrée et de sortie à la seconde près.",
    icon: (
      <path d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-15L8 18M8 6l10 12" />
    ),
  },
  {
    title: "Rien à installer",
    desc: "Le traitement se fait directement dans ton navigateur.",
    icon: <path d="M4 16a5 5 0 0 1 1.6-9.75A6 6 0 0 1 17.5 8.5 4.5 4.5 0 0 1 17 17H6a5 5 0 0 1-2-1Z" />,
  },
  {
    title: "Formats plateformes",
    desc: "Exporte en vertical 9:16 pour Shorts, Reels et TikTok.",
    icon: <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h.01" />,
  },
  {
    title: "Paiement à l'usage",
    desc: "Des crédits sans engagement, ou un abonnement si tu clippes tous les jours.",
    icon: <path d="M12 3v18M17 7.5c0-1.93-2.24-3.5-5-3.5S7 5.57 7 7.5 9.24 11 12 11s5 1.57 5 3.5-2.24 3.5-5 3.5-5-1.57-5-3.5" />,
  },
  {
    title: "Aperçu en direct",
    desc: "Vois le rendu final image par image avant d'exporter quoi que ce soit.",
    icon: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  },
  {
    title: "Travail d'équipe",
    desc: "Toute l'équipe clippe depuis le même navigateur, sans fichiers à échanger.",
    icon: <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 9v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />,
  },
];

const STEPS = [
  { time: "00:00", title: "Importe ta vidéo", desc: "Glisse ton fichier dans le navigateur, aucune installation." },
  { time: "00:15", title: "Place IN et OUT", desc: "Fais glisser les curseurs pour isoler le meilleur passage." },
  { time: "00:40", title: "Exporte le clip", desc: "Télécharge un MP4 prêt à publier, en un clic." },
];

const TESTIMONIALS = [
  {
    name: "Léa Fontaine",
    role: "Monteuse freelance",
    avatar: IMG.avatar1,
    quote:
      "Je sors mes shorts en dix minutes au lieu d'ouvrir un logiciel de montage complet pour trois secondes de clip.",
  },
  {
    name: "Marc Dubreuil",
    role: "Host podcast",
    avatar: IMG.avatar2,
    quote:
      "Le point d'entrée / sortie est tellement précis que je n'ai plus besoin de vérifier deux fois avant d'exporter.",
  },
  {
    name: "Inès Kaddour",
    role: "Créatrice, 210k abonnés",
    avatar: IMG.avatar3,
    quote:
      "Toute mon équipe clippe depuis le navigateur maintenant. Plus aucun rendu qui bloque l'ordinateur.",
  },
];

const FAQS = [
  { q: "Ai-je besoin d'installer un logiciel ?", a: "Non. Tout le découpage et l'export se font directement dans ton navigateur, sur ordinateur ou tablette." },
  { q: "Quelle est la taille maximale de vidéo acceptée ?", a: "Jusqu'à 4 Go par fichier en formule gratuite, et sans limite avec un abonnement Pro." },
  { q: "Dans quels formats puis-je exporter ?", a: "Vertical 9:16 pour Shorts/Reels/TikTok, carré 1:1, et horizontal 16:9, tous en MP4 prêts à publier." },
  { q: "Que deviennent mes vidéos après l'export ?", a: "Tes fichiers sont supprimés de nos serveurs 24 heures après le traitement. Rien n'est conservé au-delà." },
  { q: "Puis-je annuler mon abonnement à tout moment ?", a: "Oui, en un clic depuis les paramètres de facturation, sans engagement ni frais caché." },
];

const WAVEFORM = [14,22,18,34,41,29,47,60,52,38,24,31,44,58,66,54,40,27,19,33,46,61,70,63,49,35,22,28,42,55,64,57,43,30,17,25,39,53,62,48,33,20,15,23,36,50,59,45,31,18];
const AUDIO_TRACK = [6,9,14,11,8,15,20,16,10,7,12,18,22,17,9,6,11,16,21,19,13,8,10,15,19,14,9,6,12,17,20,15,10,7,11,16,18,13,8,6,9,13,17,14,10,7,11,15,12,8];

function useTimecode() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 24), 1000 / 12);
    return () => clearInterval(id);
  }, []);
  const totalSeconds = 74;
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}:${pad(frame)}`;
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = "", delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   NAV — fixed glass header
   ============================================================ */
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/55 border-b hairline">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-[18px] tracking-tight text-[#f4efe9]">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#ff7a3d,#8b5cf0)" }}
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="#0a0a0f">
              <path d="M12 2 2 12l10 10 10-10L12 2Zm0 3.6L18.4 12 12 18.4 5.6 12 12 5.6Z" />
            </svg>
          </span>
          Clip<span className="text-[#ff7a3d]">frame</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-9 text-[13.5px] font-medium text-[#f4efe9]/70">
          <a href="#comment-ca-marche" className="hover:text-[#f4efe9] transition-colors">Fonctionnement</a>
          <a href="#clips" className="hover:text-[#f4efe9] transition-colors">Exemples</a>
          <Link to="/pricing" className="hover:text-[#f4efe9] transition-colors">Tarifs</Link>
          <a href="#faq" className="hover:text-[#f4efe9] transition-colors">FAQ</a>
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <Link to="/login" className="text-[13.5px] text-[#f4efe9]/70 hover:text-[#f4efe9] transition-colors">Connexion</Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 bg-[#f4efe9] text-[#0a0a0f] text-[13.5px] font-semibold px-5 py-2.5 rounded-full hover:bg-[#ff7a3d] transition-colors"
          >
            Commencer
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </Link>
        </div>

        <button className="lg:hidden w-9 h-9 flex items-center justify-center text-[#f4efe9]" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t hairline px-6 py-5 flex flex-col gap-4 text-sm bg-[#0a0a0f]">
          <a href="#comment-ca-marche" onClick={() => setOpen(false)} className="text-[#f4efe9]/70">Fonctionnement</a>
          <a href="#clips" onClick={() => setOpen(false)} className="text-[#f4efe9]/70">Exemples</a>
          <Link to="/pricing" onClick={() => setOpen(false)} className="text-[#f4efe9]/70">Tarifs</Link>
          <a href="#faq" onClick={() => setOpen(false)} className="text-[#f4efe9]/70">FAQ</a>
          <Link to="/login" onClick={() => setOpen(false)} className="text-[#f4efe9]/70">Connexion</Link>
          <Link to="/register" onClick={() => setOpen(false)} className="text-center px-5 py-2.5 rounded-full bg-[#f4efe9] text-[#0a0a0f] font-semibold">Commencer</Link>
        </div>
      )}
    </header>
  );
}

/* ============================================================
   HERO — sunset wash + product timeline as the "showreel" panel
   ============================================================ */
function TimelinePanel() {
  const timecode = useTimecode();
  return (
    <div className="group relative rounded-[20px] overflow-hidden hairline border shadow-2xl shadow-black/60 bg-[#0e0d16]">
      <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b hairline">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#f4efe9]/20" />
          <span className="w-2 h-2 rounded-full bg-[#f4efe9]/20" />
          <span className="w-2 h-2 rounded-full bg-[#f4efe9]/20" />
          <span className="ml-2 font-mono text-[11px] text-[#f4efe9]/45 truncate">interview-podcast-ep12.mp4</span>
        </div>
        <span className="chip rounded-full px-3 py-1 text-[11px] font-display uppercase tracking-[0.14em] text-[#f4efe9]/60">Aperçu en direct</span>
      </div>

      <div className="relative aspect-video grain">
        <img src={IMG.heroSide} alt="Aperçu de la vidéo en cours de montage" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,15,0.85), transparent 55%)" }} />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-[#f4efe9] bg-[#0a0a0f]/70 backdrop-blur-sm rounded px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d] animate-pulse" /> REC
        </div>
        <button className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#f4efe9]/95 text-[#0a0a0f] flex items-center justify-center group-hover:scale-105 transition-transform" aria-label="Lire l'aperçu">
          <svg viewBox="0 0 24 24" className="w-6 h-6 translate-x-0.5" fill="currentColor"><path d="M8 5v14l11-7L8 5Z" /></svg>
        </button>
        <div className="absolute bottom-3 left-3 font-mono text-[11px] text-[#f4efe9] tabular-nums bg-[#0a0a0f]/60 rounded px-2 py-1">
          {timecode} <span className="text-[#f4efe9]/45">/ 01:14:00</span>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex items-stretch gap-2 mb-1.5">
          <span className="w-7 shrink-0 flex items-center justify-center font-mono text-[9px] text-[#f4efe9]/45 rounded bg-[#f4efe9]/5">V1</span>
          <div className="flex items-end gap-[3px] h-12 flex-1">
            {WAVEFORM.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 11 && i <= 31 ? "#ff7a3d" : "rgba(244,239,233,0.08)" }} />
            ))}
          </div>
        </div>
        <div className="flex items-stretch gap-2 mb-4">
          <span className="w-7 shrink-0 flex items-center justify-center font-mono text-[9px] text-[#f4efe9]/45 rounded bg-[#f4efe9]/5">A1</span>
          <div className="flex items-end gap-[3px] h-6 flex-1">
            {AUDIO_TRACK.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 11 && i <= 31 ? "#8b5cf0" : "rgba(244,239,233,0.08)" }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t hairline">
          <p className="font-mono text-[11px] text-[#f4efe9]/45">Clip sélectionné — <span className="text-[#f4efe9]/80">00:00:08:12</span></p>
          <span className="font-mono text-[10px] tracking-wide text-[#ff7a3d] chip rounded-full px-2.5 py-1">Format 9:16 prêt</span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="sunset-wash grain relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -right-20 w-[640px] h-[640px] rounded-full opacity-60" style={{ background: "radial-gradient(circle,#ff7a3d,transparent 70%)", filter: "blur(120px)" }} />
      <div className="pointer-events-none absolute top-1/3 -left-32 w-[520px] h-[520px] rounded-full opacity-50" style={{ background: "radial-gradient(circle,#3b1d5e,transparent 70%)", filter: "blur(130px)" }} />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 pt-[148px] pb-20 lg:pt-[180px] lg:pb-28">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <span className="chip rounded-full px-3.5 py-1.5 text-[12px] text-[#f4efe9]/80 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d]" /> Montage vidéo dans le navigateur
          </span>
          <span className="hidden sm:inline text-[12px] text-[#f4efe9]/45">3 crédits offerts · sans carte bancaire</span>
        </div>

        <h1 className="font-display font-bold leading-[0.95] tracking-[-0.02em] text-[clamp(2.6rem,8vw,6.4rem)] text-[#f4efe9] max-w-4xl">
          Trouve le clip parfait. <span className="ember-text">Exporte-le</span> en secondes.
        </h1>

        <div className="mt-9 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-end">
          <p className="max-w-xl text-[#f4efe9]/72 text-lg leading-relaxed">
            Importe ta vidéo, place tes points d'entrée et de sortie, télécharge ton clip.
            Aucun logiciel, aucune attente de rendu serveur.
          </p>
          <div className="flex flex-col sm:flex-row lg:justify-end items-start sm:items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-[#ff7a3d] text-[#0a0a0f] font-semibold px-6 py-3.5 rounded-full hover:bg-[#ff9b5e] transition-colors"
            >
              Commencer gratuitement
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-3 text-[#f4efe9]/80 hover:text-[#f4efe9] transition-colors">
              <span className="w-9 h-9 rounded-full hairline border flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 translate-x-0.5" fill="currentColor"><path d="M8 5v14l11-7L8 5Z" /></svg>
              </span>
              Voir les tarifs
            </Link>
          </div>
        </div>

        <div className="mt-14 lg:mt-20">
          <Reveal><TimelinePanel /></Reveal>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden hairline border" style={{ background: "rgba(244,239,233,0.08)" }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="bg-[#0e0d16] px-5 py-6">
              <div className={`font-display font-bold text-[clamp(1.6rem,2.4vw,2.3rem)] ${i === 0 ? "text-[#ff7a3d]" : "text-[#f4efe9]"}`}>{s.value}</div>
              <div className="text-[12.5px] text-[#f4efe9]/55 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   RECOGNITION MARQUEE — used by creators/studios
   ============================================================ */
function LogoMarquee() {
  const row = (
    <div className="flex items-center gap-14 pr-14">
      {LOGOS.map((name) => (
        <span key={name} className="font-display font-semibold text-[#f4efe9]/45 text-xl tracking-tight whitespace-nowrap">{name}</span>
      ))}
    </div>
  );
  return (
    <section className="panel-plum grain border-y hairline py-16 lg:py-20 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 mb-10">
        <p className="text-[12px] tracking-[0.18em] uppercase text-[#f4efe9]/45 font-display text-center">
          Utilisé par des créateurs et studios dans plus de 140 pays
        </p>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 z-10" style={{ background: "linear-gradient(to right, #100a1b, transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 z-10" style={{ background: "linear-gradient(to left, #100a1b, transparent)" }} />
        <div className="flex w-max marquee-track">{row}{row}</div>
      </div>
    </section>
  );
}

/* ============================================================
   WORK SHOWCASE — clip gallery as masonry cards
   ============================================================ */
function WorkShowcase() {
  return (
    <section id="clips" className="bg-[#0a0a0f] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-6">
          <div>
            <p className="text-[#ff7a3d] text-[12px] tracking-[0.18em] uppercase font-display mb-3">Exemples</p>
            <h2 className="font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] text-[#f4efe9] max-w-xl">Des clips prêts à publier.</h2>
          </div>
          <Link to="/pricing" className="text-[#f4efe9]/70 border-b hairline pb-1 inline-flex items-center gap-1.5 hover:text-[#f4efe9] transition-colors">
            Voir les tarifs
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </Link>
        </div>

        <Reveal>
          <div className="grid md:grid-cols-2 gap-5 lg:gap-7">
            {WORK_ITEMS.map((item) => (
              <a key={item.title} className={`work-card group relative rounded-2xl overflow-hidden hairline border block ${item.span === 2 ? "md:col-span-2 aspect-[16/8]" : "aspect-[4/3.4]"}`}>
                <div className="absolute inset-0 grain">
                  <img src={item.img} alt={item.meta} className="work-img w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,15,0.88), rgba(10,10,15,0.1) 55%, transparent)" }} />
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="uppercase tracking-[0.16em] text-[12px] text-[#f4efe9]/65 font-display mb-2">{item.meta}</p>
                    <h3 className={`font-display font-semibold text-[#f4efe9] ${item.span === 2 ? "text-[clamp(1.4rem,2.6vw,2rem)]" : "text-[clamp(1.2rem,2vw,1.5rem)]"}`}>{item.title}</h3>
                  </div>
                  <span className="shrink-0 w-11 h-11 rounded-full bg-[#f4efe9]/95 text-[#0a0a0f] flex items-center justify-center group-hover:bg-[#ff7a3d] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   CAPABILITIES GRID
   ============================================================ */
function Capabilities() {
  return (
    <section className="bg-[#0a0a0f] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-14">
          <p className="text-[#ff7a3d] text-[12px] tracking-[0.18em] uppercase font-display mb-4">Ce qui change</p>
          <h2 className="font-display font-bold text-[clamp(2rem,4.4vw,3.4rem)] text-[#f4efe9] mb-5">
            Un seul onglet, tout le <span className="ember-text">montage</span>.
          </h2>
          <p className="text-[#f4efe9]/65 leading-relaxed">
            Chaque outil dont tu as besoin pour transformer un tournage brut en clip publiable, sans jamais quitter le navigateur.
          </p>
        </div>
        <Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-2xl hairline border bg-[#0e0d16] p-7 hover:bg-[#13101d] transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,rgba(255,122,61,.22),rgba(139,92,240,.22))" }}>
                  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] text-[#ff7a3d]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                </div>
                <h3 className="font-display font-semibold text-[1.18rem] text-[#f4efe9] mb-2">{c.title}</h3>
                <p className="text-[14px] text-[#f4efe9]/60 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   PROCESS STRIP — comment ça marche
   ============================================================ */
function ProcessStrip() {
  return (
    <section id="comment-ca-marche" className="bg-[#0e0d16] border-y hairline py-20 lg:py-24">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-center">
        <div>
          <p className="text-[#ff7a3d] text-[12px] tracking-[0.18em] uppercase font-display mb-4">Comment ça marche</p>
          <h2 className="font-display font-bold text-[clamp(1.9rem,3.8vw,3rem)] text-[#f4efe9] mb-5">Du tournage brut au clip publié.</h2>
          <p className="max-w-lg text-[#f4efe9]/65 leading-relaxed mb-8">
            Que tu enregistres un podcast, un talk ou un stream, Clipframe reste ouvert dans ton navigateur pendant que tu travailles. Pas d'export intermédiaire, pas de fichier à déplacer.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-full hairline border px-5 py-3 text-[#f4efe9] hover:bg-[#f4efe9] hover:text-[#0a0a0f] transition-colors">
            Essayer maintenant
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden hairline border" style={{ background: "rgba(244,239,233,0.08)" }}>
          {STEPS.map((step, i) => (
            <div key={step.time} className="bg-[#0a0a0f] p-6">
              <div className="text-[#ff7a3d] font-display text-[12px] tracking-[0.18em] uppercase mb-3">0{i + 1} · {step.time}</div>
              <h3 className="font-display font-semibold text-[1.05rem] text-[#f4efe9] mb-2">{step.title}</h3>
              <p className="text-[13px] text-[#f4efe9]/55 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TESTIMONIALS
   ============================================================ */
function Testimonials() {
  return (
    <section className="bg-[#0a0a0f] py-24 lg:py-28">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <h2 className="font-display font-bold text-[clamp(1.8rem,3.4vw,2.6rem)] text-[#f4efe9] text-center mb-14">Ce qu'en disent les créateurs.</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="h-full rounded-2xl hairline border bg-[#0e0d16] p-7 flex flex-col">
                <p className="text-[#f4efe9]/85 leading-relaxed mb-7 flex-1">“{t.quote}”</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden hairline border shrink-0">
                    <img src={t.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm text-[#f4efe9]">{t.name}</p>
                    <p className="text-[12px] text-[#f4efe9]/50">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FAQ
   ============================================================ */
function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b hairline">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 py-5 text-left" aria-expanded={isOpen}>
        <span className="font-display font-medium text-[#f4efe9]">{item.q}</span>
        <svg viewBox="0 0 24 24" className={`w-4 h-4 shrink-0 text-[#f4efe9]/45 transition-transform ${isOpen ? "rotate-45" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><p className="text-[#f4efe9]/60 text-sm leading-relaxed pr-8">{item.a}</p></div>
      </div>
    </div>
  );
}

function Faq() {
  const [openFaq, setOpenFaq] = useState(0);
  return (
    <section id="faq" className="bg-[#0a0a0f] py-24 lg:py-28">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="font-display font-bold text-[clamp(1.8rem,3.4vw,2.6rem)] text-[#f4efe9] text-center mb-12">Questions fréquentes</h2>
        <div>{FAQS.map((item, i) => (<FaqItem key={item.q} item={item} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />))}</div>
      </div>
    </section>
  );
}

/* ============================================================
   CLOSING CTA — sunset wash
   ============================================================ */
function ClosingCta() {
  return (
    <section id="contact" className="sunset-wash grain relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 -bottom-40 -translate-x-1/2 w-[700px] h-[900px] rounded-full opacity-60" style={{ background: "radial-gradient(circle,#ff7a3d,transparent 70%)", filter: "blur(140px)" }} />
      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 py-28 lg:py-40 text-center">
        <span className="chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] text-[#f4efe9]/80 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d] animate-pulse" /> 3 crédits offerts à l'inscription
        </span>
        <h2 className="font-display font-bold leading-[0.96] tracking-[-0.02em] text-[clamp(2.4rem,6.5vw,5rem)] text-[#f4efe9]">
          Prêt à monter <span className="ember-text">ton premier clip ?</span>
        </h2>
        <p className="max-w-xl mx-auto text-[#f4efe9]/72 mt-6 text-lg">Aucune carte requise. Commence à exporter en moins de deux minutes.</p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="bg-[#f4efe9] text-[#0a0a0f] font-semibold px-7 py-4 rounded-full hover:bg-[#ff7a3d] transition-colors inline-flex items-center gap-2">
            Créer mon compte
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </Link>
          <Link to="/pricing" className="rounded-full hairline border px-7 py-4 text-[#f4efe9] hover:bg-[#f4efe9] hover:text-[#0a0a0f] transition-colors">Voir les tarifs</Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER — 4 columns
   ============================================================ */
function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t hairline">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2 font-display font-bold text-[#f4efe9] text-lg mb-3">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#ff7a3d,#8b5cf0)" }}>
                <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="#0a0a0f"><path d="M12 2 2 12l10 10 10-10L12 2Zm0 3.6L18.4 12 12 18.4 5.6 12 12 5.6Z" /></svg>
              </span>
              Clip<span className="text-[#ff7a3d]">frame</span>
            </div>
            <p className="text-[#f4efe9]/55 text-sm leading-relaxed max-w-xs mb-5">Le montage de clips, sans logiciel, sans attente de rendu serveur.</p>
            <div className="flex items-center gap-3">
              {["X", "IG", "YT"].map((s) => (
                <span key={s} className="w-9 h-9 rounded-full hairline border flex items-center justify-center text-[11px] text-[#f4efe9]/60 hover:bg-[#f4efe9] hover:text-[#0a0a0f] transition-colors cursor-pointer">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold text-[13px] tracking-[0.16em] uppercase text-[#f4efe9]/45 mb-4">Produit</h4>
            <ul className="space-y-3 text-[14px] text-[#f4efe9]/65">
              <li><a href="#comment-ca-marche" className="hover:text-[#f4efe9] transition-colors">Fonctionnement</a></li>
              <li><Link to="/pricing" className="hover:text-[#f4efe9] transition-colors">Tarifs</Link></li>
              <li><a href="#clips" className="hover:text-[#f4efe9] transition-colors">Exemples</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-[13px] tracking-[0.16em] uppercase text-[#f4efe9]/45 mb-4">Entreprise</h4>
            <ul className="space-y-3 text-[14px] text-[#f4efe9]/65">
              <li><a href="#" className="hover:text-[#f4efe9] transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-[#f4efe9] transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-[#f4efe9] transition-colors">Carrières</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-[13px] tracking-[0.16em] uppercase text-[#f4efe9]/45 mb-4">Légal</h4>
            <ul className="space-y-3 text-[14px] text-[#f4efe9]/65">
              <li><a href="#" className="hover:text-[#f4efe9] transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-[#f4efe9] transition-colors">Conditions d'utilisation</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 pt-7 border-t hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#f4efe9]/45">
          <p>© 2026 Clipframe. Tous droits réservés.</p>
          <p>Fait pour être exporté, pas archivé.</p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Home() {
  return (
    <div className="font-body bg-[#0a0a0f] min-h-screen">
      <style>{GLOBAL_CSS}</style>
      <Nav />
      <Hero />
      <LogoMarquee />
      <WorkShowcase />
      <Capabilities />
      <ProcessStrip />
      <Testimonials />
      <Faq />
      <ClosingCta />
      <Footer />
    </div>
  );
}