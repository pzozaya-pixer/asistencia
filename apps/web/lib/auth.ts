export const ACCESS_TOKEN_KEY = "asistencia.access_token";
export const REFRESH_TOKEN_KEY = "asistencia.refresh_token";
export const USER_KEY = "asistencia.user";
const SESSION_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY] as const;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const memoryStorage = new Map<string, string>();

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
  actividadId?: string | null;
  dniNie: string;
  telefono?: string | null;
  nombre: string;
  apellidos: string;
  hasPhoto: boolean;
  actividad?: string | null;
  estadoActividad?: string | null;
  activities: Array<{
    id: string;
    codigo: string;
    nombre: string;
    estado: string;
    estadoInscripcion?: string | null;
  }>;
};

export type QrSessionResponse = {
  id: string;
  token: string;
  expiresAt: string;
  ttlSeconds: number;
  attendeeId: string;
  attendeeName: string;
  activityId: string;
  activityCode: string;
  activityName: string;
};

export type ResolvedQrSession = {
  sessionId: string;
  token: string;
  attendee: {
    id: string;
    nombre: string;
    apellidos: string;
    dniNie: string;
  };
  activity: {
    id: string;
    codigo: string;
    nombre: string;
  };
  expiresAt: string;
  status: "ready";
};

export type DashboardSummary = {
  activeActivity: {
    id: string;
    codigo: string;
    nombre: string;
    ubicacion?: string | null;
  } | null;
  metrics: Array<{
    label: string;
    value: string;
    hint: string;
    delta: string;
    tone: "success" | "warning" | "info";
  }>;
  alerts: Array<{
    title: string;
    description: string;
    tone: "success" | "warning" | "info";
    label: string;
  }>;
  recentAccess: Array<{
    id: string;
    name: string;
    time: string;
    accessPoint: string;
    mode: string;
  }>;
  validationQueue: Array<{
    id: string;
    activityId: string;
    name: string;
    reason: string;
  }>;
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
  for (const key of SESSION_KEYS) {
    removeStorageItem(key);
  }
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

export async function createAttendanceRecord(payload: {
  actividadId: string;
  asistenteId: string;
  metodoRegistro: "qr" | "manual";
  observaciones?: string;
  validacionVisual: boolean;
  firma: {
    dataUrl: string;
    width: number;
    height: number;
  };
}) {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch("/api/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as {
    id: string;
    actividadId: string;
    asistenteId: string;
    estado: string;
    metodoRegistro: string;
    fechaHora: string;
    observaciones?: string | null;
  };
}

export async function fetchDashboardSummary() {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch("/api/dashboard/summary", authorizedRequest(token));

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as DashboardSummary;
}

export async function downloadDashboardExport(format: "excel" | "pdf") {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch(`/api/dashboard/export/${format}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return response.blob();
}

export async function createQrSession(payload: {
  attendeeId: string;
  activityId: string;
  ttlSeconds?: number;
}) {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch("/api/qr-sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as QrSessionResponse;
}

export async function resolveQrSession(tokenValue: string) {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch("/api/qr-sessions/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    body: JSON.stringify({ token: tokenValue })
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as ResolvedQrSession;
}

export async function consumeQrAttendance(payload: {
  token: string;
  observaciones?: string;
  validacionVisual: boolean;
  firma: {
    dataUrl: string;
    width: number;
    height: number;
  };
}) {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("La sesión ha caducado.");
  }

  const response = await fetch("/api/attendance/qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as {
    id: string;
    actividadId: string;
    asistenteId: string;
    estado: string;
    metodoRegistro: string;
    fechaHora: string;
    observaciones?: string | null;
  };
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
    return memoryStorage.get(key) ?? null;
  }

  const cookieValue = getCookieValue(key);

  if (cookieValue !== null) {
    memoryStorage.set(key, cookieValue);
    return cookieValue;
  }

  const localValue = safeLocalStorageGet(key);

  if (localValue !== null) {
    memoryStorage.set(key, localValue);
    return localValue;
  }

  return memoryStorage.get(key) ?? null;
}

function setStorageItem(key: string, value: string) {
  memoryStorage.set(key, value);

  if (typeof window === "undefined") {
    return;
  }

  safeLocalStorageSet(key, value);
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function removeStorageItem(key: string) {
  memoryStorage.delete(key);

  if (typeof window === "undefined") {
    return;
  }

  safeLocalStorageRemove(key);
  document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; samesite=lax`;
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
  const encodedKey = encodeURIComponent(key);

  for (const cookie of cookies) {
    const [cookieKey, ...rest] = cookie.split("=");

    if (cookieKey === encodedKey) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }

  return null;
}
