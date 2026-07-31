import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rootsync_pos_token";
const META_KEY = "rootsync_pos_meta";

/** Stripe connection tokens are short-lived; reuse briefly to avoid double-fetch on init. */
const CONNECTION_TOKEN_TTL_MS = 45_000;

export type PosSession = {
  token: string;
  email: string;
  displayName: string;
  connectAccountId: string;
  expiresAt: string;
  apiBaseUrl: string;
};

type CachedConnectionToken = {
  secret: string;
  locationId?: string;
  fetchedAt: number;
};

let cachedConnectionToken: CachedConnectionToken | null = null;
let connectionTokenInFlight: Promise<CachedConnectionToken> | null = null;

export function peekCachedConnectionToken(): CachedConnectionToken | null {
  if (!cachedConnectionToken) return null;
  if (Date.now() - cachedConnectionToken.fetchedAt > CONNECTION_TOKEN_TTL_MS) {
    cachedConnectionToken = null;
    return null;
  }
  return cachedConnectionToken;
}

export function clearCachedConnectionToken() {
  cachedConnectionToken = null;
  connectionTokenInFlight = null;
}

export async function fetchConnectionToken(
  session: PosSession,
): Promise<CachedConnectionToken> {
  const fresh = peekCachedConnectionToken();
  if (fresh) return fresh;
  if (connectionTokenInFlight) return connectionTokenInFlight;

  connectionTokenInFlight = (async () => {
    const res = await apiFetch(session, "/api/vendor/pos/connection-token", {
      method: "POST",
    });
    const data = (await res.json().catch(() => ({}))) as {
      secret?: string;
      locationId?: string;
      error?: string;
    };
    if (res.status === 401) {
      await clearPosSession();
      clearCachedConnectionToken();
      throw new Error("Session expired. Sign out and sign in again.");
    }
    if (res.status === 429) {
      const retry = res.headers.get("Retry-After");
      throw new Error(
        data.error ||
          `Too many Terminal token requests. Try again in ${retry || "a few"} seconds.`,
      );
    }
    if (!res.ok || !data.secret) {
      throw new Error(
        data.error ||
          `Connection token failed (HTTP ${res.status}). Check vendor Connect + Terminal setup.`,
      );
    }
    const next: CachedConnectionToken = {
      secret: data.secret,
      locationId: data.locationId,
      fetchedAt: Date.now(),
    };
    cachedConnectionToken = next;
    return next;
  })();

  try {
    return await connectionTokenInFlight;
  } finally {
    connectionTokenInFlight = null;
  }
}

export async function savePosSession(session: PosSession) {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(META_KEY, JSON.stringify(session));
}

export async function loadPosSession(): Promise<PosSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const meta = await SecureStore.getItemAsync(META_KEY);
  if (!token || !meta) return null;
  try {
    const parsed = JSON.parse(meta) as PosSession;
    if (!parsed.apiBaseUrl || !parsed.token) return null;
    if (parsed.expiresAt) {
      const exp = Date.parse(parsed.expiresAt);
      if (Number.isFinite(exp) && exp <= Date.now()) {
        await clearPosSession();
        return null;
      }
    }
    return { ...parsed, token };
  } catch {
    return null;
  }
}

export async function clearPosSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(META_KEY);
  clearCachedConnectionToken();
}

export async function apiFetch(
  session: PosSession,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${session.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });
}
