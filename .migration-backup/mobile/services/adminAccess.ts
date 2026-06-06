const ADMIN_BYPASS_CODE = (process.env.EXPO_PUBLIC_ADMIN_BYPASS_CODE ?? '').trim();
const ADMIN_EMAIL = (process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase();
const ADMIN_NAME = (process.env.EXPO_PUBLIC_ADMIN_NAME ?? '').trim();

export function isAdminBypassConfigured(): boolean {
  return ADMIN_BYPASS_CODE.length > 0;
}

export function validateAdminBypassCode(input: string): boolean {
  return isAdminBypassConfigured() && input.trim() === ADMIN_BYPASS_CODE;
}

export function getAdminProfileDefaults(): { fullName: string; email: string | null } {
  return {
    fullName: ADMIN_NAME || 'Owner',
    email: ADMIN_EMAIL || null,
  };
}
