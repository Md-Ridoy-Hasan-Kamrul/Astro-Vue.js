import { createStore } from 'zustand/vanilla';

/**
 * Client-only HTTP / session UI state.
 * Server data stays in TanStack Query — do not mirror API payloads here.
 */
export type HttpState = {
	authToken: string | null;
	pendingRequests: number;
	lastError: string | null;
	lastRequestUrl: string | null;
	setAuthToken: (token: string | null) => void;
	beginRequest: (url: string) => void;
	endRequest: () => void;
	setLastError: (message: string | null) => void;
	clearHttpStatus: () => void;
};

export const httpStore = createStore<HttpState>((set) => ({
	authToken: null,
	pendingRequests: 0,
	lastError: null,
	lastRequestUrl: null,
	setAuthToken: (token) => set({ authToken: token }),
	beginRequest: (url) =>
		set((state) => ({
			pendingRequests: state.pendingRequests + 1,
			lastRequestUrl: url,
			lastError: null,
		})),
	endRequest: () =>
		set((state) => ({
			pendingRequests: Math.max(0, state.pendingRequests - 1),
		})),
	setLastError: (message) => set({ lastError: message }),
	clearHttpStatus: () =>
		set({
			pendingRequests: 0,
			lastError: null,
			lastRequestUrl: null,
		}),
}));
