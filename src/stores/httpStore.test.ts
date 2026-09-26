import { beforeEach, describe, expect, it } from 'vitest';
import { httpStore } from '../stores/httpStore';

describe('httpStore (Axios ↔ Zustand)', () => {
	beforeEach(() => {
		httpStore.getState().clearHttpStatus();
		httpStore.getState().setAuthToken(null);
	});

	it('tracks pending requests', () => {
		httpStore.getState().beginRequest('/repos/withastro/astro');
		expect(httpStore.getState().pendingRequests).toBe(1);
		expect(httpStore.getState().lastRequestUrl).toContain('withastro');

		httpStore.getState().endRequest();
		expect(httpStore.getState().pendingRequests).toBe(0);
	});

	it('stores last error message', () => {
		httpStore.getState().setLastError('Network Error');
		expect(httpStore.getState().lastError).toBe('Network Error');
	});

	it('keeps auth token for Axios interceptor', () => {
		httpStore.getState().setAuthToken('demo-token');
		expect(httpStore.getState().authToken).toBe('demo-token');
	});
});

describe('Axios error helpers', () => {
	it('reads Axios error message', async () => {
		const { getAxiosErrorMessage } = await import('../lib/api/axios');
		const axios = (await import('axios')).default;

		const error = new axios.AxiosError('Request failed');
		expect(getAxiosErrorMessage(error)).toBe('Request failed');
		expect(getAxiosErrorMessage(new Error('boom'))).toBe('boom');
		expect(getAxiosErrorMessage('nope')).toBe('Unknown network error');
	});

	it('does not treat canceled requests as retryable UI errors', async () => {
		const { isCanceledRequest, isRetryableQueryError, getAxiosErrorMessage } =
			await import('../lib/api/axios');
		const axios = (await import('axios')).default;

		const canceled = new axios.AxiosError('canceled', 'ERR_CANCELED');
		expect(isCanceledRequest(canceled)).toBe(true);
		expect(isRetryableQueryError(canceled)).toBe(false);
		expect(getAxiosErrorMessage(canceled)).toBe('Request canceled');
	});

	it('does not retry 4xx responses', async () => {
		const { isRetryableQueryError } = await import('../lib/api/axios');
		const axios = (await import('axios')).default;

		const notFound = new axios.AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
			status: 404,
			statusText: 'Not Found',
			headers: {},
			config: {} as never,
			data: { message: 'Not Found' },
		});

		expect(isRetryableQueryError(notFound)).toBe(false);
		expect(isRetryableQueryError(new Error('timeout'))).toBe(true);
	});
});
