import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rootsync_pos_token";
const META_KEY = "rootsync_pos_meta";

export type PosSession = {
  token: string;
  email: string;
  displayName: string;
  connectAccountId: string;
  expiresAt: string;
  apiBaseUrl: string;
};

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
    return { ...parsed, token };
  } catch {
    return null;
  }
}

export async function clearPosSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(META_KEY);
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
