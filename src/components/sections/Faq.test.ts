import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import Faq from './Faq.astro';
import { FAQ_COPY, FAQ_ITEMS } from '../../lib/faq/faq';

async function render() {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(Faq);
}

describe('FAQ section', () => {
	test('renders the title, search, and every question from the JSON data', async () => {
		const html = await render();
		expect(html).toContain('id="faq"');
		expect(html).toContain('id="faq-title"');
		expect(html).toContain(FAQ_COPY.title);
		expect(html).toContain(FAQ_COPY.searchPlaceholder);
		expect(html.split('data-faq-item').length - 1).toBe(FAQ_ITEMS.length);
		for (const item of FAQ_ITEMS) {
			expect(html).toContain(item.question);
			for (const paragraph of item.answer) {
				expect(html).toContain(paragraph);
			}
		}
	});
});

test('home page places the FAQ after client stories and before how it works', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const stories = page.indexOf('<ClientStories />');
	const faq = page.indexOf('<Faq />');
	const how = page.indexOf('<HowItWorks />');
	expect(stories).toBeGreaterThan(-1);
	expect(faq).toBeGreaterThan(stories);
	expect(how).toBeGreaterThan(faq);
});
