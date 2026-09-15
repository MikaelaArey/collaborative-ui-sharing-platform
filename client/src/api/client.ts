export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

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
