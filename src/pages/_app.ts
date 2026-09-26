import type { App } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createAppQueryClient } from '../lib/query/queryClient';

/**
 * Astro Vue app entrypoint — runs for every hydrated Vue island.
 * @see https://docs.astro.build/en/guides/integrations-guide/vue/#appentrypoint
 */
export default (app: App) => {
	app.use(VueQueryPlugin, {
		queryClient: createAppQueryClient(),
	});
};
