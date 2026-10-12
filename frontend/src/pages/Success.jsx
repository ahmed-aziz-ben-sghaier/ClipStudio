import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Success() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Le webhook Stripe met à jour les crédits côté backend ;
    // on rafraîchit l'utilisateur pour refléter le nouveau solde.
    const t = setTimeout(() => refreshUser(), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-play/10 border border-play/25 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-play" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl text-paper mb-3">Paiement réussi</h1>
        <p className="text-muted mb-8">
          Tes crédits ont été ajoutés à ton compte.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 rounded-lg bg-rec text-ink font-semibold hover:bg-rec-dim transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rec"
        >
          Retour au studio
        </Link>
      </div>
    </div>
  );
}