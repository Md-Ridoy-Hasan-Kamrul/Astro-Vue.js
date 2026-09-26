import { describe, expect, it } from 'vitest';
import {
	FEEDBACK_MESSAGE_MAX,
	FEEDBACK_MESSAGE_MIN,
	FEEDBACK_NAME_MAX,
	validateFeedback,
} from './validateFeedback';

const valid = {
	name: 'Ada',
	email: 'ada@example.com',
	message: 'This stack is clear and fast enough.',
};

describe('validateFeedback', () => {
	it('accepts a trimmed valid payload', () => {
		const result = validateFeedback({
			name: '  Ada  ',
			email: '  ada@example.com ',
			message: `  ${valid.message}  `,
		});

		expect(result).toEqual({
			ok: true,
			data: {
				name: 'Ada',
				email: 'ada@example.com',
				message: valid.message,
			},
		});
	});

	it('requires name, email, and message', () => {
		const result = validateFeedback({ name: '', email: '', message: '' });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.name).toMatch(/required/i);
			expect(result.errors.email).toMatch(/required/i);
			expect(result.errors.message).toMatch(/required/i);
		}
	});

	it('rejects invalid email', () => {
		const result = validateFeedback({ ...valid, email: 'not-an-email' });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.email).toMatch(/valid email/i);
		}
	});

	it('rejects short or long messages and long names', () => {
		const short = validateFeedback({
			...valid,
			message: 'x'.repeat(FEEDBACK_MESSAGE_MIN - 1),
		});
		expect(short.ok).toBe(false);

		const long = validateFeedback({
			...valid,
			message: 'x'.repeat(FEEDBACK_MESSAGE_MAX + 1),
		});
		expect(long.ok).toBe(false);

		const longName = validateFeedback({
			...valid,
			name: 'n'.repeat(FEEDBACK_NAME_MAX + 1),
		});
		expect(longName.ok).toBe(false);
	});
});
