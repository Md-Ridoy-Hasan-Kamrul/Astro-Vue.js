import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/vue/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import DashboardBoard from './DashboardBoard.astro';

describe('DashboardBoard', () => {
	it('renders Crextio chrome and key widgets', async () => {
		const renderers = await loadRenderers([getContainerRenderer()]);
		const container = await AstroContainer.create({ renderers });
		const result = await container.renderToString(DashboardBoard);

		expect(result).toContain('Welcome in, Nixtio');
		expect(result).toContain('Lora Piterson');
		expect(result).toContain('Onboarding Task');
		expect(result).toContain('Weekly Team Sync');
		expect(result).toContain('astro-island');
	});
});
