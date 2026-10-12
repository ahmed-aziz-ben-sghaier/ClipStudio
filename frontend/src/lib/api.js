const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", body, token } = {}) {
  const isFormData = body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Pour un FormData, il ne faut PAS fixer Content-Type nous-mêmes :
    // le navigateur doit le faire lui-même pour inclure le "boundary"
    // multipart, sinon le serveur ne peut pas parser le fichier.
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Une erreur est survenue");
  }
  return data;
}

export const api = {
  register: (email, password) =>
    request("/api/auth/register", { method: "POST", body: { email, password } }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/api/auth/me", { token }),
  createCheckoutSession: (priceId, token) =>
    request("/api/stripe/create-checkout-session", {
      method: "POST",
      body: { priceId },
      token,
    }),
  createPortalSession: (token) =>
    request("/api/stripe/create-portal-session", { method: "POST", token }),
  consumeCredit: (token) =>
    request("/api/consume-credit", { method: "POST", token }),

  listProjects: (token, { trashed = false } = {}) =>
    request(`/api/projects?trashed=${trashed}`, { token }),
  // data peut être un objet JSON (projet vide) OU un FormData (fichier vidéo
  // + métadonnées) — request() gère les deux automatiquement.
  createProject: (data, token) =>
    request("/api/projects", { method: "POST", body: data, token }),
  updateProject: (id, data, token) =>
    request(`/api/projects/${id}`, { method: "PATCH", body: data, token }),
  deleteProject: (id, token) =>
    request(`/api/projects/${id}`, { method: "DELETE", token }),
  restoreProject: (id, token) =>
    request(`/api/projects/${id}/restore`, { method: "POST", token }),

  listTemplates: (token) => request("/api/templates", { token }),

  generateAiVideo: (token, payload) =>
    request("/api/ai/generate", { method: "POST", body: payload, token }),
  getAiGenerationStatus: (token, jobId) =>
    request(`/api/ai/status/${jobId}`, { token }),

  // ---- Admin (nécessite un compte avec role === "admin") ----
  adminGetStats: (token) => request("/api/admin/stats", { token }),
  adminListUsers: (token) => request("/api/admin/users", { token }),
  adminUpdateUser: (id, data, token) =>
    request(`/api/admin/users/${id}`, { method: "PATCH", body: data, token }),
  adminListProjects: (token) => request("/api/admin/projects", { token }),
};