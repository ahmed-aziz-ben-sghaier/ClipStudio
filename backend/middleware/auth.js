import jwt from "jsonwebtoken";
import { findUserById } from "../db.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

// À utiliser TOUJOURS après requireAuth (a besoin de req.userId déjà résolu).
// Le rôle est vérifié en base à chaque requête, jamais lu depuis le payload
// du JWT : si un admin est rétrogradé, ses tokens déjà émis perdent
// immédiatement l'accès, au lieu de rester valides jusqu'à expiration (7j).
export async function requireAdmin(req, res, next) {
  try {
    const user = await findUserById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Erreur de vérification des droits" });
  }
}