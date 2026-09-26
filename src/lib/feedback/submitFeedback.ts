import axios from 'axios';
import type { FeedbackInput } from './validateFeedback';
import type { FeedbackResponse } from './handleFeedbackPayload';

/** Post feedback to the same-origin Astro API (not the GitHub Axios client). */
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResponse> {
	const { data } = await axios.post<FeedbackResponse>('/api/feedback', input, {
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		validateStatus: () => true,
	});

	return data;
}
