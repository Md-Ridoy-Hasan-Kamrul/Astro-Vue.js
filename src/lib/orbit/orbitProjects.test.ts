import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	ORBIT_CARD,
	ORBIT_COPY,
	ORBIT_GRID,
	ORBIT_ITEMS,
	ORBIT_LAYOUT,
	ORBIT_TITLE,
	cardFrame,
	cardRenderBox,
	cardShadow,
	cardTransform,
	centerCopyOpacity,
	clamp,
	compactCardShadow,
	dampProgress,
	isCompactWidth,
	isMobileWidth,
	lerp,
	orbitCssVars,
	scrollTargetProgress,
	smootherstep,
	stageGeometry,
	titleFrame,
} from './orbitProjects';

const DESKTOP = { width: 1440, height: 900 };
const LAPTOP = { width: 1024, height: 768 };

describe('orbit math helpers', () => {
	it('clamps, lerps and eases like the Framer source', () => {
		expect(clamp(-1)).toBe(0);
		expect(clamp(2)).toBe(1);
		expect(clamp(5, 0, 10)).toBe(5);
		expect(lerp(10, 20, 0.5)).toBe(15);
		expect(smootherstep(0, 0.2, 0)).toBe(0);
		expect(smootherstep(0, 0.2, 0.2)).toBe(1);
		expect(smootherstep(0, 0.2, 0.1)).toBeCloseTo(0.5);
		expect(smootherstep(0.5, 0.5, 0.4)).toBe(0);
		expect(smootherstep(0.5, 0.5, 0.6)).toBe(1);
	});
});

describe('scroll progress', () => {
	it('starts when the section top reaches 55% of the viewport', () => {
		const viewportHeight = 1000;
		const height = 4600;
		expect(scrollTargetProgress({ top: 550, height, viewportHeight })).toBe(0);
		expect(scrollTargetProgress({ top: 2000, height, viewportHeight })).toBe(0);
	});

	it('ends after the sticky track has scrolled its own height minus one viewport', () => {
		const viewportHeight = 1000;
		const height = 4600;
		const end = 550 - (height - viewportHeight);
		expect(scrollTargetProgress({ top: end, height, viewportHeight })).toBe(1);
		expect(scrollTargetProgress({ top: end - 500, height, viewportHeight })).toBe(1);
		expect(scrollTargetProgress({ top: end / 2 + 275, height, viewportHeight })).toBeCloseTo(0.5);
	});

	it('damps toward the target with smoothness 7 and a capped frame time', () => {
		const step = dampProgress(0, 1, 0.016);
		expect(step).toBeCloseTo(1 - Math.exp(-7 * 0.016));
		expect(dampProgress(0, 1, 1)).toBeCloseTo(1 - Math.exp(-7 * 0.064));
		expect(dampProgress(0.4, 0.8, -1)).toBe(0.4);
	});

	it('snaps onto the target once the gap is tiny', () => {
		expect(dampProgress(0.99995, 1, 0.016)).toBe(1);
	});
});

describe('breakpoints', () => {
	it('uses the grid layout below 1024px and one column below 640px', () => {
		expect(isCompactWidth(1023)).toBe(true);
		expect(isCompactWidth(ORBIT_LAYOUT.desktopMinPx)).toBe(false);
		expect(isMobileWidth(639)).toBe(true);
		expect(isMobileWidth(ORBIT_LAYOUT.mobileMaxPx)).toBe(false);
	});
});

describe('title and center copy', () => {
	it('slides the titles in from 70% of the width and parks them beside the copy', () => {
		const start = titleFrame(0, DESKTOP.width);
		expect(start.opacity).toBe(0);
		expect(start.leftOffset).toBeCloseTo(DESKTOP.width * 0.7);
		expect(start.shift).toBe(ORBIT_TITLE.enterShiftPx);

		const parked = titleFrame(0.5, DESKTOP.width);
		expect(parked.opacity).toBe(1);
		expect(parked.shift).toBe(0);
		expect(parked.leftOffset).toBe((ORBIT_TITLE.centerTextWidthPx + ORBIT_TITLE.centerGapPx) / 2);
		expect(parked.rightOffset).toBe(parked.leftOffset);

		expect(titleFrame(1, DESKTOP.width).opacity).toBe(0);
	});

	it('never lets the copy box grow past half the viewport', () => {
		expect(titleFrame(0.5, 300).copyWidth).toBe(150);
		expect(titleFrame(0.5, DESKTOP.width).copyWidth).toBe(ORBIT_TITLE.centerTextWidthPx);
	});

	it('fades the center copy in, holds it, then fades it out', () => {
		expect(centerCopyOpacity(0.12)).toBe(0);
		expect(centerCopyOpacity(0.25)).toBe(1);
		expect(centerCopyOpacity(0.58)).toBe(1);
		expect(centerCopyOpacity(0.82)).toBe(0);
	});
});

describe('stage geometry', () => {
	it('builds the 3-column desktop grid and arc at 1440 x 900', () => {
		const geometry = stageGeometry(DESKTOP, ORBIT_ITEMS.length);
		const cardWidth = (ORBIT_GRID.maxWidthPx - ORBIT_GRID.gapPx * 2) / 3;
		expect(geometry.columns).toBe(3);
		expect(geometry.rows).toBe(2);
		expect(geometry.gridWidth).toBe(ORBIT_GRID.maxWidthPx);
		expect(geometry.cardWidth).toBeCloseTo(cardWidth);
		expect(geometry.cardHeight).toBeCloseTo(cardWidth / ORBIT_CARD.aspect);
		expect(geometry.arcCardWidth).toBeCloseTo(DESKTOP.width * 0.28);
		expect(geometry.curveWidth).toBe(570);
		expect(geometry.curveHeight).toBe(210);
		expect(geometry.depth).toBe(520);
	});

	it('shrinks the grid to the padded width on a 1024 laptop', () => {
		const geometry = stageGeometry(LAPTOP, ORBIT_ITEMS.length);
		expect(geometry.gridWidth).toBe(LAPTOP.width - 96);
		expect(geometry.curveWidth).toBeCloseTo(LAPTOP.width * 0.44);
		expect(geometry.depth).toBeCloseTo(LAPTOP.width * 0.42);
	});
});

describe('card frames', () => {
	const geometry = stageGeometry(DESKTOP, ORBIT_ITEMS.length);

	it('hides every card before the reveal starts', () => {
		for (let index = 0; index < ORBIT_ITEMS.length; index += 1) {
			expect(cardFrame(index, ORBIT_ITEMS.length, 0, DESKTOP, geometry).opacity).toBe(0);
		}
	});

	it('lands each card flat in its grid slot at the end', () => {
		const index = 4;
		const frame = cardFrame(index, ORBIT_ITEMS.length, 1, DESKTOP, geometry);
		const left = -geometry.gridWidth / 2 + (geometry.cardWidth + ORBIT_GRID.gapPx);
		const top =
			DESKTOP.height * ORBIT_GRID.positionY -
			DESKTOP.height / 2 -
			geometry.gridHeight / 2 +
			geometry.cardHeight +
			ORBIT_GRID.gapPx;
		expect(frame.flattened).toBe(1);
		expect(frame.x).toBeCloseTo(left);
		expect(frame.y).toBeCloseTo(top);
		expect(frame.z).toBe(0);
		expect(frame.rotateY).toBeCloseTo(0);
		expect(frame.rotateZ).toBeCloseTo(0);
		expect(frame.scale).toBe(1);
		expect(frame.opacity).toBe(1);
		expect(frame.zIndex).toBe(100 + index);
	});

	it('keeps depth scale, opacity and stacking in range mid-orbit', () => {
		for (let index = 0; index < ORBIT_ITEMS.length; index += 1) {
			const frame = cardFrame(index, ORBIT_ITEMS.length, 0.4, DESKTOP, geometry);
			expect(frame.opacity).toBeGreaterThanOrEqual(0);
			expect(frame.opacity).toBeLessThanOrEqual(1);
			expect(frame.scale).toBeGreaterThanOrEqual(ORBIT_CARD.depthScaleMin);
			expect(frame.scale).toBeLessThanOrEqual(1);
			expect(frame.zIndex).toBeGreaterThanOrEqual(100);
			expect(frame.zIndex).toBeLessThanOrEqual(900);
		}
	});
});

describe('card rendering', () => {
	it('renders at 2x and scales back so the front card stays sharp', () => {
		const box = cardRenderBox({ x: 10, y: 20, width: 100, height: 50, scale: 0.9 });
		expect(box.width).toBe(200);
		expect(box.height).toBe(100);
		expect(box.x).toBe(-40);
		expect(box.y).toBe(-5);
		expect(box.scale).toBeCloseTo(0.45);
		expect(box.radius).toBe(ORBIT_CARD.radiusPx * 2);
	});

	it('writes the 3D transform in the Framer order', () => {
		expect(cardTransform({ x: 1, y: 2, z: 3, rotateY: 4, rotateZ: 5, scale: 0.5 })).toBe(
			'translate3d(1px, 2px, 3px) rotateY(4deg) rotateZ(5deg) scale(0.5)',
		);
	});

	it('softens the shadow as the cards flatten', () => {
		expect(cardShadow(0)).toBe('0 36px 100px rgba(0, 0, 0, 0.12)');
		expect(cardShadow(1)).toBe('0 14.4px 40px rgba(0, 0, 0, 0.048)');
		expect(compactCardShadow()).toBe('0 5.4px 15px rgba(0, 0, 0, 0.036)');
	});
});

describe('content', () => {
	it('keeps the Framer copy', () => {
		expect(ORBIT_COPY.leftTitle).toBe('MOTION');
		expect(ORBIT_COPY.rightTitle).toBe('DESIGN IN');
		expect(ORBIT_COPY.centerText).toBe('Exploring ideas through daily design practice.');
	});

	it('lists six projects with optimized local images', () => {
		expect(ORBIT_ITEMS).toHaveLength(6);
		for (const item of ORBIT_ITEMS) {
			expect(item.src).toMatch(/^\/orbit\/\d+\.webp$/);
			expect(item.label.length).toBeGreaterThan(0);
			expect(existsSync(resolve('public', item.src.slice(1)))).toBe(true);
		}
	});
});

describe('orbitCssVars', () => {
	it('exposes the Framer sizes as custom properties', () => {
		const vars = orbitCssVars();
		expect(vars).toContain('--orbit-bg: #D4D4D4;');
		expect(vars).toContain('--orbit-card-radius: 8px;');
		expect(vars).toContain('--orbit-card-aspect: 1.48;');
		expect(vars).toContain('--orbit-pad-y: 72px;');
		expect(vars).toContain('--orbit-grid-gap: 14px;');
		expect(vars).toContain('--orbit-compact-title: min(72px, 15vw);');
		expect(vars).toContain('--orbit-desktop-title: min(144px, 10vw);');
	});
});
