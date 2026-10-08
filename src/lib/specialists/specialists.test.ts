import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPECIALIST_COPY, SPECIALIST_SHOTS } from './specialists';

describe('specialist copy', () => {
	it('keeps the reference headline, three paragraphs, and contact action', () => {
		expect(SPECIALIST_COPY.titleLead).toBe('Built by Specialists.');
		expect(SPECIALIST_COPY.titleTail).toBe('Connected by One Goal.');
		expect(SPECIALIST_COPY.paragraphs).toEqual([
			'Behind every project is a multidisciplinary team of strategists, researchers, designers, developers, and problem solvers working toward the same goal.',
			'Instead of handing work from one disconnected vendor to another, we bring the disciplines together. Decisions made during strategy inform design. Design works with technology. Development stays aligned with the product and business goals from the beginning.',
			'That is how we turn ideas into digital products that feel considered from every angle.',
		]);
		expect(SPECIALIST_COPY.actionLabel).toBe('Contact Us');
		expect(SPECIALIST_COPY.actionHref).toBe('/contact');
	});
});

describe('specialist shots', () => {
	it('loops local images that already live on this site', () => {
		expect(SPECIALIST_SHOTS.length).toBeGreaterThanOrEqual(8);
		const sources = SPECIALIST_SHOTS.map((shot) => shot.src);
		expect(new Set(sources).size).toBe(sources.length);
		for (const shot of SPECIALIST_SHOTS) {
			expect(shot.alt.length).toBeGreaterThan(0);
			expect(shot.src).toMatch(/^\/(products|partner)\/.+\.(png|jpe?g|webp)$/);
			expect(existsSync(resolve('public', shot.src.slice(1)))).toBe(true);
		}
	});
});
