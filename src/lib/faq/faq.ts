/** FAQ copy. Questions live in JSON; the surface matches this site. */
import data from './faq.json';

export const FAQ_COPY = {
	title: data.title,
	searchPlaceholder: data.searchPlaceholder,
	emptyTitle: data.emptyTitle,
	emptyDescription: data.emptyDescription,
} as const;

export type FaqItem = {
	id: string;
	question: string;
	answer: string[];
};

export const FAQ_ITEMS: readonly FaqItem[] = data.items;
