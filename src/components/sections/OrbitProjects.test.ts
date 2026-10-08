import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
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
	test('keeps the plain grid with the Framer copy for visitors without JavaScript', async () => {
		const html = await render();
		expect(html).toContain('id="orbit-projects"');
		expect(html).toMatch(/<noscript>\s*<div data-orbit-compact/);
		expect(html).toContain('>MOTION</span>');
		expect(html).toContain('>DESIGN IN</span>');
		expect(html).toContain('Exploring ideas through daily design practice.');
	});

	test('renders every card in the orbit (info in front, artwork on the back) and in the fallback grid', async () => {
		const html = await render();
		const occurrences = (text: string) => html.split(text).length - 1;
		expect(occurrences('data-flip-card')).toBe(ORBIT_ITEMS.length);
		expect(occurrences('data-orbit-stat')).toBe(ORBIT_ITEMS.length * 2);
		for (const item of ORBIT_ITEMS) {
			expect(occurrences(`src="${item.image}"`)).toBe(3);
			expect(occurrences(`>${item.label}</p>`)).toBe(2);
			expect(occurrences(`>${item.index}</p>`)).toBe(2);
			expect(occurrences(`>${item.value}</p>`)).toBe(2);
		}
	});

	test('hydrates the scroll-driven orbit at every width, tablet and phones included', async () => {
		const html = await render();
		expect(html).toContain('data-orbit-animated');
		expect(html).toContain('client="idle"');
		expect(html).not.toContain('client="media"');
		expect(html).toMatch(/height:\s?460vh/);
	});

	test('exposes one accessible heading per layout', async () => {
		const html = await render();
		const headings = html.match(/<h2\b/g) ?? [];
		expect(headings).toHaveLength(2);
		expect(html).toContain('aria-label="Motion design projects"');
	});
});

test('home page places the orbit section after the showcase and before capabilities', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const orbit = page.indexOf('<OrbitProjects />');
	const capabilities = page.indexOf('<Capabilities />');
	const showcase = page.indexOf('<ProjectShowcase />');
	expect(orbit).toBeGreaterThan(showcase);
	expect(capabilities).toBeGreaterThan(orbit);
});
