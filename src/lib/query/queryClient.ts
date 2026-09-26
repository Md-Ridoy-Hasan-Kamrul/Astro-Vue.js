import { QueryClient } from '@tanstack/vue-query';
import { isRetryableQueryError } from '../api/axios';

export function createAppQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Fresh for 1 min → extra refetches (tab focus) skip the network.
				staleTime: 60_000,
				// Keep unused cache 5 min so back-navigation is instant.
				gcTime: 5 * 60_000,
				retry: (failureCount, error) =>
					isRetryableQueryError(error) && failureCount < 1,
				retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2_000),
				refetchOnWindowFocus: false,
				refetchOnReconnect: true,
				// Astro islands only run queries in the browser.
				enabled: typeof window !== 'undefined',
			},
			mutations: {
				retry: 0,
			},
		},
	});
}

/** Query keys — keep Axios calls behind these keys in components. */
export const queryKeys = {
	astroRepo: ['github', 'repo', 'withastro', 'astro'] as const,
	repo: (owner: string, name: string) => ['github', 'repo', owner, name] as const,
};
