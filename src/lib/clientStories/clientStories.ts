/** Client stories. Copy matches the reference; the surface matches this site. */

export const CLIENT_STORY_COPY = {
	titleLead: "What It's Like to Build With",
	titleTail: 'Musemind? Hear from Our Clients',
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

export const CLIENT_STORIES: readonly ClientStory[] = [
	{
		id: 'arrive',
		brand: 'Arrive',
		brandMark: 'ARRIVE',
		mark: 'display',
		quote:
			"They brought our app redesign to life beyond expectations! We're thrilled with the results and truly loved collaborating with their incredibly talented team.",
		name: 'Robin Fish',
		role: 'Founder & CEO, Arrive',
		location: 'New York, USA',
		image: '/partner/office.jpg',
		imageAlt: 'Studio interior',
	},
	{
		id: 'trainmate',
		brand: 'Trainmate',
		brandMark: 'TRAINMATE',
		mark: 'mono',
		quote:
			'As a founder, finding the right team for Trainmate was a challenge until we discovered Musemind. They quickly onboarded, worked within our budget, and delivered high-quality designs at an impressive pace.',
		name: 'George El Nachar',
		role: 'Founder, Trainmate',
		location: 'Dubai, United Arab Emirates',
		image: '/partner/avatar.jpg',
		imageAlt: 'Studio portrait',
	},
];
