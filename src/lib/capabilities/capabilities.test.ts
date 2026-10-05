import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPABILITIES, CAPABILITY_COPY } from './capabilities';

describe('capability copy', () => {
	it('keeps the section headline, lede, and contact action', () => {
		expect(CAPABILITY_COPY.title).toBe('End-to-End Digital Capabilities');
		expect(CAPABILITY_COPY.lede).toBe(
			'From product thinking and experience design to development and launch, our specialists work together to move your digital product forward.',
		);
		expect(CAPABILITY_COPY.contactLabel).toBe('Contact us');
		expect(CAPABILITY_COPY.contactHref).toBe('/about#feedback');
		expect(CAPABILITY_COPY.exploreLabel).toBe('Explore Now');
		expect(CAPABILITY_COPY.exploreHref).toBe('/about#services');
	});
});

describe('capabilities', () => {
	it('lists the six services with hover copy and a local preview', () => {
		expect(CAPABILITIES.map((item) => [item.index, item.title, item.body])).toEqual([
			[
				'001',
				'UI/UX Design',
				'Turn user needs and business goals into clear digital experiences through research, UX strategy, interaction design, testing, and scalable UI systems.',
			],
			[
				'002',
				'Brand Design',
				'Build strategic brand identities that define how your business looks, communicates, and stays recognizable across every customer touchpoint.',
			],
			[
				'003',
				'Web Design & Development',
				'Strategize, design, and develop websites that communicate your value clearly while supporting performance, usability, conversion, and growth.',
			],
			[
				'004',
				'SaaS Design & Development',
				'Turn complex SaaS ideas into scalable products with clear workflows, intuitive interfaces, and development built for long-term growth.',
			],
			[
				'005',
				'Webflow Design & Development',
				'We design and build responsive Webflow websites with reusable systems that give growing teams greater control over content, performance, and scale.',
			],
			[
				'006',
				'Mobile App Design & Development',
				'Design and develop mobile apps that connect user needs with business goals through seamless experiences, reliable performance, and scalable technology.',
			],
		]);
		const images = CAPABILITIES.map((item) => item.image);
		expect(new Set(images).size).toBe(CAPABILITIES.length);
		for (const image of images) {
			expect(image).toMatch(/^\/products\/.+\.(png|jpe?g|webp)$/);
			expect(existsSync(resolve('public', image.slice(1)))).toBe(true);
		}
	});
});
