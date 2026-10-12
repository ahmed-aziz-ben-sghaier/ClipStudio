import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth.js";
import { findUserById, saveUser, saveProject } from "../db.js";

const router = Router();

const AI_VIDEO_SERVICE_URL =
  process.env.AI_VIDEO_SERVICE_URL || "http://localhost:8001";

const AI_GENERATION_COST = 1;

// jobId -> { userId, prompt, style, ratio, duration }
const jobs = new Map();
const deductedJobs = new Set();

/* POST /api/ai/generate */
router.post("/generate", requireAuth, async (req, res) => {
  const { prompt, style, duration, ratio } = req.body || {};

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: "La description ne peut pas être vide.",
    });
  }

  // PostgreSQL => await obligatoire
  const user = await findUserById(req.userId);

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable",
    });
  }

  if (user.credits < AI_GENERATION_COST) {
    return res.status(402).json({
      error: "Crédits insuffisants pour générer une vidéo IA.",
    });
  }

  try {
    const upstream = await fetch(`${AI_VIDEO_SERVICE_URL}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        style,
        duration,
        ratio,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          data.detail ||
          data.error ||
          "Le service de génération vidéo a refusé la demande.",
      });
    }

    const jobId = data.jobId || data.job_id;

    if (!jobId) {
      console.error("Réponse inattendue du microservice Python :", data);

      return res.status(502).json({
        error: "Réponse invalide du service de génération vidéo.",
      });
    }

    jobs.set(jobId, {
      userId: req.userId,
      prompt,
      style,
      ratio: ratio || "16:9",
      duration: duration || 0,
    });

    res.json({
      jobId,
    });
  } catch (err) {
    console.error("Service IA inaccessible :", err?.message || err);

    res.status(502).json({
      error:
        "Service de génération vidéo indisponible. Vérifie ai_video_api.py.",
    });
  }
});

/* GET /api/ai/status/:jobId */
router.get("/status/:jobId", requireAuth, async (req, res) => {
  const { jobId } = req.params;

  const meta = jobs.get(jobId);

  if (meta && meta.userId !== req.userId) {
    return res.status(403).json({
      error: "Ce job ne t'appartient pas.",
    });
  }

  try {
    const upstream = await fetch(
      `${AI_VIDEO_SERVICE_URL}/ai/generate/${jobId}/status`
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          data.detail ||
          data.error ||
          "Statut de génération introuvable.",
      });
    }

    const status =
      data.status === "completed"
        ? "completed"
        : data.status === "failed"
        ? "failed"
        : "processing";

    const response = {
      status,
      progress: data.progress ?? 0,
    };

    const videoUrl = data.videoUrl || data.video_url;

    if (videoUrl) {
      response.videoUrl = videoUrl;
    }

    const errorMessage = data.errorMessage || data.error_message;

    if (errorMessage) {
      response.errorMessage = errorMessage;
    }

    if (status === "completed" && !deductedJobs.has(jobId)) {
      const ownerId = meta?.userId || req.userId;

      // PostgreSQL => await obligatoire
      const user = await findUserById(ownerId);

      if (user) {
        user.credits = Math.max(0, user.credits - AI_GENERATION_COST);

        // PostgreSQL => await obligatoire
        await saveUser(user);
      }

      // --- Création de l'entrée projet pour le dashboard ---
      const now = new Date().toISOString();
      const project = {
        id: nanoid(),
        userId: ownerId,
        title: meta?.prompt ? meta.prompt.slice(0, 60) : "Vidéo générée par IA",
        ratio: meta?.ratio || "16:9",
        duration: meta?.duration || 0,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || null,
        videoUrl: videoUrl || null,
        status: "exporté",
        trashed: false,
        createdAt: now,
        updatedAt: now,
      };

      // PostgreSQL => await obligatoire
      await saveProject(project);
      // -------------------------------------------------------

      deductedJobs.add(jobId);
    }

    res.json(response);
  } catch (err) {
    console.error("Service IA inaccessible :", err?.message || err);

    res.status(502).json({
      error: "Service de génération vidéo indisponible pour le moment.",
    });
  }
});

export default router;