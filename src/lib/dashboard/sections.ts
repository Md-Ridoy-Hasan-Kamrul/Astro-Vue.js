import type { DashboardNavId } from './nav';

export type DashboardStat = { value: string; label: string };
export type DashboardRow = {
	title: string;
	meta: string;
	badge?: string;
	tone?: 'dark' | 'yellow' | 'soft';
};

export type DashboardSectionContent = {
	id: Exclude<DashboardNavId, 'dashboard'>;
	index: string;
	title: string;
	subtitle: string;
	stats: DashboardStat[];
	rows: DashboardRow[];
};

export const DASHBOARD_SECTIONS: Record<
	Exclude<DashboardNavId, 'dashboard'>,
	DashboardSectionContent
> = {
	people: {
		id: 'people',
		index: '01',
		title: 'People',
		subtitle: 'Directory of active teammates across design, product, and ops.',
		stats: [
			{ value: '78', label: 'Employees' },
			{ value: '12', label: 'Teams' },
			{ value: '6', label: 'Open roles' },
		],
		rows: [
			{ title: 'Lora Piterson', meta: 'UX/UI Designer · Product', badge: 'Active', tone: 'yellow' },
			{ title: 'Marcus Chen', meta: 'Engineering · Platform', badge: 'Active', tone: 'dark' },
			{ title: 'Amina Okonkwo', meta: 'People Ops · HR', badge: 'PTO', tone: 'soft' },
			{ title: 'Jonas Reed', meta: 'Product · Growth', badge: 'Active', tone: 'dark' },
			{ title: 'Sofia Alvarez', meta: 'Design · Systems', badge: 'Remote', tone: 'yellow' },
		],
	},
	hiring: {
		id: 'hiring',
		index: '02',
		title: 'Hiring',
		subtitle: 'Pipeline of openings, interviews, and offers this week.',
		stats: [
			{ value: '56', label: 'Hirings' },
			{ value: '18', label: 'Interviews' },
			{ value: '4', label: 'Offers' },
		],
		rows: [
			{ title: 'Senior Frontend Engineer', meta: 'Round 2 · Tomorrow 10:00', badge: '15%', tone: 'dark' },
			{ title: 'Product Designer', meta: 'Portfolio review · Fri', badge: 'Hired', tone: 'yellow' },
			{ title: 'People Partner', meta: 'Screening · Mon', badge: 'New', tone: 'soft' },
			{ title: 'Backend Engineer', meta: 'Take-home · Due Wed', badge: '60%', tone: 'dark' },
		],
	},
	devices: {
		id: 'devices',
		index: '03',
		title: 'Devices',
		subtitle: 'Hardware assigned to the team — laptops, phones, and peripherals.',
		stats: [
			{ value: '64', label: 'Assigned' },
			{ value: '9', label: 'In stock' },
			{ value: '3', label: 'Repair' },
		],
		rows: [
			{ title: 'MacBook Air · M1', meta: 'Lora Piterson · Serial A2141', badge: 'Active', tone: 'yellow' },
			{ title: 'MacBook Pro · M3', meta: 'Marcus Chen · Serial A2991', badge: 'Active', tone: 'dark' },
			{ title: 'iPhone 15', meta: 'Amina Okonkwo · MDM enrolled', badge: 'Loan', tone: 'soft' },
			{ title: 'Dell XPS 15', meta: 'Jonas Reed · Windows 11', badge: 'Active', tone: 'dark' },
		],
	},
	apps: {
		id: 'apps',
		index: '04',
		title: 'Apps',
		subtitle: 'SaaS seats and access across the Crextio workspace.',
		stats: [
			{ value: '24', label: 'Apps' },
			{ value: '112', label: 'Seats' },
			{ value: '3', label: 'Pending' },
		],
		rows: [
			{ title: 'Figma', meta: 'Design · 18 seats', badge: 'Connected', tone: 'yellow' },
			{ title: 'GitHub', meta: 'Engineering · Org access', badge: 'Connected', tone: 'dark' },
			{ title: 'Notion', meta: 'Company wiki · All hands', badge: 'Connected', tone: 'dark' },
			{ title: 'Linear', meta: 'Product · Trial ends Oct', badge: 'Trial', tone: 'soft' },
		],
	},
	salary: {
		id: 'salary',
		index: '05',
		title: 'Salary',
		subtitle: 'Compensation overview for the current pay cycle.',
		stats: [
			{ value: '$184k', label: 'Payroll' },
			{ value: '12', label: 'Raises' },
			{ value: '2', label: 'Pending' },
		],
		rows: [
			{ title: 'September cycle', meta: 'Processed · 78 employees', badge: 'Paid', tone: 'yellow' },
			{ title: 'Bonus pool Q3', meta: 'Design + Eng · Reviewing', badge: 'Open', tone: 'dark' },
			{ title: 'Contractor invoices', meta: '4 pending approvals', badge: 'Due', tone: 'soft' },
			{ title: 'Equity refresh', meta: 'Annual grant window', badge: 'Draft', tone: 'dark' },
		],
	},
	calendar: {
		id: 'calendar',
		index: '06',
		title: 'Calendar',
		subtitle: 'Week of Mon 22 – Sat 27 · September 2024',
		stats: [
			{ value: '14', label: 'Events' },
			{ value: '3', label: 'Today' },
			{ value: '2', label: 'Conflicts' },
		],
		rows: [
			{ title: 'Weekly Team Sync', meta: 'Mon · 8:30 – 9:30', badge: 'Office', tone: 'dark' },
			{ title: 'Onboarding Session', meta: 'Mon · 10:30 – 11:30', badge: 'Hybrid', tone: 'yellow' },
			{ title: 'Design critique', meta: 'Wed · 2:00 – 3:00', badge: 'Remote', tone: 'soft' },
			{ title: 'Hiring panel', meta: 'Fri · 11:00 – 12:00', badge: 'Office', tone: 'dark' },
		],
	},
	reviews: {
		id: 'reviews',
		index: '07',
		title: 'Reviews',
		subtitle: 'Performance cycles, peer feedback, and manager check-ins.',
		stats: [
			{ value: '31', label: 'Open' },
			{ value: '19', label: 'Done' },
			{ value: '8', label: 'Overdue' },
		],
		rows: [
			{ title: 'Q3 self review', meta: 'Due Fri · Lora Piterson', badge: 'Due', tone: 'yellow' },
			{ title: 'Manager 1:1 notes', meta: 'Marcus · Completed', badge: 'Done', tone: 'dark' },
			{ title: 'Peer feedback pack', meta: 'Design team · 4/6', badge: '60%', tone: 'soft' },
			{ title: 'Promotion packet', meta: 'Jonas Reed · Draft', badge: 'Draft', tone: 'dark' },
		],
	},
};
