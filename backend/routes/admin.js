import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getUsers, findUserById, saveUser, getProjects } from "../db.js";

const router = Router();

// Toutes les routes de ce fichier exigent d'être connecté ET admin.
router.use(requireAuth, requireAdmin);

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}


/* GET /api/admin/stats — vue d'ensemble pour le tableau de bord admin */
router.get("/stats", async (req, res) => {
  const [users, projects] = await Promise.all([getUsers(), getProjects()]);

  const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
  const adminCount = users.filter((u) => u.role === "admin").length;
  const proCount = users.filter((u) => u.plan === "pro").length;
  const activeProjects = projects.filter((p) => !p.trashed).length;

  res.json({
    totalUsers: users.length,
    adminCount,
    proCount,
    totalCredits,
    totalProjects: projects.length,
    activeProjects,
  });
});


/* GET /api/admin/users — liste de tous les comptes (sans les mots de passe) */
router.get("/users", async (req, res) => {
  const users = await getUsers();
  const sorted = users
    .map(publicUser)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});


/* PATCH /api/admin/users/:id — modifie le rôle, le plan ou les crédits d'un utilisateur */
router.patch("/users/:id", async (req, res) => {
  const target = await findUserById(req.params.id);

  if (!target) {
    return res.status(404).json({ error: "Utilisateur introuvable" });
  }

  const { role, plan, credits } = req.body || {};

  if (role !== undefined) {
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }
    // Empêche un admin de se retirer lui-même ses propres droits par erreur
    // (évite de se retrouver bloqué hors du panneau admin).
    if (target.id === req.userId && role !== "admin") {
      return res.status(400).json({ error: "Tu ne peux pas retirer ton propre rôle admin" });
    }
    target.role = role;
  }

  if (plan !== undefined) target.plan = plan;
  if (credits !== undefined) target.credits = Math.max(0, Number(credits) || 0);

  await saveUser(target);
  res.json(publicUser(target));
});


/* GET /api/admin/projects — tous les projets, tous utilisateurs confondus */
router.get("/projects", async (req, res) => {
  const [projects, users] = await Promise.all([getProjects(), getUsers()]);
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const enriched = projects
    .map((p) => ({ ...p, userEmail: emailById.get(p.userId) || "?" }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json(enriched);
});


export default router;