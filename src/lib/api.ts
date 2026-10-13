import type { LoginResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** DRF returns `{ style_no: ["This field must be unique."] }`. */
  fieldError(field: string): string | undefined {
    if (typeof this.body !== "object" || this.body === null) return undefined;
    const value = (this.body as Record<string, unknown>)[field];
    if (Array.isArray(value)) return String(value[0]);
    if (typeof value === "string") return value;
    return undefined;
  }

  get detail(): string {
    return this.fieldError("detail") ?? this.message;
  }

  /** The first thing the API said, for when no field on screen can show it. */
  get summary(): string {
    if (typeof this.body === "object" && this.body !== null) {
      for (const key of ["detail", "non_field_errors", ...Object.keys(this.body)]) {
        const message = this.fieldError(key);
        if (message) return message;
      }
    }
    return this.message;
  }
}

/* ── Tokens ───────────────────────────────────────────────────────── */

interface Tokens {
  access: string;
  refresh: string;
}

const TOKENS_KEY = "dkc.auth";

// Storage throws when it is disabled or full; the tab then keeps its tokens
// in memory and stays signed in until it closes.
let unstored: Tokens | null = null;
const listeners = new Set<() => void>();

function readTokens(): Tokens | null {
  try {
    const raw = window.localStorage.getItem(TOKENS_KEY);
    const tokens = raw ? (JSON.parse(raw) as Partial<Tokens>) : null;
    return tokens?.access && tokens.refresh
      ? { access: tokens.access, refresh: tokens.refresh }
      : null;
  } catch {
    return unstored;
  }
}

function writeTokens(tokens: Tokens | null) {
  unstored = tokens;
  try {
    if (tokens) window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else window.localStorage.removeItem(TOKENS_KEY);
  } catch {
    // Already held in memory above.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Signing out in one tab signs out the others.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

let leaving = false;

/** A full page load, so nothing of the previous session survives in memory. */
function goToLogin(next?: string) {
  if (leaving || typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  leaving = true;
  window.location.replace(
    next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login",
  );
}

function endSession() {
  writeTokens(null);
  goToLogin(window.location.pathname + window.location.search);
}

let refreshing: Promise<string | null> | null = null;

/**
 * The refresh token rotates and a used one is rejected, so concurrent 401s
 * must all wait on a single refresh: the shared promise covers this tab, the
 * lock covers the others.
 */
function refreshAccess(stale: string | null): Promise<string | null> {
  refreshing ??= withLock(() => rotate(stale)).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function withLock(
  task: () => Promise<string | null>,
): Promise<string | null> {
  // Web Locks exist only on https and localhost.
  if (typeof navigator === "undefined" || !navigator.locks) return task();
  return await navigator.locks.request("dkc.auth.refresh", task);
}

async function rotate(stale: string | null): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens) return null;
  // Another tab, or an earlier 401 in this one, has already refreshed.
  if (tokens.access !== stale) return tokens.access;

  const response = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (response.status >= 400 && response.status < 500) return null;
  // A server fault is no reason to sign anybody out.
  if (!response.ok) throw await failure(response, "POST", "/auth/refresh/");

  const fresh = (await response.json()) as Partial<Tokens>;
  if (!fresh.access) return null;
  writeTokens({ access: fresh.access, refresh: fresh.refresh ?? tokens.refresh });
  return fresh.access;
}

/* ── Requests ─────────────────────────────────────────────────────── */

const UNSIGNED = ["/auth/login/", "/auth/refresh/"];

/** A function `body` is called at send time, so a retry sees what the refresh changed. */
function init(method: string, body: unknown, access: string | null): RequestInit {
  const value = typeof body === "function" ? body() : body;
  const isFormData = value instanceof FormData;
  const headers: Record<string, string> = {};
  if (access) headers.Authorization = `Bearer ${access}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  return {
    method,
    headers,
    body: isFormData ? value : value === undefined ? undefined : JSON.stringify(value),
  };
}

/** Retries once after a refresh; a second 401 is a real answer. */
async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  // A stale token on the login call would be rejected before the password is read.
  const unsigned = UNSIGNED.includes(path);
  const sent = unsigned ? null : (readTokens()?.access ?? null);
  const response = await fetch(url, init(method, body, sent));
  if (response.status !== 401 || unsigned) return response;

  const access = await refreshAccess(sent);
  if (!access) {
    endSession();
    return response;
  }
  return fetch(url, init(method, body, access));
}

async function failure(response: Response, method: string, path: string) {
  const text = await response.text();
  return new ApiError(
    response.status,
    text ? safeJsonParse(text) : null,
    `${method} ${path} failed with ${response.status}`,
  );
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body);

  if (response.status === 204) return undefined as T;
  if (!response.ok) throw await failure(response, method, path);

  const text = await response.text();
  return (text ? safeJsonParse(text) : null) as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Drops empty values so `?search=&status=` never reaches the API. */
export function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const string = search.toString();
  return string ? `?${string}` : "";
}

/**
 * Fetch a file and hand it to the browser's downloader. Goes through the
 * same wrapper as everything else so a rejected download still reports its
 * error rather than opening a tab of JSON.
 */
async function download(path: string, filename: string): Promise<void> {
  const response = await send("GET", path);
  if (!response.ok) throw await failure(response, "GET", path);

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  download,
};

/** Everything that touches the tokens, so no component has to. */
export const session = {
  /** Tokens are stored — not that they still work. */
  active: () => readTokens() !== null,
  subscribe,
  goToLogin,

  async login(username: string, password: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>("POST", "/auth/login/", {
      username,
      password,
    });
    writeTokens({ access: result.access, refresh: result.refresh });
    return result;
  },

  /** Signed out here whatever the server answers, then off to the login page. */
  async logout(): Promise<void> {
    try {
      // Read at send time: after a refresh the old token is already dead.
      await request<void>("POST", "/auth/logout/", () => ({
        refresh: readTokens()?.refresh,
      }));
    } finally {
      writeTokens(null);
      // In the same tick, before the guard can react and send a `next` along.
      goToLogin();
    }
  },
};

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
