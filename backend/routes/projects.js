import { Router } from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth.js";
import { getProjects, saveProject, findProjectById } from "../db.js";

const router = Router();


/* GET /api/projects?trashed=true|false */
router.get("/", requireAuth, async (req, res) => {

  const wantTrashed = req.query.trashed === "true";

  const projects = (await getProjects())
    .filter(
      (p) =>
        p.userId === req.userId &&
        Boolean(p.trashed) === wantTrashed
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );

  res.json(projects);
});


/* POST /api/projects — crée un projet */
router.post("/", requireAuth, async (req, res) => {

  const { title, ratio, duration, thumbnailUrl } = req.body || {};

  const now = new Date().toISOString();

  const project = {
    id: nanoid(),
    userId: req.userId,
    title: title || "Projet sans titre",
    ratio: ratio || "16:9",
    duration: duration || 0,
    thumbnailUrl: thumbnailUrl || null,
    status: "brouillon",
    trashed: false,
    createdAt: now,
    updatedAt: now,
  };


  await saveProject(project);

  res.status(201).json(project);
});


/* PATCH /api/projects/:id */
router.patch("/:id", requireAuth, async (req, res) => {

  const project = await findProjectById(req.params.id);

  if (!project || project.userId !== req.userId) {
    return res.status(404).json({
      error: "Projet introuvable",
    });
  }


  const allowed = [
    "title",
    "ratio",
    "duration",
    "thumbnailUrl",
    "status",
  ];


  for (const key of allowed) {
    if (req.body?.[key] !== undefined) {
      project[key] = req.body[key];
    }
  }


  project.updatedAt = new Date().toISOString();


  await saveProject(project);


  res.json(project);
});


/* DELETE /api/projects/:id */
router.delete("/:id", requireAuth, async (req, res) => {

  const project = await findProjectById(req.params.id);


  if (!project || project.userId !== req.userId) {
    return res.status(404).json({
      error: "Projet introuvable",
    });
  }


  project.trashed = true;
  project.updatedAt = new Date().toISOString();


  await saveProject(project);


  res.json({
    ok: true,
  });
});


/* POST /api/projects/:id/restore */
router.post("/:id/restore", requireAuth, async (req, res) => {

  const project = await findProjectById(req.params.id);


  if (!project || project.userId !== req.userId) {
    return res.status(404).json({
      error: "Projet introuvable",
    });
  }


  project.trashed = false;
  project.updatedAt = new Date().toISOString();


  await saveProject(project);


  res.json(project);
});


export default router;