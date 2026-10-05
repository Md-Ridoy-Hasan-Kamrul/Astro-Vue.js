import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hero from './Hero.astro';

test('Hero keeps existing copy and mounts the glassy orb island', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(Hero);

	expect(result).toContain('id="top"');
	expect(result).toContain('Digital Product Design');
	expect(result).toContain('Contact Us');
	expect(result).toContain('Based on 48 Clutch reviews');
	expect(result).toContain('hero-orb');
});
