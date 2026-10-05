import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Stack from './Stack.astro';

describe('Stack section', () => {
	it('renders skills heading and book island', async () => {
		const renderers = await loadRenderers([getContainerRenderer()]);
		const container = await AstroContainer.create({ renderers });
		const result = await container.renderToString(Stack);

		expect(result).toContain('id="stack"');
		expect(result).toContain('Skills in five pages');
		expect(result).toContain('Frontend Development');
		expect(result).toContain('Soft Skills &amp; Methodologies');
		expect(result).toContain('astro-island');
	});
});
