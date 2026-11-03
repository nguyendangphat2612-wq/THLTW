export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
export const AUTH_STATE_EVENT = "locphat-auth-state-changed";

const authStorageKeys = {
  customer: { token: "customer_auth_token", user: "customer_auth_user" },
  admin: { token: "admin_auth_token", user: "admin_auth_user" },
};

function currentAuthPortal() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return "admin";
  }

  return "customer";
}

function migrateLegacyAuth() {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    localStorage.removeItem("auth_user");
  }

  const portal = user?.role === "admin" ? "admin" : user?.role === "user" ? "customer" : null;
  if (portal) {
    const keys = authStorageKeys[portal];
    if (!localStorage.getItem(keys.token)) {
      localStorage.setItem(keys.token, token);
      if (user) localStorage.setItem(keys.user, JSON.stringify(user));
    }
  }

  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

function notifyAuthStateChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
}

export function getStoredToken(portal = currentAuthPortal()) {
  if (typeof window === "undefined") return null;
  migrateLegacyAuth();
  return localStorage.getItem(authStorageKeys[portal].token);
}

export function getStoredUser(portal = currentAuthPortal()) {
  if (typeof window === "undefined") return null;
  migrateLegacyAuth();

  try {
    return JSON.parse(localStorage.getItem(authStorageKeys[portal].user) || "null");
  } catch {
    localStorage.removeItem(authStorageKeys[portal].user);
    return null;
  }
}

export function setStoredToken(token, user = null, portal = user?.role === "admin" ? "admin" : "customer") {
  if (typeof window === "undefined") return;
  migrateLegacyAuth();
  const keys = authStorageKeys[portal];
  if (token) {
    localStorage.setItem(keys.token, token);
    if (user) localStorage.setItem(keys.user, JSON.stringify(user));
    notifyAuthStateChanged();
    return;
  }

  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.user);
  notifyAuthStateChanged();
}

export function clearStoredToken(portal = currentAuthPortal()) {
  if (typeof window === "undefined") return;
  const keys = authStorageKeys[portal];
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.user);
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
