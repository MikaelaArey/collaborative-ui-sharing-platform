// In dev, the client (Vite, :5173) and server (:4000) are different origins, so default to
// localhost:4000. In a production build served BY the server itself (see server/src/index.ts),
// default to the same origin the page was loaded from instead — no deploy URL needs to be baked
// in at build time. VITE_API_URL/VITE_WS_URL, if set, always win (e.g. a split-origin deployment).
const sameOriginApi = typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";
const sameOriginWs =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
    : "ws://localhost:4000";

export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : sameOriginApi);
export const WS_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.DEV ? "ws://localhost:4000" : sameOriginWs);

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  joinCode: string;
  isLocked: boolean;
  isEnded: boolean;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  register(email: string, password: string, displayName: string) {
    return request<{ token: string; user: ApiUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
  },
  login(email: string, password: string) {
    return request<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  createRoom(token: string, name: string, defaultRole?: "EDITOR" | "VIEWER") {
    return request<{ room: RoomSummary }>(
      "/rooms",
      { method: "POST", body: JSON.stringify({ name, defaultRole }) },
      token
    );
  },
  myRooms(token: string) {
    return request<{ rooms: RoomSummary[] }>("/rooms/mine", {}, token);
  },
  lookupRoom(joinCode: string) {
    return request<RoomSummary>(`/rooms/${joinCode}`);
  },
};
