import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getTemplateThumbnails } from "../../backend/routes/pexels.js";

const TEMPLATES = [
  {
    id: "t1",
    title: "Intro dynamique",
    tag: "Réseaux sociaux",
    hue: 262,
    icon: "sparkles",
    preset: {
      format: "vertical",
      effect: "contrast",
      text: { enabled: true, content: "Ton titre ici", position: "bottom" },
    },
  },
  {
    id: "t2",
    title: "Transition glitch",
    tag: "Effets",
    hue: 172,
    icon: "glitch",
    preset: {
      format: "original",
      effect: "glitch",
      text: { enabled: false, content: "", position: "bottom" },
    },
  },
  {
    id: "t3",
    title: "Générique cinéma",
    tag: "Film",
    hue: 32,
    icon: "clapper",
    preset: {
      format: "landscape",
      effect: "vignette",
      text: { enabled: true, content: "FIN", position: "center" },
    },
  },
  {
    id: "t4",
    title: "Story verticale",
    tag: "Réseaux sociaux",
    hue: 320,
    icon: "ratioVertical",
    preset: {
      format: "vertical",
      effect: "warm",
      text: { enabled: true, content: "Ta story", position: "top" },
    },
  },
];

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const thumbnails = await getTemplateThumbnails(TEMPLATES.map((t) => t.id));
  const withThumbnails = TEMPLATES.map((t) => ({
    ...t,
    thumbnailUrl: thumbnails[t.id] || null,
  }));
  res.json(withThumbnails);
});

export default router;