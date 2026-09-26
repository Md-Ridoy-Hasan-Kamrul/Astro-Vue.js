import axios, { AxiosError, type AxiosInstance } from 'axios';
import { httpStore } from '../../stores/httpStore';

const DEFAULT_BASE_URL = 'https://api.github.com';

/**
 * Shared Axios client.
 * - Reads auth token from Zustand
 * - Tracks in-flight requests + last error in Zustand
 * - Used by TanStack Query `queryFn` on the client and server islands on the server
 */
export const api: AxiosInstance = axios.create({
	baseURL: import.meta.env.PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL,
	timeout: 15_000,
	headers: {
		Accept: 'application/vnd.github+json',
		'Content-Type': 'application/json',
	},
});

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

api.interceptors.request.use((config) => {
	const { authToken } = httpStore.getState();

	if (isBrowser()) {
		const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
		httpStore.getState().beginRequest(url);
	}

	if (authToken) {
		config.headers.Authorization = `Bearer ${authToken}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => {
		if (isBrowser()) {
			httpStore.getState().endRequest();
		}
		return response;
	},
	(error: unknown) => {
		if (isBrowser()) {
			httpStore.getState().endRequest();
			// Aborts are normal when Query cancels an in-flight request — not a UI error.
			if (!isCanceledRequest(error)) {
				httpStore.getState().setLastError(getAxiosErrorMessage(error));
			}
		}
		return Promise.reject(error);
	},
);

export function isCanceledRequest(error: unknown): boolean {
	return (
		axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')
	);
}

/** Retry network / 5xx. Do not retry cancels or 4xx (bad request, 404, auth). */
export function isRetryableQueryError(error: unknown): boolean {
	if (isCanceledRequest(error)) {
		return false;
	}

	if (axios.isAxiosError(error)) {
		const status = error.response?.status;
		if (status && status >= 400 && status < 500) {
			return false;
		}
	}

	return true;
}

export function getAxiosErrorMessage(error: unknown): string {
	if (isCanceledRequest(error)) {
		return 'Request canceled';
	}

	if (axios.isAxiosError(error)) {
		const axiosError = error as AxiosError<{ message?: string }>;
		return (
			axiosError.response?.data?.message ??
			axiosError.message ??
			`HTTP ${axiosError.response?.status ?? 'error'}`
		);
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown network error';
}
