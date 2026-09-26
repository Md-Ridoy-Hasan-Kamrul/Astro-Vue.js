import { ADMIN_DISPLAY_NAME, ADMIN_EMAIL } from './adminCredentials';

const SESSION_KEY = 'crextio-admin-session';

export type AdminSession = {
	email: string;
	displayName: string;
	signedInAt: number;
};

export function saveAdminSession(): AdminSession {
	const session: AdminSession = {
		email: ADMIN_EMAIL,
		displayName: ADMIN_DISPLAY_NAME,
		signedInAt: Date.now(),
	};
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
	}
	return session;
}

export function readAdminSession(): AdminSession | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AdminSession;
	} catch {
		return null;
	}
}

export function clearAdminSession() {
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(SESSION_KEY);
	}
}
