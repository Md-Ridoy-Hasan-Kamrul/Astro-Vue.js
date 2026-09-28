import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import ProjectShowcase from './ProjectShowcase.astro';

test('Project showcase mounts the archive after the partner section', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(ProjectShowcase);

	expect(result).toContain('id="showcase"');
	expect(result).toContain('>I</span>');
	expect(result).toContain('>See</span>');
	expect(result).toContain('>Through</span>');
	expect(result).toContain('>Wild</span>');
	expect(result).toContain('Toggle grid view');
	expect(result).not.toContain('>Skip<');
	expect(result).not.toContain('id="splash"');
	expect(result).not.toContain('Open menu');
	expect(result).not.toContain('aria-label="Ethan Vale"');
	expect(result).not.toContain('Wildlife photography is less about taking pictures');
	expect(result).toContain('Before the Dust Settled');
	expect(result).toContain('Left Behind');
	expect(result).toContain('height: 350vh');
});
