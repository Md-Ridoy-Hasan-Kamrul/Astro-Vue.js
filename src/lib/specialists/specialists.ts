/** Specialists band. Copy matches the reference; the surface matches this site. */

export const SPECIALIST_COPY = {
	titleLead: 'Built by Specialists.',
	titleTail: 'Connected by One Goal.',
	paragraphs: [
		'Behind every project is a multidisciplinary team of strategists, researchers, designers, developers, and problem solvers working toward the same goal.',
		'Instead of handing work from one disconnected vendor to another, we bring the disciplines together. Decisions made during strategy inform design. Design works with technology. Development stays aligned with the product and business goals from the beginning.',
		'That is how we turn ideas into digital products that feel considered from every angle.',
	],
	actionLabel: 'Contact Us',
	actionHref: '/contact',
} as const;

export type SpecialistShot = {
	src: string;
	alt: string;
	title: string;
	caption: string;
};

/** Photos and product stills already in this site. The strip loops these. */
export const SPECIALIST_SHOTS: readonly SpecialistShot[] = [
	{ src: '/partner/office.jpg', alt: 'Studio interior', title: 'Studio', caption: 'Where the team works' },
	{ src: '/products/2.png', alt: 'Product work, Northwind Admin', title: 'Northwind', caption: 'Admin for daily work' },
	{ src: '/products/5.png', alt: 'Product work, sample five', title: 'Product', caption: 'Shaped with the team' },
	{ src: '/products/10.jpg', alt: 'Product work, sample ten', title: 'Interface', caption: 'Clear from the start' },
	{ src: '/products/15.png', alt: 'Product work, sample fifteen', title: 'Experience', caption: 'Built around people' },
	{ src: '/products/19.png', alt: 'Product work, sample nineteen', title: 'Brand', caption: 'Recognizable at a glance' },
	{ src: '/products/28.png', alt: 'Product work, sample twenty-eight', title: 'Platform', caption: 'Ready to grow' },
	{ src: '/products/33.jpg', alt: 'Product work, sample thirty-three', title: 'Launch', caption: 'From idea to product' },
	{ src: '/products/42.png', alt: 'Product work, sample forty-two', title: 'System', caption: 'Designed to last' },
	{ src: '/products/46.png', alt: 'Product work, sample forty-six', title: 'Detail', caption: 'Considered in every part' },
];
