import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PartnerAbout from './PartnerAbout.astro';
import PageTransition from './PageTransition.astro';

test('PageTransition wraps partner reveal with plane asset (no welcome copy)', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(PageTransition);

	expect(result).toContain('id="page-transition"');
	expect(result).toContain('/transition/jet.webp');
	expect(result).toContain('id="partner"');
	expect(result).toContain('One Partner. From Strategy to Scale.');
	expect(result).not.toContain('Welcome to Astro Vue');
	expect(result).not.toContain('Where journeys become unforgettable');
});

test('PartnerAbout section matches the strategy-to-scale reference layout', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(PartnerAbout);

	expect(result).toContain('id="partner"');
	expect(result).toContain('One Partner. From Strategy to Scale.');
	expect(result).toContain('Great digital products need more than good design.');
	expect(result).toContain('More About Us');
	expect(result).toContain('Nedin Zahirovic');
	expect(result).toContain('/partner/office.jpg');
	expect(result).toContain('min-[1020px]:items-stretch');
});
