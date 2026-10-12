// scripts/migrate-json-to-pg.js
//
// À lancer UNE FOIS après avoir configuré DATABASE_URL et remplacé db.js :
//     node scripts/migrate-json-to-pg.js
//
// Lit l'ancien data/db.json et recrée chaque utilisateur/projet dans
// PostgreSQL via les mêmes fonctions saveUser/saveProject que le reste de
// l'app utilise déjà — aucune logique dupliquée.

import fs from "fs";
import path from "path";
import { saveUser, saveProject } from "../db.js";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("Aucun data/db.json trouvé — rien à migrer.");
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const users = Array.isArray(raw.users) ? raw.users : [];
  const projects = Array.isArray(raw.projects) ? raw.projects : [];

  console.log(`→ ${users.length} utilisateur(s) et ${projects.length} projet(s) à migrer…`);

  for (const user of users) {
    await saveUser(user);
    console.log(`  ✓ utilisateur migré : ${user.email || user.id}`);
  }

  for (const project of projects) {
    await saveProject(project);
    console.log(`  ✓ projet migré : ${project.id}`);
  }

  console.log(`\n✅ Migration terminée : ${users.length} utilisateur(s), ${projects.length} projet(s).`);
  console.log("   Vérifie que tout est bien présent avant de supprimer data/db.json.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur pendant la migration :", err);
  process.exit(1);
});