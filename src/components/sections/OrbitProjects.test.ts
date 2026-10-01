import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import OrbitProjects from './OrbitProjects.astro';
import { ORBIT_ITEMS } from '../../lib/orbit/orbitProjects';

async function render() {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(OrbitProjects);
}

describe('Orbit projects section', () => {
	test('renders the compact grid with the Framer copy', async () => {
		const html = await render();
		expect(html).toContain('id="orbit-projects"');
		expect(html).toContain('data-orbit-compact');
		expect(html).toContain('>MOTION</span>');
		expect(html).toContain('>DESIGN IN</span>');
		expect(html).toContain('Exploring ideas through daily design practice.');
	});

	test('renders every project image in both layouts', async () => {
		const html = await render();
		for (const item of ORBIT_ITEMS) {
			const count = html.split(`src="${item.src}"`).length - 1;
			expect(count).toBe(2);
			expect(html).toContain(`alt="${item.label}"`);
		}
	});

	test('hydrates the desktop orbit only at 1024px and up', async () => {
		const html = await render();
		expect(html).toContain('data-orbit-desktop');
		expect(html).toContain('client="media"');
		expect(html).toContain('(min-width: 1024px)');
		expect(html).toMatch(/height:\s?460vh/);
	});

	test('exposes one accessible heading per layout', async () => {
		const html = await render();
		const headings = html.match(/<h2\b/g) ?? [];
		expect(headings).toHaveLength(2);
		expect(html).toContain('aria-label="Motion design projects"');
	});
});

test('home page places the orbit section right before How it works', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const orbit = page.indexOf('<OrbitProjects />');
	const how = page.indexOf('<HowItWorks />');
	const showcase = page.indexOf('<ProjectShowcase />');
	expect(orbit).toBeGreaterThan(showcase);
	expect(orbit).toBeLessThan(how);
});
