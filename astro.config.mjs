// @ts-check
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, memoryCache } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://astro-vue.example.com',
	adapter: vercel(),
	integrations: [vue({ appEntrypoint: '/src/pages/_app' }), sitemap()],
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'hover',
	},
	image: {
		domains: ['images.unsplash.com'],
	},
	cache: {
		provider: memoryCache(),
	},
	routeRules: {
		'/_server-islands/[...path]': {
			maxAge: 300,
			swr: 60,
			tags: ['server-islands'],
		},
	},
	vite: {
		plugins: [tailwindcss()],
		ssr: {
			noExternal: ['vue-sonner'],
		},
	},
});
