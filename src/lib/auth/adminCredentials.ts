/** Permanent demo admin — prefilled on /login for one-click dashboard access. */
export const ADMIN_EMAIL = 'admin@crextio.com';
export const ADMIN_PASSWORD = 'admin123';
export const ADMIN_DISPLAY_NAME = 'Nixtio';
export const DASHBOARD_PATH = '/dashboard';

export function isAdminCredentials(email: string, password: string): boolean {
	return email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
