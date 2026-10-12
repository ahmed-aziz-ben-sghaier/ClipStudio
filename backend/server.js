import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import stripeRoutes, { stripeWebhookHandler } from "./routes/stripe.js";
import projectsRoutes from "./routes/projects.js";
import templatesRoutes from "./routes/templates.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import { requireAuth } from "./middleware/auth.js";
import { findUserById, saveUser } from "./db.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));

// Dossier où sont stockés les fichiers vidéo uploadés / exportés par les
// utilisateurs (voir routes/projects.js, qui utilise multer pour y écrire).
// Créé automatiquement s'il n'existe pas encore.
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "videos");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Sert les vidéos uploadées via /api/projects, pour que le frontend
// puisse les lire directement avec une URL du type
// http://localhost:4000/uploads/videos/xxxx.mp4
app.use("/uploads/videos", express.static(UPLOADS_DIR));

// Sert les vidéos générées par l'IA (voir routes/ai.js) afin que le
// frontend puisse les charger/télécharger via une URL simple.
app.use("/generated", express.static(path.join(process.cwd(), "generated")));

// Le webhook Stripe a besoin du body BRUT (pas parsé en JSON) pour
// vérifier la signature -> on le déclare AVANT express.json().
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/ai", aiRoutes);
// Protection (requireAuth + requireAdmin) déjà appliquée à l'intérieur
// de routes/admin.js via router.use(...), donc rien à ajouter ici.
app.use("/api/admin", adminRoutes);

// Exemple d'action qui consomme un crédit (ex: export d'un clip)
app.post("/api/consume-credit", requireAuth, async (req, res) => {
  // PostgreSQL => await obligatoire
  const user = await findUserById(req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (user.credits <= 0) {
    return res.status(402).json({ error: "Crédits insuffisants" });
  }
  user.credits -= 1;
  await saveUser(user);
  res.json({ credits: user.credits });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
  console.log(`📁 Uploads vidéo servis depuis ${UPLOADS_DIR}`);
});