/** Feedback form field limits — no magic numbers in UI. */
export const FEEDBACK_NAME_MAX = 80;
export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 500;

export type FeedbackInput = {
	name: string;
	email: string;
	message: string;
};

export type FeedbackFieldErrors = Partial<Record<keyof FeedbackInput, string>>;

export type FeedbackValidationResult =
	| { ok: true; data: FeedbackInput }
	| { ok: false; errors: FeedbackFieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimFields(input: FeedbackInput): FeedbackInput {
	return {
		name: input.name.trim(),
		email: input.email.trim(),
		message: input.message.trim(),
	};
}

/** Pure validation for the about-page feedback form. */
export function validateFeedback(raw: FeedbackInput): FeedbackValidationResult {
	const data = trimFields(raw);
	const errors: FeedbackFieldErrors = {};

	if (!data.name) {
		errors.name = 'Name is required';
	} else if (data.name.length > FEEDBACK_NAME_MAX) {
		errors.name = `Name must be at most ${FEEDBACK_NAME_MAX} characters`;
	}

	if (!data.email) {
		errors.email = 'Email is required';
	} else if (!EMAIL_PATTERN.test(data.email)) {
		errors.email = 'Enter a valid email';
	}

	if (!data.message) {
		errors.message = 'Message is required';
	} else if (data.message.length < FEEDBACK_MESSAGE_MIN) {
		errors.message = `Message must be at least ${FEEDBACK_MESSAGE_MIN} characters`;
	} else if (data.message.length > FEEDBACK_MESSAGE_MAX) {
		errors.message = `Message must be at most ${FEEDBACK_MESSAGE_MAX} characters`;
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, data };
}
