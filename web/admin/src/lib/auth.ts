import { cookies } from 'next/headers';

const SESSION_COOKIE = 'pt_admin_session';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme';

export function isAuthenticated(): boolean {
  const store = cookies();
  const val = store.get(SESSION_COOKIE)?.value;
  return val === ADMIN_PASSWORD;
}

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { SESSION_COOKIE, ADMIN_PASSWORD };
