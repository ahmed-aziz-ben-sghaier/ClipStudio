// scripts/reset-password.js
//
// Usage :
//   node scripts/reset-password.js ton-email@exemple.com nouveauMotDePasse
//
// Réinitialise directement le mot de passe d'un compte existant en base,
// sans passer par un email de récupération (utile en dev, ou si tu es
// bloqué hors de ton propre compte admin).

import "dotenv/config";
import bcrypt from "bcryptjs";
import { findUserByEmail, saveUser } from "../db.js";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.js <email> <nouveau_mot_de_passe>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("❌ Le mot de passe doit faire au moins 6 caractères.");
  process.exit(1);
}

const user = await findUserByEmail(email);

if (!user) {
  console.error(`❌ Aucun utilisateur trouvé avec l'email "${email}".`);
  process.exit(1);
}

user.passwordHash = await bcrypt.hash(newPassword, 10);
await saveUser(user);

console.log(`✅ Mot de passe de ${email} réinitialisé avec succès.`);
process.exit(0);