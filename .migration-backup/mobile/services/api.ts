declare const process: { env?: Record<string, string | undefined> } | undefined;

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
};

export type BackendConfig = {
  apiVersion: number;
  features: Record<string, boolean>;
  integrations: Record<string, boolean>;
};

const PRODUCTION_API_URL = 'https://papertrail-production-de23.up.railway.app';

export function getApiBaseUrl(): string {
  const raw = process?.env?.EXPO_PUBLIC_API_URL?.trim();
  return (raw || PRODUCTION_API_URL).replace(/\/$/, '');
}

function getApiKey(): string | null {
  const raw = process?.env?.EXPO_PUBLIC_API_KEY?.trim();
  return raw || null;
}

export function isBackendConfigured(): boolean {
  return true;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('Backend API is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  try {
    const apiKey = getApiKey();
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : typeof data === 'string' && data.trim()
          ? data
          : `Backend request failed (${res.status})`;
      throw new Error(message);
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBackendConfig(): Promise<BackendConfig | null> {
  if (!isBackendConfigured()) return null;
  return apiRequest<BackendConfig>('/v1/config');
}
