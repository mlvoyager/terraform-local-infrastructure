const baseURL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const backendTarget = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${baseURL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`API Flask inaccessible à ${backendTarget}. Démarrez le backend et vérifiez sa connexion à PostgreSQL.`);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token && !path.startsWith("/auth/login")) {
      localStorage.removeItem("access_token");
      window.dispatchEvent(new CustomEvent("taskflow:session-expired"));
    }
    const message = response.status === 502
      ? `Vite ne joint pas l’API Flask (${backendTarget}). Démarrez le backend et vérifiez sa connexion à PostgreSQL.`
      : data?.error || "Une erreur est survenue. Réessayez.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export default api;
