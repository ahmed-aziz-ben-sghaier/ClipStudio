import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

/* Shares the same cinematic sunset tokens as Home.jsx / Login.jsx / Register.jsx.
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

const PLANS = [
  {
    name: "Pack 10 crédits",
    price: "9,99 €",
    unit: "paiement unique",
    priceId: import.meta.env.VITE_PRICE_PACK_10,
    description: "Idéal pour tester la plateforme sans engagement.",
    perks: ["10 exports", "Formats 9:16, 1:1, 16:9", "Crédits valables 12 mois"],
  },
  {
    name: "Pack 50 crédits",
    price: "34,99 €",
    unit: "paiement unique",
    priceId: import.meta.env.VITE_PRICE_PACK_50,
    description: "Le meilleur rapport crédit / prix pour un usage régulier.",
    perks: ["50 exports", "Formats 9:16, 1:1, 16:9", "Crédits valables 12 mois"],
    highlighted: true,
  },
  {
    name: "Abonnement Pro",
    price: "19,99 €",
    unit: "par mois",
    priceId: import.meta.env.VITE_PRICE_SUB_PRO,
    description: "Pour les créateurs qui publient chaque semaine.",
    perks: ["Exports illimités", "Sans watermark", "Résiliable à tout moment"],
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Pricing() {
  const { token, user, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);

  const handleBuy = async (priceId) => {
    // L'état d'auth n'est pas encore résolu (appel /me en cours) :
    // on ignore le clic pour éviter une redirection injustifiée vers /login.
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    setLoadingId(priceId);
    try {
      const { url } = await api.createCheckoutSession(priceId, token);
      window.location.href = url;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="font-body bg-[#0a0a0f] min-h-screen">
      <style>{GLOBAL_CSS}</style>

      {/* Header en sunset-wash, cohérent avec le hero / la CTA de la home */}
      <section className="sunset-wash grain relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 right-1/4 w-[520px] h-[520px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle,#ff7a3d,transparent 70%)", filter: "blur(120px)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-0 left-0 w-[460px] h-[460px] rounded-full opacity-45"
          style={{ background: "radial-gradient(circle,#3b1d5e,transparent 70%)", filter: "blur(130px)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
          <span className="chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] text-[#f4efe9]/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d]" />
            Tarifs
          </span>
          <h1 className="font-display font-bold text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.05] text-[#f4efe9] mb-4">
            Un tarif pour chaque <span className="ember-text">rythme</span> de publication.
          </h1>
          <p className="text-[#f4efe9]/65 max-w-md mx-auto leading-relaxed">
            Paye à l'usage avec des crédits, ou passe à l'abonnement quand tu clippes toutes les semaines.
          </p>
        </div>
      </section>

      {/* Grille de plans */}
      <section className="max-w-5xl mx-auto px-6 pb-24 -mt-6 relative">
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-6 sm:p-7 border transition-colors ${
                plan.highlighted
                  ? "border-[#ff7a3d]/40 bg-[#ff7a3d]/[0.06]"
                  : "hairline border bg-[#0e0d16] hover:border-[#f4efe9]/25"
              }`}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 left-6 font-display text-[10px] tracking-[0.14em] uppercase text-[#0a0a0f] rounded-full px-2.5 py-1"
                  style={{ background: "linear-gradient(100deg,#ff9b5e,#ff7a3d)" }}
                >
                  Populaire
                </span>
              )}

              <h2 className="font-display font-semibold text-lg text-[#f4efe9] mb-1">{plan.name}</h2>
              <div className="flex items-baseline gap-1.5 my-3">
                <span className="font-display font-bold text-3xl text-[#f4efe9]">{plan.price}</span>
                <span className="text-[#f4efe9]/50 text-sm">/ {plan.unit}</span>
              </div>
              <p className="text-[#f4efe9]/60 text-sm mb-6 leading-relaxed">{plan.description}</p>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5 text-sm text-[#f4efe9]/90">
                    <span className="text-[#ff7a3d]">
                      <CheckIcon />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(plan.priceId)}
                disabled={loading || loadingId === plan.priceId}
                className={`w-full py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a3d] ${
                  plan.highlighted
                    ? "bg-[#ff7a3d] text-[#0a0a0f] hover:bg-[#ff9b5e]"
                    : "hairline border text-[#f4efe9] hover:bg-[#f4efe9] hover:text-[#0a0a0f]"
                }`}
              >
                {(loading || loadingId === plan.priceId) && (
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 animate-spin ${
                      plan.highlighted ? "border-[#0a0a0f]/30 border-t-[#0a0a0f]" : "border-[#f4efe9]/30 border-t-[#f4efe9]"
                    }`}
                    aria-hidden="true"
                  />
                )}
                {loading
                  ? "Chargement…"
                  : loadingId === plan.priceId
                  ? "Redirection…"
                  : "Choisir"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}