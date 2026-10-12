// Récupère une photo Pexels représentative pour chaque modèle, avec un
// cache en mémoire pour ne pas ré-appeler l'API à chaque chargement du
// tableau de bord (Pexels limite le nombre de requêtes/heure).
const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

let cache = null; // { [templateId]: url | null }
let cacheExpiresAt = 0;

// Une requête de recherche par modèle, choisie pour représenter
// visuellement l'effet réellement appliqué (cohérent avec `preset` dans
// routes/templates.js) plutôt qu'une image décorative au hasard.
const QUERIES = {
  t1: "energetic social media intro colorful",
  t2: "glitch abstract digital effect",
  t3: "cinema film clapperboard",
  t4: "smartphone vertical video story",
};

async function fetchOne(query, apiKey) {
  const res = await fetch(
    `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.photos?.[0]?.src?.medium || null;
}

export async function getTemplateThumbnails(templateIds) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return {}; // pas de clé configurée -> le frontend retombe sur les icônes

  const now = Date.now();
  if (cache && now < cacheExpiresAt) return cache;

  const entries = await Promise.all(
    templateIds.map(async (id) => {
      const query = QUERIES[id];
      if (!query) return [id, null];
      try {
        return [id, await fetchOne(query, apiKey)];
      } catch (err) {
        console.error(`Pexels indisponible pour le modèle ${id}:`, err.message);
        return [id, null]; // le frontend retombe sur l'icône pour ce modèle précis
      }
    })
  );

  cache = Object.fromEntries(entries);
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cache;
}