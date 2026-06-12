import { apiRequest, isBackendConfigured } from './api';

export { hashPassword, verifyPassword } from './hashUtils';

export async function registerUserWithBackend(params: {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'apple';
  appleUserId?: string;
}): Promise<{ ok: boolean; userId?: string; storageAccessToken?: string; fullName?: string; email?: string; provider?: 'email' | 'apple'; appleUserId?: string; createdAt?: string; isPro?: boolean }> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    const result = await apiRequest<{ ok: boolean; userId: string; storageAccessToken?: string; fullName?: string; email?: string; provider?: 'email' | 'apple'; appleUserId?: string; createdAt?: string; isPro?: boolean }>('/v1/auth/register', {
      method: 'POST',
      body: params,
    });
    return result;
  } catch {
    return { ok: false };
  }
}

export async function loginUserWithBackend(params: {
  email: string;
  passwordHash: string;
}): Promise<{ ok: boolean; userId?: string; storageAccessToken?: string; fullName?: string; email?: string; provider?: 'email' | 'apple'; appleUserId?: string; createdAt?: string; isPro?: boolean }> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    const result = await apiRequest<{ ok: boolean; userId: string; storageAccessToken?: string; fullName?: string; email?: string; provider?: 'email' | 'apple'; appleUserId?: string; createdAt?: string; isPro?: boolean }>('/v1/auth/login', {
      method: 'POST',
      body: params,
    });
    return result;
  } catch {
    return { ok: false };
  }
}
