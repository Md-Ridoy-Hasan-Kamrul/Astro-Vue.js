import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import Specialists from './Specialists.astro';
import { SPECIALIST_COPY, SPECIALIST_SHOTS } from '../../lib/specialists/specialists';

async function render() {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(Specialists);
}

describe('Specialists section', () => {
	test('renders the headline, three paragraphs, and about action', async () => {
		const html = await render();
		expect(html).toContain('id="specialists"');
		expect(html).toContain('h-screen');
		expect(html).toContain(SPECIALIST_COPY.titleLead);
		expect(html).toContain(SPECIALIST_COPY.titleTail);
		for (const paragraph of SPECIALIST_COPY.paragraphs) {
			expect(html).toContain(paragraph);
		}
		expect(html).toContain(`href="${SPECIALIST_COPY.actionHref}"`);
		expect(html).toContain(`>${SPECIALIST_COPY.actionLabel}</a>`);
	});

	test('renders each existing image twice so the strip can loop', async () => {
		const html = await render();
		expect(html).toContain('data-specialist-strip');
		expect(html).toContain('data-specialist-track');
		expect(html).toContain('client="visible"');
		const occurrences = (text: string) => html.split(text).length - 1;
		for (const shot of SPECIALIST_SHOTS) {
			expect(occurrences(`src="${shot.src}"`)).toBe(2);
		}
	});
});

test('home page places specialists after capabilities', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const capabilities = page.indexOf('<Capabilities />');
	const specialists = page.indexOf('<Specialists />');
	expect(capabilities).toBeGreaterThan(-1);
	expect(specialists).toBeGreaterThan(capabilities);
	expect(page).not.toContain('<HowItWorks />');
});
