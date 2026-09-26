type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();

/** In-memory TTL cache for server-side API responses (not Redis — one Node process). */
export function readTtlCache<T>(key: string): T | undefined {
	const entry = memory.get(key) as CacheEntry<T> | undefined;
	if (!entry) {
		return undefined;
	}

	if (Date.now() >= entry.expiresAt) {
		memory.delete(key);
		return undefined;
	}

	return entry.value;
}

export function writeTtlCache<T>(key: string, value: T, ttlMs: number): void {
	memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearTtlCache(): void {
	memory.clear();
}
