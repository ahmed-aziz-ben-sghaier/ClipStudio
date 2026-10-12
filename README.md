# ClipStudio — Site de montage & clipping vidéo (React + Node + Stripe)

Stack simple et professionnelle :
- **Frontend** : React (Vite) + Tailwind CSS + `@ffmpeg/ffmpeg` (découpe vidéo *dans le navigateur*, pas de serveur vidéo à gérer)
- **Backend** : Node.js + Express, auth JWT, stockage JSON simple (remplaçable par une vraie DB)
- **Paiement** : Stripe Checkout (packs de crédits + abonnement) + Webhooks

```
clipping-app/
├── backend/     → API (auth, crédits, Stripe)
└── frontend/    → Interface React (studio de clipping)
```

## 1. Prérequis

- Node.js 18+
- Un compte [Stripe](https://dashboard.stripe.com) (mode test au départ)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) pour tester les webhooks en local (optionnel mais recommandé)

## 2. Configuration Stripe

1. Crée un compte Stripe et reste en **mode test**.
2. Dans **Produits** → crée 3 produits/prix :
   - Pack 10 crédits — paiement unique — ex. 9,99 €
   - Pack 50 crédits — paiement unique — ex. 34,99 €
   - Abonnement Pro — récurrent mensuel — ex. 19,99 €
3. Copie les `price_id` de chacun (commencent par `price_...`).
4. Récupère ta clé secrète dans **Développeurs → Clés API** (`sk_test_...`).

## 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Remplis `.env` avec :
- `JWT_SECRET` (n'importe quelle chaîne aléatoire longue)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PACK_10`, `STRIPE_PRICE_PACK_50`, `STRIPE_PRICE_SUB_PRO`
- `STRIPE_WEBHOOK_SECRET` (voir étape webhook ci-dessous)

Lance le serveur :
```bash
npm run dev
```
→ API disponible sur `http://localhost:4000`

### Webhook Stripe en local

Dans un autre terminal :
```bash
stripe login
stripe listen --forward-to localhost:4000/api/stripe/webhook
```
Cette commande t'affiche un `whsec_...` à coller dans `STRIPE_WEBHOOK_SECRET`.

⚠️ **Le webhook est indispensable** : c'est lui qui confirme le paiement et crédite le compte utilisateur. Sans lui, un paiement Stripe réussi n'ajoutera jamais de crédits.

## 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Remplis `.env` avec les mêmes `price_id` que le backend et l'URL de l'API.

Lance le frontend :
```bash
npm run dev
```
→ Site disponible sur `http://localhost:5173`

## 5. Tester le paiement

Utilise une carte de test Stripe : `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC.

## 6. Déploiement en production

| Composant | Suggestion |
|---|---|
| Frontend | Vercel / Netlify |
| Backend | Railway / Render / Fly.io |
| Base de données | Remplacer `db.json` par PostgreSQL (Neon, Supabase) dès que tu as des vrais utilisateurs |
| Webhook Stripe | Configure l'URL de prod dans le dashboard Stripe (Développeurs → Webhooks) |
| Variables d'env | Passer `STRIPE_SECRET_KEY` en clé **live** (`sk_live_...`) |

## 7. Aller plus loin (roadmap "pro")

- **Traitement vidéo côté serveur** : pour des vidéos longues/lourdes ou des exports en masse, `ffmpeg.wasm` atteint vite ses limites de performance. Passer à un traitement serveur avec `fluent-ffmpeg` + une file d'attente (BullMQ/Redis), ou déléguer à un service cloud (Shotstack, Mux, Cloudinary Video).
- **Stockage cloud** : uploader les vidéos vers S3/Cloudflare R2 plutôt que de tout traiter en mémoire navigateur.
- **Sous-titres automatiques** : intégrer une API de transcription (Whisper API) pour générer des sous-titres animés — fonctionnalité très demandée pour le "clipping" de contenu (highlights, shorts).
- **Watermark** : ajouter un filigrane sur les exports des comptes gratuits, le retirer pour les comptes payants (`-vf "drawtext=..."` en ffmpeg).
- **Multi-format export** : formats verticaux (9:16 pour TikTok/Reels/Shorts) via recadrage automatique.
- **Tests + CI** : ajouter Vitest (frontend) et Jest/Supertest (backend).

## 8. Sécurité — points à ne pas négliger

- Ne jamais exposer `STRIPE_SECRET_KEY` côté frontend (seul `price_id`, qui est public, y figure).
- Toujours valider le paiement via le **webhook**, jamais uniquement via la redirection `success_url` (un utilisateur pourrait sinon accéder à cette URL sans avoir payé).
- Ajouter un rate-limiting sur `/api/auth/login` en production (`express-rate-limit`) pour éviter le brute-force.
"# ClipStudio"  
