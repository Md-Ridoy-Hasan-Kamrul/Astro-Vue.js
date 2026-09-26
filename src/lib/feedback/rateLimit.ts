/** Simple per-IP sliding window — no Redis for this demo size. */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
	| { ok: true; remaining: number }
	| { ok: false; retryAfterSec: number };

function pruneExpired(now: number) {
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
}

/** Returns whether the client may proceed and how many hits remain in the window. */
export function checkRateLimit(clientKey: string, now = Date.now()): RateLimitResult {
	pruneExpired(now);

	const existing = buckets.get(clientKey);
	if (!existing || existing.resetAt <= now) {
		buckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
		return { ok: true, remaining: MAX_REQUESTS - 1 };
	}

	if (existing.count >= MAX_REQUESTS) {
		return {
			ok: false,
			retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
		};
	}

	existing.count += 1;
	return { ok: true, remaining: MAX_REQUESTS - existing.count };
}

export function clientKeyFromRequest(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0]?.trim() || 'unknown';
	}
	return request.headers.get('x-real-ip') || 'unknown';
}
