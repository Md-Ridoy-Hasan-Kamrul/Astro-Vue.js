import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import Capabilities from './Capabilities.astro';
import { CAPABILITIES, CAPABILITY_COPY } from '../../lib/capabilities/capabilities';

async function render() {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(Capabilities);
}

describe('Capabilities section', () => {
	test('renders the headline, lede, and contact action', async () => {
		const html = await render();
		expect(html).toContain('id="capabilities"');
		expect(html).toContain(`>${CAPABILITY_COPY.title}</h2>`);
		expect(html).toContain(CAPABILITY_COPY.lede);
		expect(html).toContain(`href="${CAPABILITY_COPY.contactHref}"`);
		expect(html).toContain(`>${CAPABILITY_COPY.contactLabel}</a>`);
	});

	test('renders every service, including the hover copy, in the page', async () => {
		const html = await render();
		expect(html.split('data-capability-card').length - 1).toBe(CAPABILITIES.length);
		for (const item of CAPABILITIES) {
			expect(html).toContain(`>${item.index}</p>`);
			expect(html).toContain(`>${item.title.replaceAll('&', '&amp;')}</h3>`);
			expect(html).toContain(item.body);
			expect(html).toContain(`src="${item.image}"`);
			expect(html).toContain(`>${CAPABILITY_COPY.exploreLabel}</a>`);
		}
	});
});

test('home page places capabilities after Motion Design', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const orbit = page.indexOf('<OrbitProjects />');
	const capabilities = page.indexOf('<Capabilities />');
	expect(orbit).toBeGreaterThan(-1);
	expect(capabilities).toBeGreaterThan(orbit);
	expect(page).not.toContain('<HowItWorks />');
});
