import { describe, expect, it } from 'vitest';
import { checkRateLimit } from './rateLimit';

describe('checkRateLimit', () => {
	it('allows requests under the limit and blocks after', () => {
		const key = `test-${Math.random()}`;
		const start = 1_000_000;

		for (let i = 0; i < 8; i += 1) {
			expect(checkRateLimit(key, start).ok).toBe(true);
		}

		const blocked = checkRateLimit(key, start);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.retryAfterSec).toBeGreaterThan(0);
		}
	});

	it('resets after the window', () => {
		const key = `test-reset-${Math.random()}`;
		const start = 2_000_000;

		for (let i = 0; i < 8; i += 1) {
			checkRateLimit(key, start);
		}
		expect(checkRateLimit(key, start).ok).toBe(false);
		expect(checkRateLimit(key, start + 60_001).ok).toBe(true);
	});
});
