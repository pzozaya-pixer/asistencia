export const ACCESS_TOKEN_KEY = "asistencia.access_token";
export const REFRESH_TOKEN_KEY = "asistencia.refresh_token";
export const USER_KEY = "asistencia.user";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "super_admin" | "responsable" | "operador_lectura";
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type AttendeeLookupResult = {
  id: string;
  dniNie: string;
  telefono?: string | null;
  nombre: string;
  apellidos: string;
  actividad?: string | null;
};

export function getStoredAccessToken() {
  return getStorageItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return getStorageItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = getStorageItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    clearSession();
    return null;
  }
}

export function storeSession(session: LoginResponse) {
  setStorageItem(ACCESS_TOKEN_KEY, session.accessToken);
  setStorageItem(REFRESH_TOKEN_KEY, session.refreshToken);
  setStorageItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  removeStorageItem(ACCESS_TOKEN_KEY);
  removeStorageItem(REFRESH_TOKEN_KEY);
  removeStorageItem(USER_KEY);
}

export async function loginWithPassword(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as LoginResponse;
}

export async function fetchSessionUser(token: string) {
  const response = await fetch("/api/auth/me", authorizedRequest(token));

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as SessionUser;
}

export async function searchAttendees(query: string) {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const url = new URL("/api/attendees", window.location.origin);

  if (query.trim()) {
    url.searchParams.set("q", query.trim());
  }

  const response = await fetch(url, authorizedRequest(token));

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as AttendeeLookupResult[];
}

function authorizedRequest(token: string): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  };
}

async function extractErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = payload.message;

    if (Array.isArray(message)) {
      return message.join(". ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {}

  return "No se pudo completar la solicitud.";
}

function getStorageItem(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const localValue = safeLocalStorageGet(key);

  if (localValue) {
    return localValue;
  }

  return getCookieValue(key);
}

function setStorageItem(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  safeLocalStorageSet(key, value);
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function removeStorageItem(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  safeLocalStorageRemove(key);
  document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
}

function safeLocalStorageGet(key: string) {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {}
}

function safeLocalStorageRemove(key: string) {
  try {
    window.localStorage?.removeItem(key);
  } catch {}
}

function getCookieValue(key: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    const [cookieKey, ...rest] = cookie.split("=");

    if (cookieKey === key) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
