import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { findUserByEmail, findUserById, saveUser } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const FREE_CREDITS_ON_SIGNUP = 3;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Email et mot de passe (6 caractères min.) requis" });
  }

  // PostgreSQL => il faut await
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({ error: "Cet email est déjà utilisé" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: nanoid(),
    email,
    passwordHash,
    credits: FREE_CREDITS_ON_SIGNUP,
    plan: "free",
    // Tous les nouveaux comptes sont "user" par défaut. Le tout premier
    // admin doit être promu via scripts/make-admin.js (voir ce fichier) —
    // il n'existe volontairement aucune route publique pour devenir admin.
    role: "user",
    stripeCustomerId: null,
    createdAt: new Date().toISOString(),
  };

  // PostgreSQL => il faut await
  await saveUser(user);

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: publicUser(user),
  });
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // PostgreSQL => il faut await
  const user = await findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: "Identifiants invalides",
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({
      error: "Identifiants invalides",
    });
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: publicUser(user),
  });
});


router.get("/me", requireAuth, async (req, res) => {

  // PostgreSQL => il faut await
  const user = await findUserById(req.userId);

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable",
    });
  }

  res.json({
    user: publicUser(user),
  });
});


export default router;