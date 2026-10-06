/** FAQ copy. Questions live in JSON. */
import data from './faq.json';

export const FAQ_COPY = {
	title: data.title,
	searchPlaceholder: data.searchPlaceholder,
	emptyMessage: data.emptyMessage,
} as const;

export type FaqItem = {
	id: string;
	question: string;
	answer: string[];
	image: string;
};

export const FAQ_ITEMS: readonly FaqItem[] = data.items;
