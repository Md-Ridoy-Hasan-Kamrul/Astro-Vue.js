import type { APIRoute } from 'astro';
import { handleFeedbackPayload } from '../../lib/feedback/handleFeedbackPayload';
import {
	checkRateLimit,
	clientKeyFromRequest,
} from '../../lib/feedback/rateLimit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const limit = checkRateLimit(clientKeyFromRequest(request));
	if (!limit.ok) {
		return Response.json(
			{ ok: false, message: 'Too many requests. Try again shortly.' },
			{
				status: 429,
				headers: { 'Retry-After': String(limit.retryAfterSec) },
			},
		);
	}

	let raw: unknown;

	try {
		raw = await request.json();
	} catch {
		return Response.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 });
	}

	const { status, body } = handleFeedbackPayload(raw);
	return Response.json(body, { status });
};
