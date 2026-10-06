/** Client stories. Copy lives in JSON; the surface matches this site. */
import data from './clientStories.json';

export const CLIENT_STORY_COPY = {
	titleLead: data.titleLead,
	titleTail: data.titleTail,
} as const;

export type ClientStory = {
	id: string;
	brand: string;
	brandMark: string;
	mark: 'display' | 'mono';
	quote: string;
	name: string;
	role: string;
	location: string;
	image: string;
	imageAlt: string;
};

export const CLIENT_STORIES: readonly ClientStory[] = data.stories;
