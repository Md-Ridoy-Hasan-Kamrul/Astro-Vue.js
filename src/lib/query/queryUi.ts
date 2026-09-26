/** UI states for a TanStack Query result — keep payload in Query, not Zustand. */
export type QueryViewState = 'loading' | 'refetching' | 'error' | 'success';

/** UI states for mutations (feedback, newsletter-style posts). */
export type MutationViewState = 'idle' | 'loading' | 'error' | 'success';

/** List / collection presentation when data is already resolved. */
export type ListViewState = 'empty' | 'ready';

export type QueryViewInput = {
	isPending: boolean;
	isError: boolean;
	isFetching: boolean;
	isStale: boolean;
	data: unknown;
	dataUpdatedAt: number;
};

export type MutationViewInput = {
	isPending: boolean;
	isError: boolean;
	isSuccess: boolean;
};

export function getQueryViewState(query: QueryViewInput): QueryViewState {
	if (query.isPending) {
		return 'loading';
	}

	if (query.isError && query.data == null) {
		return 'error';
	}

	if (query.isFetching) {
		return 'refetching';
	}

	return 'success';
}

export function getMutationViewState(mutation: MutationViewInput): MutationViewState {
	if (mutation.isPending) {
		return 'loading';
	}

	if (mutation.isError) {
		return 'error';
	}

	if (mutation.isSuccess) {
		return 'success';
	}

	return 'idle';
}

export function getListViewState(items: readonly unknown[] | null | undefined): ListViewState {
	if (!items || items.length === 0) {
		return 'empty';
	}

	return 'ready';
}

export function getCacheLabel(query: Pick<QueryViewInput, 'dataUpdatedAt' | 'isStale'>): string {
	if (!query.dataUpdatedAt) {
		return 'empty';
	}

	return query.isStale ? 'stale' : 'fresh';
}
