/** Specialists band. Copy matches the reference; the surface matches this site. */

export const SPECIALIST_COPY = {
	titleLead: 'Built by Specialists.',
	titleTail: 'Connected by One Goal.',
	paragraphs: [
		'Behind every project is a multidisciplinary team of strategists, researchers, designers, developers, and problem solvers working toward the same goal.',
		'Instead of handing work from one disconnected vendor to another, we bring the disciplines together. Decisions made during strategy inform design. Design works with technology. Development stays aligned with the product and business goals from the beginning.',
		'That is how we turn ideas into digital products that feel considered from every angle.',
	],
	actionLabel: 'More About Us',
	actionHref: '/about',
} as const;

export type SpecialistShot = {
	src: string;
	alt: string;
};

/** Photos and product stills already in this site. The strip loops these. */
export const SPECIALIST_SHOTS: readonly SpecialistShot[] = [
	{ src: '/partner/office.jpg', alt: 'Studio interior' },
	{ src: '/products/2.png', alt: 'Product work, Northwind Admin' },
	{ src: '/products/5.png', alt: 'Product work, sample five' },
	{ src: '/products/10.jpg', alt: 'Product work, sample ten' },
	{ src: '/products/15.png', alt: 'Product work, sample fifteen' },
	{ src: '/products/19.png', alt: 'Product work, sample nineteen' },
	{ src: '/products/28.png', alt: 'Product work, sample twenty-eight' },
	{ src: '/products/33.jpg', alt: 'Product work, sample thirty-three' },
	{ src: '/products/42.png', alt: 'Product work, sample forty-two' },
	{ src: '/products/46.png', alt: 'Product work, sample forty-six' },
];
