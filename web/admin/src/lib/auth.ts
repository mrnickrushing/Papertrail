import { cookies } from 'next/headers';

const SESSION_COOKIE = 'pt_admin_session';

/**
 * Read ADMIN_PASSWORD at call-time rather than at module initialisation.
 *
 * Next.js evaluates module-level code during the build/bundle phase, before
 * runtime environment variables are injected. Reading the variable inside a
 * function guarantees we always get the live value from the process environment
 * when the function is actually invoked on the server.
 */
function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    console.warn(
      '[auth] ADMIN_PASSWORD environment variable is not set. ' +
        'Admin login is disabled until ADMIN_PASSWORD is set.'
    );
    return null;
  }
  return pw;
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const val = store.get(SESSION_COOKIE)?.value;
  const password = getAdminPassword();
  return Boolean(password && val === password);
}

export function verifyPassword(password: string): boolean {
  const configuredPassword = getAdminPassword();
  return Boolean(configuredPassword && password === configuredPassword);
}

export { SESSION_COOKIE };
