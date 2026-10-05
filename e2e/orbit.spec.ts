import { expect, test } from '@playwright/test';

const SECTION = '#orbit-projects';

test.describe('Orbit projects', () => {
	test('desktop scroll parks the titles, then lays cards out in a 3-column grid', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const stage = page.locator('[data-orbit-stage]');
		await expect(stage).toBeAttached();
		// Scrolling before Lenis and the orbit island are live gets reset on init.
		await page.waitForFunction(
			() =>
				document.documentElement.classList.contains('lenis') &&
				!document.querySelector('[data-orbit-desktop] astro-island[ssr]'),
		);

		// Headless Chrome renders WebGL on the CPU; with parallel workers the eased orbit needs more than 5s.
		const settle = { timeout: 15_000 };
		const scrollTo = async (ratio: number) => {
			await page.evaluate(
				([selector, value]) => {
					const section = document.querySelector<HTMLElement>(selector as string);
					if (!section) return;
					const top = section.getBoundingClientRect().top + window.scrollY;
					const lead = window.innerHeight * 0.55;
					const span = section.offsetHeight - window.innerHeight;
					window.scrollTo({ top: top - lead + span * (value as number), behavior: 'instant' });
				},
				[SECTION, ratio] as const,
			);
		};

		await expect
			.poll(async () => {
				await scrollTo(0.45);
				return page.locator('[data-orbit-title="left"]').evaluate((el) => Number(getComputedStyle(el).opacity));
			}, settle)
			.toBeGreaterThan(0.95);

		await expect
			.poll(async () => {
				await scrollTo(1);
				const tops = await page
					.locator('[data-orbit-card]')
					.evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
				return new Set(tops).size;
			}, settle)
			.toBe(2);
	});

	for (const { width, columns } of [
		{ width: 1020, columns: 2 },
		{ width: 768, columns: 2 },
		{ width: 425, columns: 1 },
		{ width: 375, columns: 1 },
		{ width: 320, columns: 1 },
	]) {
		test(`compact grid at ${width}px has ${columns} column(s) and no overflow`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/', { waitUntil: 'domcontentloaded' });
			const grid = page.locator('[data-orbit-compact] [data-orbit-grid]');
			await grid.scrollIntoViewIfNeeded();
			await expect(page.locator('[data-orbit-desktop]')).toBeHidden();
			const lefts = await grid
				.locator('img')
				.evaluateAll((imgs) => imgs.map((img) => Math.round(img.getBoundingClientRect().left)));
			expect(new Set(lefts).size).toBe(columns);
			const overflow = await page
				.locator('[data-orbit-compact]')
				.evaluate((el) => el.scrollWidth - el.clientWidth);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
});
