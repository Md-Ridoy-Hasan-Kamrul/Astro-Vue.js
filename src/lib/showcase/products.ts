export type Product = {
	id: string;
	src: string;
	num: string;
	title: string;
	kicker: string;
	note: string;
	tags: readonly string[];
};

const FILES = [
	'1.png',
	'2.png',
	'3.jpg',
	'4.png',
	'5.png',
	'6.png',
	'7.png',
	'8.png',
	'9.png',
	'10.jpg',
	'11.png',
	'12.png',
	'13.png',
	'14.png',
	'15.png',
	'16.png',
	'17.png',
	'18.png',
	'19.png',
	'20.png',
	'21.png',
	'22.png',
	'23.png',
	'24.png',
	'25.png',
	'26.png',
	'27.png',
	'28.png',
	'29.png',
	'30.png',
	'31.png',
	'32.png',
	'33.jpg',
	'34.png',
	'35.jpg',
	'36.png',
	'37.png',
	'38.png',
	'39.png',
	'40.png',
	'41.png',
	'42.png',
	'43.png',
	'44.png',
	'45.png',
	'46.png',
	'47.png',
] as const;

const BRIEFS: readonly { title: string; kicker: string; note: string; tags: readonly string[] }[] = [
	{
		title: 'Control Ledger',
		kicker: 'SaaS dashboard · MERN',
		note: 'An operations console for live KPIs, case review, and agent prompts. MongoDB holds the records, Express serves the API, and React renders the working surface.',
		tags: ['React.js', 'Node.js', 'MongoDB', 'REST APIs'],
	},
	{
		title: 'Northwind Admin',
		kicker: 'Admin dashboard · PERN',
		note: 'Staff tools for orders, roles, and daily reporting. PostgreSQL and Prisma sit behind a React admin shell with TanStack Query on the client.',
		tags: ['PostgreSQL', 'Prisma ORM', 'TanStack Query', 'TypeScript'],
	},
	{
		title: 'Harbor Checkout',
		kicker: 'E-commerce · MERN',
		note: 'A storefront with catalog filters, a cart, and a checkout that talks to Stripe-style order records stored in MongoDB.',
		tags: ['React.js', 'Node.js', 'MongoDB', 'Tailwind CSS'],
	},
	{
		title: 'Fieldnote CRM',
		kicker: 'SaaS · Vue',
		note: 'Pipeline, notes, and follow-ups in a Vue app. Axios hits a REST API, and Zustand keeps the open deal in sync across the board.',
		tags: ['Vue.js', 'Axios', 'Zustand', 'REST APIs'],
	},
	{
		title: 'Atlas Landing',
		kicker: 'Marketing site · Astro',
		note: 'A content-first landing page with islands only where the page needs interaction. Static HTML stays fast, and Lenis smooths the long scroll.',
		tags: ['Astro', 'TypeScript', 'Lenis', 'Tailwind CSS'],
	},
	{
		title: 'Pulse Analytics',
		kicker: 'Dashboard · Next.js',
		note: 'Charts, filters, and saved views for a product team. Next.js renders the shell and TanStack Query refreshes the series without a full reload.',
		tags: ['Next.js', 'TypeScript', 'TanStack Query', 'Lighthouse'],
	},
	{
		title: 'Lumen Studio',
		kicker: 'Portfolio landing · Svelte',
		note: 'A studio site with a project grid and a case-study modal. Svelte keeps the motion light, and the layout holds from a phone up to a laptop.',
		tags: ['Svelte', 'CSS3', 'Responsive Design', 'GSAP'],
	},
	{
		title: 'Parcel Desk',
		kicker: 'E-commerce admin · PERN',
		note: 'Inventory, shipments, and refunds for a small shop. PostgreSQL stores the catalog and a React table handles the day-to-day edits.',
		tags: ['React.js', 'PostgreSQL', 'Node.js', 'Postman'],
	},
	{
		title: 'Kinetic Hire',
		kicker: 'SaaS landing · Vue',
		note: 'A hiring product page with pricing, a demo reel, and a short onboarding form. Vue runs the interactive bits on top of a static layout.',
		tags: ['Vue.js', 'Tailwind CSS', 'Framer', 'SEO'],
	},
	{
		title: 'Clinic Board',
		kicker: 'Dashboard · MERN',
		note: 'Appointments, notes, and a patient list for a clinic front desk. MongoDB stores the visits and React keeps the board current.',
		tags: ['React.js', 'MongoDB', 'Express', 'Accessibility'],
	},
	{
		title: 'Orbit Billing',
		kicker: 'SaaS · PERN',
		note: 'Plans, invoices, and usage meters. PostgreSQL is the ledger, and the React billing screens stay in sync through a REST API.',
		tags: ['PostgreSQL', 'React.js', 'Node.js', 'REST APIs'],
	},
	{
		title: 'Market Row',
		kicker: 'E-commerce · Next.js',
		note: 'A multi-vendor shop with product cards, search, and a persistent cart. Next.js serves the pages and Cloudinary holds the product images.',
		tags: ['Next.js', 'Cloudinary', 'Tailwind CSS', 'TypeScript'],
	},
	{
		title: 'Signal Ops',
		kicker: 'Internal dashboard · Astro',
		note: 'A status wall for deploys and uptime. Astro ships the page, and a Vue island polls the incident feed.',
		tags: ['Astro', 'Vue.js', 'Vite', 'CI/CD'],
	},
	{
		title: 'Paperlane',
		kicker: 'Landing page · Svelte',
		note: 'A long-form product story with pinned sections and a quiet scroll. Svelte and Lenis carry the motion without a heavy runtime.',
		tags: ['Svelte', 'Lenis', 'HTML5', 'CSS3'],
	},
	{
		title: 'Roster',
		kicker: 'People dashboard · Vue',
		note: 'Teams, roles, and time off in one Vue screen. TanStack Query loads the directory and Context API shares the signed-in manager.',
		tags: ['Vue.js', 'TanStack Query', 'Context API', 'TypeScript'],
	},
	{
		title: 'Grove Goods',
		kicker: 'E-commerce · MERN',
		note: 'A catalog with variants, wishlists, and order history. The API is Node and the storefront is a responsive React layout.',
		tags: ['React.js', 'Node.js', 'MongoDB', 'Responsive Design'],
	},
	{
		title: 'Launchpad',
		kicker: 'SaaS marketing · Astro',
		note: 'Feature sections, a pricing table, and a newsletter form. Astro keeps the markup static and the form island hydrates on its own.',
		tags: ['Astro', 'Tailwind CSS', 'SendGrid', 'SEO'],
	},
	{
		title: 'Warehouse',
		kicker: 'Admin dashboard · PERN',
		note: 'Stock levels, bins, and purchase orders. PostgreSQL models the inventory and React tables filter it without losing the page.',
		tags: ['PostgreSQL', 'Prisma ORM', 'React.js', 'Postman'],
	},
	{
		title: 'Nightshift',
		kicker: 'Landing page · Next.js',
		note: 'A dark product launch page with a video hero and a feature grid. Next.js and Tailwind hold the layout from 320px upward.',
		tags: ['Next.js', 'Tailwind CSS', 'Framer', 'Responsive Design'],
	},
	{
		title: 'Ticketline',
		kicker: 'Support SaaS · MERN',
		note: 'Queues, assignees, and reply threads. MongoDB stores the tickets and a React board is the agent’s home screen.',
		tags: ['React.js', 'MongoDB', 'Node.js', 'Axios'],
	},
	{
		title: 'Campus',
		kicker: 'Learning dashboard · Vue',
		note: 'Courses, progress, and assignments for a small academy. Vue renders the student home and a REST API serves the syllabus.',
		tags: ['Vue.js', 'REST APIs', 'TypeScript', 'Vitest'],
	},
	{
		title: 'Storefront Kit',
		kicker: 'E-commerce · Svelte',
		note: 'A lean shop template: product page, cart drawer, and checkout steps. Svelte keeps the bundle small on a mobile connection.',
		tags: ['Svelte', 'JavaScript', 'CSS3', 'Lighthouse'],
	},
	{
		title: 'Relay',
		kicker: 'SaaS dashboard · PERN',
		note: 'Webhooks, API keys, and delivery logs. PostgreSQL records every event and the React log viewer filters by status.',
		tags: ['PostgreSQL', 'Node.js', 'React.js', 'Docker'],
	},
	{
		title: 'Brightpath',
		kicker: 'Agency landing · Astro',
		note: 'Case studies, services, and a contact path. Astro builds the pages and a short GSAP sequence marks the hero.',
		tags: ['Astro', 'GSAP', 'Figma', 'SEO'],
	},
	{
		title: 'Invoice Nest',
		kicker: 'Finance dashboard · MERN',
		note: 'Drafts, sent invoices, and payment status. MongoDB stores the documents and React forms cover the line items.',
		tags: ['React.js', 'MongoDB', 'Node.js', 'Tailwind CSS'],
	},
	{
		title: 'Waypoint',
		kicker: 'Travel landing · Vue',
		note: 'Destinations, a search field, and trip cards. Vue handles the filter and the page stays readable on a narrow screen.',
		tags: ['Vue.js', 'Responsive Design', 'CSS3', 'Accessibility'],
	},
	{
		title: 'Foundry',
		kicker: 'Analytics SaaS · Next.js',
		note: 'Funnels, retention, and cohort tables for a product team. Next.js serves the app and charts update from a REST feed.',
		tags: ['Next.js', 'TypeScript', 'REST APIs', 'Zustand'],
	},
	{
		title: 'Pantry',
		kicker: 'E-commerce · PERN',
		note: 'Grocery aisles, substitutions, and a recurring order. PostgreSQL holds the catalog and React builds the basket.',
		tags: ['PostgreSQL', 'React.js', 'Node.js', 'Tailwind CSS'],
	},
	{
		title: 'Helio Desk',
		kicker: 'Help center · Astro',
		note: 'Articles, search, and a contact panel. Astro ships the docs as static pages so the help center stays quick.',
		tags: ['Astro', 'HTML5', 'SEO', 'Tailwind CSS'],
	},
	{
		title: 'Crew',
		kicker: 'HR dashboard · Vue',
		note: 'Headcount, leave, and review cycles. Vue screens talk to a Node API and TanStack Query caches the org chart.',
		tags: ['Vue.js', 'Node.js', 'TanStack Query', 'MySQL'],
	},
	{
		title: 'Kindred',
		kicker: 'Community landing · Svelte',
		note: 'A membership page with stories, pricing, and a join form. Svelte runs the form and Mailgun takes the signup.',
		tags: ['Svelte', 'Mailgun', 'Responsive Design', 'CSS3'],
	},
	{
		title: 'Ledgerline',
		kicker: 'Finance SaaS · MERN',
		note: 'Accounts, transfers, and a monthly close checklist. MongoDB stores the entries and React keeps the totals on screen.',
		tags: ['React.js', 'MongoDB', 'Node.js', 'Jest'],
	},
	{
		title: 'BioSync',
		kicker: 'Health SaaS · Next.js',
		note: 'Risk markers, scan summaries, and a patient-facing dashboard. Next.js renders the product and the marketing page beside it.',
		tags: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Accessibility'],
	},
	{
		title: 'Dock',
		kicker: 'Logistics dashboard · PERN',
		note: 'Arrivals, docks, and carrier slots. PostgreSQL models the yard and a React board is what the shift lead watches.',
		tags: ['PostgreSQL', 'React.js', 'Prisma ORM', 'Docker'],
	},
	{
		title: 'Amber Market',
		kicker: 'E-commerce landing · Astro',
		note: 'A campaign page for a seasonal drop: hero, product row, and a waitlist. Astro builds it and the form posts to a small API.',
		tags: ['Astro', 'Tailwind CSS', 'SendGrid', 'Vite'],
	},
	{
		title: 'Studio Hours',
		kicker: 'Booking dashboard · Vue',
		note: 'Rooms, sessions, and a weekly calendar. Vue renders the grid and a REST API stores the bookings.',
		tags: ['Vue.js', 'REST APIs', 'TypeScript', 'CSS3'],
	},
	{
		title: 'Nimbus',
		kicker: 'Cloud status · Svelte',
		note: 'Region health, incident history, and a subscribe toggle. Svelte updates the board and Firebase holds the subscriber list.',
		tags: ['Svelte', 'Firebase', 'TypeScript', 'Lighthouse'],
	},
	{
		title: 'Quarterly',
		kicker: 'Reporting SaaS · MERN',
		note: 'Goals, owners, and a review packet. MongoDB stores the objectives and React assembles the quarterly view.',
		tags: ['React.js', 'MongoDB', 'Node.js', 'Redux'],
	},
	{
		title: 'Terrace',
		kicker: 'Real-estate landing · Next.js',
		note: 'Listings, a map-free card grid, and an inquiry form. Next.js and Tailwind carry the page, with images on Cloudinary.',
		tags: ['Next.js', 'Cloudinary', 'Tailwind CSS', 'SEO'],
	},
	{
		title: 'Grow Desk',
		kicker: 'Sales SaaS · PERN',
		note: 'Pipeline value, content performance, and a product card the team can demo. PostgreSQL stores the accounts and React renders the pitch screen.',
		tags: ['PostgreSQL', 'React.js', 'Node.js', 'TanStack Query'],
	},
	{
		title: 'Apron',
		kicker: 'Restaurant admin · Vue',
		note: 'Menus, covers, and the evening’s tickets. Vue runs the pass and MySQL keeps the orders.',
		tags: ['Vue.js', 'MySQL', 'Node.js', 'Axios'],
	},
	{
		title: 'Kit',
		kicker: 'Component landing · Astro',
		note: 'A design-system page that shows buttons, type, and layout rules. Astro documents the pieces and the examples stay static.',
		tags: ['Astro', 'Figma', 'CSS3', 'Component-Based Architecture'],
	},
	{
		title: 'Courier',
		kicker: 'Delivery dashboard · MERN',
		note: 'Drops, drivers, and proof of delivery. MongoDB stores the route and React shows what is still out.',
		tags: ['React.js', 'MongoDB', 'Node.js', 'REST APIs'],
	},
	{
		title: 'Folio',
		kicker: 'Portfolio · Svelte',
		note: 'Selected work, a short about, and a contact line. Svelte and a simple CSS layout keep the page quiet.',
		tags: ['Svelte', 'HTML5', 'CSS3', 'Responsive Design'],
	},
	{
		title: 'Audit Trail',
		kicker: 'Compliance SaaS · PERN',
		note: 'Who changed what, and when. PostgreSQL keeps the log and a React timeline is the reviewer’s screen.',
		tags: ['PostgreSQL', 'React.js', 'Node.js', 'Playwright'],
	},
	{
		title: 'Hearth',
		kicker: 'Hospitality landing · Vue',
		note: 'Rooms, a stay picker, and a reservation note. Vue handles the dates and the rest of the page is straightforward markup.',
		tags: ['Vue.js', 'Tailwind CSS', 'Responsive Design', 'SEO'],
	},
	{
		title: 'Flowform',
		kicker: 'Architecture studio · Astro',
		note: 'A studio site for selected houses, client notes, and an upcoming concept. Astro builds the long page and the project cards stay light.',
		tags: ['Astro', 'TypeScript', 'Tailwind CSS', 'Lenis'],
	},
];

function fileNumber(file: string): number {
	return Number(file.replace(/\D/g, ''));
}

export const productCatalog: readonly Product[] = FILES.map((file, index) => {
	const brief = BRIEFS[index]!;
	const number = fileNumber(file);
	return {
		id: String(number),
		src: `/products/${file}`,
		num: String(number).padStart(2, '0'),
		title: brief.title,
		kicker: brief.kicker,
		note: brief.note,
		tags: brief.tags,
	};
});

/** The circle keeps the same card count and shows the newest files. */
export const sphereProducts: readonly Product[] = [...productCatalog]
	.sort((a, b) => Number(a.id) - Number(b.id))
	.slice(-21);
