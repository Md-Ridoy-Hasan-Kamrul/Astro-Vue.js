/** End-to-end capabilities. Copy matches the reference; the card UI does not. */
export const CAPABILITY_COPY = {
	eyebrow: 'Capabilities',
	title: 'End-to-End Digital Capabilities',
	lede: 'From product thinking and experience design to development and launch, our specialists work together to move your digital product forward.',
	contactLabel: 'Contact us',
	contactHref: '/about#feedback',
	exploreLabel: 'Explore Now',
	exploreHref: '/about#services',
} as const;

const CAPABILITY_SOURCES = [
	{
		id: 'uiux',
		title: 'UI/UX Design',
		body: 'Turn user needs and business goals into clear digital experiences through research, UX strategy, interaction design, testing, and scalable UI systems.',
		image: '/products/1.png',
	},
	{
		id: 'brand',
		title: 'Brand Design',
		body: 'Build strategic brand identities that define how your business looks, communicates, and stays recognizable across every customer touchpoint.',
		image: '/products/8.png',
	},
	{
		id: 'web',
		title: 'Web Design & Development',
		body: 'Strategize, design, and develop websites that communicate your value clearly while supporting performance, usability, conversion, and growth.',
		image: '/products/21.png',
	},
	{
		id: 'saas',
		title: 'SaaS Design & Development',
		body: 'Turn complex SaaS ideas into scalable products with clear workflows, intuitive interfaces, and development built for long-term growth.',
		image: '/products/27.png',
	},
	{
		id: 'webflow',
		title: 'Webflow Design & Development',
		body: 'We design and build responsive Webflow websites with reusable systems that give growing teams greater control over content, performance, and scale.',
		image: '/products/36.png',
	},
	{
		id: 'mobile',
		title: 'Mobile App Design & Development',
		body: 'Design and develop mobile apps that connect user needs with business goals through seamless experiences, reliable performance, and scalable technology.',
		image: '/products/16.png',
	},
] as const;

const INDEX_DIGITS = 3;

export const CAPABILITIES = CAPABILITY_SOURCES.map((item, position) => ({
	...item,
	index: String(position + 1).padStart(INDEX_DIGITS, '0'),
}));

export type Capability = (typeof CAPABILITIES)[number];
