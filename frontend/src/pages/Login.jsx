import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/* Shares the same cinematic sunset tokens as Home.jsx.
   If you already load this global CSS once at the app root,
   you can delete the <style> block below and keep only the JSX. */
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
  .ember-text {
    background: linear-gradient(100deg,#ff9b5e 0%,#ff7a3d 38%,#c06ad6 78%,#8b5cf0 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
  }
  .hairline { border-color: rgba(244,239,233,0.10); }
  .chip { background: rgba(244,239,233,0.04); border: 1px solid rgba(244,239,233,0.10); }
  .grain { position: relative; }
  .grain::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .35; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  ::selection { background: #ff7a3d; color: #0a0a0f; }
`;

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.3 5.3A9.9 9.9 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.6M6.2 6.2C4.4 7.4 3.1 9.1 2 12c1 3 5 7 10 7 1.2 0 2.4-.2 3.5-.6" />
        </>
      ) : (
        <>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      // Les comptes admin atterrissent directement sur le panneau
      // d'administration ; tous les autres vont sur le dashboard classique.
      navigate(loggedInUser?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16 sunset-wash grain relative overflow-hidden">
      <style>{GLOBAL_CSS}</style>

      {/* Sun-bloom orbs, same signature as the home hero/CTA */}
      <div
        className="pointer-events-none absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle,#ff7a3d,transparent 70%)", filter: "blur(120px)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 w-[460px] h-[460px] rounded-full opacity-45"
        style={{ background: "radial-gradient(circle,#3b1d5e,transparent 70%)", filter: "blur(130px)" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 font-display font-bold text-[#f4efe9] text-lg mb-7">
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

          <span className="chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-[#f4efe9]/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d] animate-pulse" />
            Studio
          </span>

          <h1 className="font-display font-bold text-[clamp(1.7rem,4vw,2.2rem)] leading-tight text-[#f4efe9] mb-2">
            Content de te <span className="ember-text">revoir</span>
          </h1>
          <p className="text-[#f4efe9]/60 text-sm">
            Connecte-toi pour retrouver tes projets et crédits.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl hairline border bg-[#0e0d16] p-6 sm:p-7 space-y-4 shadow-2xl shadow-black/60"
        >
          <div>
            <label htmlFor="email" className="block font-display text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45 mb-1.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#f4efe9]/40 pointer-events-none">
                <MailIcon />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0a0a0f] border hairline text-[#f4efe9] placeholder:text-[#f4efe9]/30 focus:outline-none focus:border-[#ff7a3d]/60 focus:ring-2 focus:ring-[#ff7a3d]/20 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block font-display text-[11px] uppercase tracking-[0.14em] text-[#f4efe9]/45">
                Mot de passe
              </label>
              <Link to="/forgot-password" className="font-display text-[11px] text-[#f4efe9]/45 hover:text-[#ff7a3d] transition-colors">
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#f4efe9]/40 pointer-events-none">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-[#0a0a0f] border hairline text-[#f4efe9] placeholder:text-[#f4efe9]/30 focus:outline-none focus:border-[#ff7a3d]/60 focus:ring-2 focus:ring-[#ff7a3d]/20 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f4efe9]/40 hover:text-[#f4efe9] transition-colors"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 px-3.5 py-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d] mt-1.5 shrink-0" />
              <p className="text-[#ff7a3d] text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#ff7a3d] text-[#0a0a0f] font-semibold hover:bg-[#ff9b5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a3d]"
          >
            {loading && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] animate-spin" aria-hidden="true" />
            )}
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-sm text-[#f4efe9]/55 text-center mt-6">
          Pas encore de compte ?{" "}
          <Link to="/register" className="text-[#ff7a3d] hover:underline font-medium">
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  );
}