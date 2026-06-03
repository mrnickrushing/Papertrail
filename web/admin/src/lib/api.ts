const headers = () => {
  const key = process.env.BACKEND_API_KEY ?? '';
  if (!key) {
    console.warn('[api] BACKEND_API_KEY is not set — requests will be rejected with 401');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.BACKEND_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type HealthResponse = {
  ok: boolean;
  service: string;
  time: string;
  integrations: Record<string, boolean>;
};

export type ConfigResponse = {
  apiVersion: number;
  features: Record<string, boolean>;
  integrations: Record<string, boolean>;
};

export type SyncPullResponse = {
  syncVersion: number;
  documents: unknown[];
  folders: unknown[];
  tombstones: unknown[];
  serverTime: string;
};

export type ShareLink = {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  event: string;
  deviceId?: string;
  userId?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
};

export async function getHealth() {
  return apiFetch<HealthResponse>('/health');
}

export async function getConfig() {
  return apiFetch<ConfigResponse>('/v1/config');
}

export async function getSyncStats() {
  return apiFetch<SyncPullResponse>('/v1/sync/pull', {
    method: 'POST',
    body: JSON.stringify({ sinceVersion: 0 }),
  });
}

export async function broadcastNotification(title: string, body: string, filter?: { isPro?: boolean }) {
  return apiFetch<{ ok: boolean; recipientCount: number; notificationId: string }>(
    '/v1/notifications/broadcast',
    { method: 'POST', body: JSON.stringify({ title, body, filter }) },
  );
}
