import type { FeedbackInput } from './validateFeedback';
import { validateFeedback } from './validateFeedback';

export type FeedbackSuccess = {
	ok: true;
	id: string;
	receivedAt: string;
};

export type FeedbackFailure = {
	ok: false;
	errors?: ReturnType<typeof validateFeedback> extends { ok: false; errors: infer E }
		? E
		: never;
	message?: string;
};

export type FeedbackResponse = FeedbackSuccess | FeedbackFailure;

/** Shared handler body for the feedback API (easy to unit test). */
export function handleFeedbackPayload(raw: unknown): {
	status: number;
	body: FeedbackResponse;
} {
	if (!raw || typeof raw !== 'object') {
		return {
			status: 400,
			body: { ok: false, message: 'Expected a JSON object' },
		};
	}

	const input = raw as Partial<FeedbackInput>;
	const result = validateFeedback({
		name: typeof input.name === 'string' ? input.name : '',
		email: typeof input.email === 'string' ? input.email : '',
		message: typeof input.message === 'string' ? input.message : '',
	});

	if (!result.ok) {
		return { status: 400, body: { ok: false, errors: result.errors } };
	}

	return {
		status: 201,
		body: {
			ok: true,
			id: `fb_${result.data.email}`,
			receivedAt: new Date().toISOString(),
		},
	};
}
