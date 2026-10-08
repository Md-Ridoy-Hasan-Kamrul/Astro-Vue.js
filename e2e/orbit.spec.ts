import { expect, test, type Page } from '@playwright/test';

const SECTION = '#orbit-projects';

/** Headless Chrome renders WebGL on the CPU; with parallel workers the eased orbit needs more than 5s. */
const SETTLE = { timeout: 15_000 };

/** Open the home page and wait until Lenis and the orbit island are live. */
async function openOrbit(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('[data-orbit-stage]')).toBeAttached();
	// Scrolling before Lenis and the orbit island are live gets reset on init.
	await page.waitForFunction(
		() =>
			document.documentElement.classList.contains('lenis') &&
			!document.querySelector('[data-orbit-animated] astro-island[ssr]'),
	);
}

/** Scroll so the orbit sits at `ratio` of its scroll track (0 = start, 1 = finished grid). */
async function scrollOrbitTo(page: Page, ratio: number) {
	await page.evaluate(
		([selector, value]) => {
			const section = document.querySelector<HTMLElement>(selector as string);
			if (!section) return;
			const track = section.querySelector<HTMLElement>('[data-orbit-stage]')?.parentElement ?? section;
			const top = track.getBoundingClientRect().top + window.scrollY;
			const lead = window.innerHeight * 0.55;
			const span = track.offsetHeight - window.innerHeight;
			window.scrollTo({ top: top - lead + span * (value as number), behavior: 'instant' });
		},
		[SECTION, ratio] as const,
	);
}

/** Distinct left / top edges of the cards, read at the end of the scroll track. */
async function gridShape(page: Page) {
	await scrollOrbitTo(page, 1);
	return page.locator('[data-orbit-card]').evaluateAll((cards) => {
		const boxes = cards.map((card) => card.getBoundingClientRect());
		return {
			lefts: new Set(boxes.map((box) => Math.round(box.left))).size,
			tops: new Set(boxes.map((box) => Math.round(box.top))).size,
			minLeft: Math.min(...boxes.map((box) => box.left)),
			maxRight: Math.max(...boxes.map((box) => box.right)),
		};
	});
}

/**
 * Wait until the orbit has flattened into a `columns` x rows grid. The cards reach full
 * opacity a moment before they finish easing into their slots, so poll the layout itself.
 */
async function finishedGrid(page: Page, columns: number) {
	await expect
		.poll(async () => {
			const shape = await gridShape(page);
			return [shape.lefts, shape.tops];
		}, SETTLE)
		.toEqual([columns, 6 / columns]);
	return gridShape(page);
}

test.describe('Orbit projects', () => {
	test('desktop scroll parks the titles, then lays cards out in a 3-column grid', async ({ page }) => {
		await openOrbit(page, 1440, 900);

		await expect
			.poll(async () => {
				await scrollOrbitTo(page, 0.45);
				return page.locator('[data-orbit-title="left"]').evaluate((el) => Number(getComputedStyle(el).opacity));
			}, SETTLE)
			.toBeGreaterThan(0.95);

		await expect
			.poll(async () => {
				await scrollOrbitTo(page, 1);
				const tops = await page
					.locator('[data-orbit-card]')
					.evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
				return new Set(tops).size;
			}, SETTLE)
			.toBe(2);

		const card = page.locator('[data-orbit-animated] [data-flip-card]').first();
		await card.click();
		await expect(card).toHaveAttribute('aria-pressed', 'true');
	});

	test('phone orbit cards flip on tap and on Enter once the grid has formed', async ({ page }) => {
		await openOrbit(page, 375, 800);
		await finishedGrid(page, 2);
		const card = page.locator('[data-orbit-animated] [data-flip-card]').first();
		await expect(card).toHaveAttribute('aria-pressed', 'false');
		await card.click();
		await expect(card).toHaveAttribute('aria-pressed', 'true');
		await card.press('Enter');
		await expect(card).toHaveAttribute('aria-pressed', 'false');
	});

	for (const { width, height, columns } of [
		{ width: 1020, height: 900, columns: 3 },
		{ width: 768, height: 900, columns: 3 },
		{ width: 425, height: 900, columns: 2 },
		{ width: 375, height: 667, columns: 2 },
		{ width: 320, height: 568, columns: 2 },
	]) {
		test(`orbit at ${width}px animates in, ends in ${columns} columns and does not overflow`, async ({ page }) => {
			await openOrbit(page, width, height);

			// The titles slide in, as on desktop.
			await expect
				.poll(async () => {
					await scrollOrbitTo(page, 0.45);
					return page.locator('[data-orbit-title="right"]').evaluate((el) => {
						const box = el.getBoundingClientRect();
						return Number(getComputedStyle(el).opacity) > 0.95 && box.left >= 0 && box.right <= window.innerWidth;
					});
				}, SETTLE)
				.toBe(true);

			const grid = await finishedGrid(page, columns);
			expect(grid.minLeft).toBeGreaterThanOrEqual(0);
			expect(grid.maxRight).toBeLessThanOrEqual(width);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
		});
	}
});
