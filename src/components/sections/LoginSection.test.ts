import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import LoginSection from './LoginSection.astro';

describe('LoginSection', () => {
	it('renders login heading and NeuroField island hook', async () => {
		const renderers = await loadRenderers([getContainerRenderer()]);
		const container = await AstroContainer.create({ renderers });
		const result = await container.renderToString(LoginSection);

		expect(result).toContain('id="login"');
		expect(result).toContain('Sign in');
		expect(result).toContain('astro-island');
		expect(result).toMatch(/login/i);
	});
});
