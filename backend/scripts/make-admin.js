// scripts/make-admin.js
//
// Usage :
//   node scripts/make-admin.js ton-email@exemple.com
//
// L'utilisateur doit déjà exister (inscrit normalement via /register) —
// ce script se contente de changer son rôle en "admin" en base.
// Il n'y a volontairement aucune route API publique pour faire ça :
// seul un accès direct au serveur/à la base doit permettre de créer un admin.

import "dotenv/config";
import { findUserByEmail, saveUser } from "../db.js";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/make-admin.js <email>");
  process.exit(1);
}

const user = await findUserByEmail(email);

if (!user) {
  console.error(
    `❌ Aucun utilisateur trouvé avec l'email "${email}". ` +
      `Il doit d'abord s'inscrire normalement via /register.`
  );
  process.exit(1);
}

if (user.role === "admin") {
  console.log(`ℹ️  ${email} est déjà admin.`);
  process.exit(0);
}

user.role = "admin";
await saveUser(user);

console.log(`✅ ${email} est maintenant admin.`);
process.exit(0);