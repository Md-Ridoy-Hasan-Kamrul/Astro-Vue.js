import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import ClientStories from './ClientStories.astro';
import { CLIENT_STORIES, CLIENT_STORY_COPY } from '../../lib/clientStories/clientStories';

async function render() {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(ClientStories);
}

describe('Client stories section', () => {
	test('renders the headline and both client stories', async () => {
		const html = await render();
		expect(html).toContain('id="client-stories"');
		expect(html).toContain('id="client-stories-title"');
		const escaped = (value: string) => value.replaceAll('&', '&amp;').replaceAll("'", '&#39;');
		expect(html).toContain(escaped(CLIENT_STORY_COPY.titleLead));
		expect(html).toContain(CLIENT_STORY_COPY.titleTail);
		expect(html.split('data-client-story').length - 1).toBe(CLIENT_STORIES.length);
		expect(html).toContain('aria-label="Previous client story"');
		expect(html).toContain('aria-label="Next client story"');
		for (const story of CLIENT_STORIES) {
			expect(html).toContain(story.brandMark);
			expect(html).toContain(escaped(story.quote));
			expect(html).toContain(story.name);
			expect(html).toContain(escaped(story.role));
			expect(html).toContain(story.location);
			expect(html).toContain(`src="${story.image}"`);
			expect(html).toContain(`alt="${story.imageAlt}"`);
		}
	});
});

test('home page places client stories after specialists and before how it works', () => {
	const page = readFileSync(resolve('src/pages/index.astro'), 'utf8');
	const specialists = page.indexOf('<Specialists />');
	const stories = page.indexOf('<ClientStories />');
	const how = page.indexOf('<HowItWorks />');
	expect(specialists).toBeGreaterThan(-1);
	expect(stories).toBeGreaterThan(specialists);
	expect(how).toBeGreaterThan(stories);
});
