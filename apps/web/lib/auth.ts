export const ACCESS_TOKEN_KEY = "asistencia.access_token";
export const REFRESH_TOKEN_KEY = "asistencia.refresh_token";
export const USER_KEY = "asistencia.user";

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
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);

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
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
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
