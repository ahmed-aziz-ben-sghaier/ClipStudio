import { Link } from "react-router-dom";

export default function Cancel() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-surface2 border border-line flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl text-paper mb-3">Paiement annulé</h1>
        <p className="text-muted mb-8">
          Aucun montant n'a été débité. Tu peux réessayer quand tu veux.
        </p>
        <Link
          to="/pricing"
          className="inline-block px-6 py-3 rounded-lg bg-rec text-ink font-semibold hover:bg-rec-dim transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rec"
        >
          Retour aux tarifs
        </Link>
      </div>
    </div>
  );
}