import { describe, expect, it } from 'vitest';
import { handleFeedbackPayload } from './handleFeedbackPayload';

describe('handleFeedbackPayload', () => {
	it('returns 201 for valid input', () => {
		const { status, body } = handleFeedbackPayload({
			name: 'Ada',
			email: 'ada@example.com',
			message: 'Learning Astro routing with a real form.',
		});

		expect(status).toBe(201);
		expect(body.ok).toBe(true);
		if (body.ok) {
			expect(body.id).toContain('ada@example.com');
			expect(body.receivedAt).toBeTruthy();
		}
	});

	it('returns 400 with field errors for invalid input', () => {
		const { status, body } = handleFeedbackPayload({
			name: '',
			email: 'bad',
			message: 'short',
		});

		expect(status).toBe(400);
		expect(body.ok).toBe(false);
		if (!body.ok) {
			expect(body.errors?.email).toBeTruthy();
			expect(body.errors?.message).toBeTruthy();
		}
	});

	it('returns 400 for non-object bodies', () => {
		const { status, body } = handleFeedbackPayload(null);
		expect(status).toBe(400);
		expect(body.ok).toBe(false);
	});
});
