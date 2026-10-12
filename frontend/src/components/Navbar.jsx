import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/* Shares the same cinematic sunset tokens as Home.jsx / Login.jsx / Register.jsx / Pricing.jsx / Dashboard.jsx.
   If this is already loaded once at the app root, delete the <style> tag below. */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
  .font-display { font-family: 'Space Grotesk', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  .hairline { border-color: rgba(244,239,233,0.10); }
  .chip { background: rgba(244,239,233,0.04); border: 1px solid rgba(244,239,233,0.10); }
  ::selection { background: #ff7a3d; color: #0a0a0f; }
`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="font-body flex items-center justify-between px-6 lg:px-10 h-[68px] backdrop-blur-xl bg-[#0a0a0f]/55 border-b hairline">
      <style>{GLOBAL_CSS}</style>

      <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-[18px] tracking-tight text-[#f4efe9]">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#ff7a3d,#8b5cf0)" }}
        >
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="#0a0a0f">
            <path d="M12 2 2 12l10 10 10-10L12 2Zm0 3.6L18.4 12 12 18.4 5.6 12 12 5.6Z" />
          </svg>
        </span>
        Clip<span className="text-[#ff7a3d]">Studio</span>
      </Link>

      <div className="flex items-center gap-5 text-[13.5px]">
        <Link to="/pricing" className="text-[#f4efe9]/70 hover:text-[#f4efe9] transition-colors">
          Tarifs
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" className="text-[#f4efe9]/70 hover:text-[#f4efe9] transition-colors">
              Studio
            </Link>
            <span className="chip rounded-full px-3 py-1.5 text-[#f4efe9]/80 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a3d]" />
              {user.credits} crédits
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="px-3.5 py-2 rounded-lg hairline border text-[#f4efe9] hover:bg-[#f4efe9] hover:text-[#0a0a0f] transition-colors"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-[#f4efe9]/70 hover:text-[#f4efe9] transition-colors">
              Connexion
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 bg-[#ff7a3d] text-[#0a0a0f] font-semibold px-4 py-2 rounded-full hover:bg-[#ff9b5e] transition-colors"
            >
              Créer un compte
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}