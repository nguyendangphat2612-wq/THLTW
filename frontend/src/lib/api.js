export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
export const AUTH_STATE_EVENT = "locphat-auth-state-changed";

function notifyAuthStateChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    localStorage.removeItem("auth_user");
    return null;
  }
}

export function setStoredToken(token, user = null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("auth_token", token);
    if (user) localStorage.setItem("auth_user", JSON.stringify(user));
    notifyAuthStateChanged();
    return;
  }

  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  notifyAuthStateChanged();
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  notifyAuthStateChanged();
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = Object.values(data.errors || {}).flat()[0];
    const error = new Error(validationMessage || data.message || "Request failed.");
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  return data;
}
