export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type HealthResponse = { ok: boolean; service: string; time: string; integrations: Record<string, boolean> };
export type ConfigResponse = { apiVersion: number; features: Record<string, boolean>; integrations: Record<string, boolean> };
export type SyncPullResponse = { syncVersion: number; documents: unknown[]; folders: unknown[]; tombstones: unknown[]; serverTime: string };
export type ShareLinkSummary = { token: string; documentId: string; title: string; expiresAt: string; passwordProtected: boolean; createdAt: string; url: string; expired: boolean };
export type AnalyticsEvent = { id: string; event: string; deviceId?: string; userId?: string; properties?: Record<string, string | number | boolean>; createdAt: string };
export type UserRecord = { id: string; fullName: string; email: string; provider: string; isPro: boolean; createdAt: string };
export type NotificationRecord = { id: string; title: string; body: string; sentAt: string; recipientCount: number; filter?: unknown };

export const getHealth = () => apiFetch<HealthResponse>('/health');
export const getConfig = () => apiFetch<ConfigResponse>('/v1/config');
export const getSyncStats = () => apiFetch<SyncPullResponse>('/v1/sync/pull', { method: 'POST', body: JSON.stringify({ deviceId: 'admin-dashboard', sinceVersion: 0 }) });
export const getShareLinks = () => apiFetch<{ shareLinks: ShareLinkSummary[] }>('/v1/share-links');
export const getAnalytics = () => apiFetch<{ events: AnalyticsEvent[] }>('/v1/analytics/events');
export const getUsers = () => apiFetch<{ users: UserRecord[] }>('/v1/admin/users');
export const getNotifications = () => apiFetch<{ notifications: NotificationRecord[] }>('/v1/notifications');
export const broadcastNotification = (title: string, body: string, filter?: { isPro?: boolean }) =>
  apiFetch<{ ok: boolean; recipientCount: number; notificationId: string }>('/v1/notifications/broadcast', { method: 'POST', body: JSON.stringify({ title, body, filter }) });
