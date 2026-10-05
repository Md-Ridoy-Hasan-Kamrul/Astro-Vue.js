import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Features from './Features.astro';

test('Features section renders titles', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(Features);

	expect(result).toContain('id="features"');
	expect(result).toContain('What this stack is for');
	expect(result).toContain('Vue islands');
	expect(result).toContain('glass carousel');
});
