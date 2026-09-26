import { describe, expect, it } from 'vitest';
import { createAppQueryClient, queryKeys } from './queryClient';
import {
	getCacheLabel,
	getListViewState,
	getMutationViewState,
	getQueryViewState,
} from './queryUi';

describe('createAppQueryClient', () => {
	it('keeps queries fresh for 1 minute and skips window-focus refetch', () => {
		const client = createAppQueryClient();
		const queries = client.getDefaultOptions().queries;

		expect(queries?.staleTime).toBe(60_000);
		expect(queries?.gcTime).toBe(5 * 60_000);
		expect(queries?.refetchOnWindowFocus).toBe(false);
		expect(queries?.refetchOnReconnect).toBe(true);
	});

	it('uses stable query keys for the GitHub demo', () => {
		expect(queryKeys.astroRepo).toEqual(['github', 'repo', 'withastro', 'astro']);
		expect(queryKeys.repo('withastro', 'astro')).toEqual(queryKeys.astroRepo);
	});
});

describe('getQueryViewState', () => {
	const base = {
		isPending: false,
		isError: false,
		isFetching: false,
		isStale: false,
		data: null as unknown,
		dataUpdatedAt: 0,
	};

	it('is loading on first fetch', () => {
		expect(getQueryViewState({ ...base, isPending: true, isFetching: true })).toBe('loading');
	});

	it('is a hard error when the run failed with no cache', () => {
		expect(getQueryViewState({ ...base, isError: true })).toBe('error');
	});

	it('keeps cached data visible while refetching', () => {
		expect(
			getQueryViewState({
				...base,
				isFetching: true,
				data: { full_name: 'withastro/astro' },
				dataUpdatedAt: Date.now(),
			}),
		).toBe('refetching');
	});

	it('is success when data is ready', () => {
		expect(
			getQueryViewState({
				...base,
				data: { full_name: 'withastro/astro' },
				dataUpdatedAt: Date.now(),
			}),
		).toBe('success');
	});
});

describe('getCacheLabel', () => {
	it('labels empty, fresh, and stale cache', () => {
		expect(getCacheLabel({ dataUpdatedAt: 0, isStale: false })).toBe('empty');
		expect(getCacheLabel({ dataUpdatedAt: Date.now(), isStale: false })).toBe('fresh');
		expect(getCacheLabel({ dataUpdatedAt: Date.now(), isStale: true })).toBe('stale');
	});
});

describe('getMutationViewState', () => {
	it('maps pending, error, success, and idle', () => {
		expect(
			getMutationViewState({ isPending: true, isError: false, isSuccess: false }),
		).toBe('loading');
		expect(
			getMutationViewState({ isPending: false, isError: true, isSuccess: false }),
		).toBe('error');
		expect(
			getMutationViewState({ isPending: false, isError: false, isSuccess: true }),
		).toBe('success');
		expect(
			getMutationViewState({ isPending: false, isError: false, isSuccess: false }),
		).toBe('idle');
	});
});

describe('getListViewState', () => {
	it('treats null, undefined, and [] as empty', () => {
		expect(getListViewState(null)).toBe('empty');
		expect(getListViewState(undefined)).toBe('empty');
		expect(getListViewState([])).toBe('empty');
		expect(getListViewState(['a'])).toBe('ready');
	});
});
