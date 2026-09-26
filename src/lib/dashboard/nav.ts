/** Shared Crextio dashboard navigation. */
export const DASHBOARD_NAV = [
	{ id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
	{ id: 'people', label: 'People', href: '/dashboard/people' },
	{ id: 'hiring', label: 'Hiring', href: '/dashboard/hiring' },
	{ id: 'devices', label: 'Devices', href: '/dashboard/devices' },
	{ id: 'apps', label: 'Apps', href: '/dashboard/apps' },
	{ id: 'salary', label: 'Salary', href: '/dashboard/salary' },
	{ id: 'calendar', label: 'Calendar', href: '/dashboard/calendar' },
	{ id: 'reviews', label: 'Reviews', href: '/dashboard/reviews' },
] as const;

export type DashboardNavId = (typeof DASHBOARD_NAV)[number]['id'];
