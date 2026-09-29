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
	expect(result).toContain('>Web</span>');
	expect(result).toContain('>Application</span>');
	expect(result).toContain('>Design</span>');
	expect(result).toContain('Toggle grid view');
	expect(result).not.toContain('>Skip<');
	expect(result).not.toContain('id="splash"');
	expect(result).not.toContain('Open menu');
	expect(result).not.toContain('aria-label="Ethan Vale"');
	expect(result).not.toContain('Wildlife photography is less about taking pictures');
	expect(result).toContain('Flowform');
	expect(result).toContain('Control Ledger');
	expect(result).toContain('height: 350vh');
});
