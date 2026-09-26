import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearTtlCache, readTtlCache, writeTtlCache } from './ttlCache';

describe('ttlCache', () => {
	afterEach(() => {
		clearTtlCache();
		vi.useRealTimers();
	});

	it('returns a value before it expires', () => {
		writeTtlCache('repo', { name: 'astro' }, 5_000);
		expect(readTtlCache<{ name: string }>('repo')).toEqual({ name: 'astro' });
	});

	it('drops expired entries', () => {
		vi.useFakeTimers();
		writeTtlCache('repo', { name: 'astro' }, 1_000);
		vi.advanceTimersByTime(1_001);
		expect(readTtlCache('repo')).toBeUndefined();
	});
});
