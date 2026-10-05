import { describe, expect, it } from 'vitest';
import {
	FLIP_CARD_DEFAULTS,
	cssSize,
	dragRotation,
	flipShadow,
	flipTransform,
	glareBackground,
	glarePosition,
	hexToRgba,
	isFlipped,
	isSpringSettled,
	snapRotation,
	springStep,
	tiltAngles,
} from './flipCard';

describe('defaults', () => {
	it('matches the FlipCard reference props', () => {
		expect(FLIP_CARD_DEFAULTS).toMatchObject({
			axis: 'y',
			flipOnClick: true,
			draggable: true,
			dragDistance: 0,
			tilt: true,
			tiltMax: 12,
			glare: true,
			glareOpacity: 0.22,
			hoverScale: 1.03,
			perspective: 1100,
			stiffness: 170,
			damping: 20,
			radius: 22,
			background: '#27272a',
			color: '#f5f5f5',
			shadow: true,
			shadowColor: '#000000',
			shadowOpacity: 0.45,
		});
	});
});

describe('spring', () => {
	const config = { stiffness: 170, damping: 20 };

	it('accelerates toward the target', () => {
		const next = springStep({ value: 0, velocity: 0 }, 180, 1 / 60, config);
		expect(next.velocity).toBeGreaterThan(0);
		expect(next.value).toBeGreaterThan(0);
		expect(next.value).toBeLessThan(180);
	});

	it('settles on the target within two seconds', () => {
		let state = { value: 0, velocity: 0 };
		for (let frame = 0; frame < 120; frame += 1) state = springStep(state, 180, 1 / 60, config);
		expect(state.value).toBeCloseTo(180, 0);
		expect(isSpringSettled(state, 180)).toBe(true);
	});

	it('is not settled while still moving', () => {
		expect(isSpringSettled({ value: 179.99, velocity: 5 }, 180)).toBe(false);
		expect(isSpringSettled({ value: 170, velocity: 0 }, 180)).toBe(false);
	});

	it('caps long frames so a background tab cannot explode the spring', () => {
		const next = springStep({ value: 0, velocity: 0 }, 180, 5, config);
		expect(Number.isFinite(next.value)).toBe(true);
		expect(Math.abs(next.value)).toBeLessThan(400);
	});
});

describe('flip rotation', () => {
	it('snaps to the nearest half turn', () => {
		expect(snapRotation(80)).toBe(0);
		expect(snapRotation(100)).toBe(180);
		expect(snapRotation(-100)).toBe(-180);
		expect(snapRotation(400)).toBe(360);
	});

	it('reads odd half turns as flipped', () => {
		expect(isFlipped(0)).toBe(false);
		expect(isFlipped(180)).toBe(true);
		expect(isFlipped(-180)).toBe(true);
		expect(isFlipped(360)).toBe(false);
	});

	it('turns half a revolution per card width dragged on the y axis', () => {
		expect(dragRotation(0, 150, 300, 'y')).toBe(90);
		expect(dragRotation(180, -300, 300, 'y')).toBe(0);
	});

	it('turns the other way for vertical drags on the x axis', () => {
		expect(dragRotation(0, 200, 400, 'x')).toBe(-90);
	});

	it('builds the flip transform for each axis', () => {
		expect(flipTransform('y', 180)).toBe('rotateY(180deg)');
		expect(flipTransform('x', 45)).toBe('rotateX(45deg)');
	});
});

describe('tilt and glare', () => {
	it('tilts toward the pointer up to tiltMax', () => {
		expect(tiltAngles(0.5, 0.5, 12)).toEqual({ rotateX: 0, rotateY: 0 });
		expect(tiltAngles(1, 0, 12)).toEqual({ rotateX: 12, rotateY: 12 });
		expect(tiltAngles(0, 1, 12)).toEqual({ rotateX: -12, rotateY: -12 });
	});

	it('clamps pointers outside the card', () => {
		expect(tiltAngles(2, -1, 10)).toEqual({ rotateX: 10, rotateY: 10 });
	});

	it('places the glare under the pointer in percent', () => {
		expect(glarePosition(0.25, 0.8)).toEqual({ x: 25, y: 80 });
	});

	it('paints the glare as a white radial highlight', () => {
		expect(glareBackground({ x: 25, y: 80 }, 0.22)).toBe(
			'radial-gradient(circle at 25% 80%, rgba(255, 255, 255, 0.22), transparent 60%)',
		);
	});
});

describe('style helpers', () => {
	it('converts hex colors to rgba', () => {
		expect(hexToRgba('#000000', 0.45)).toBe('rgba(0, 0, 0, 0.45)');
		expect(hexToRgba('#27272a', 1)).toBe('rgba(39, 39, 42, 1)');
		expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
	});

	it('scales the shadow with the render scale', () => {
		expect(flipShadow('#000000', 0.45, 1)).toBe('0 24px 60px rgba(0, 0, 0, 0.45)');
		expect(flipShadow('#000000', 0.45, 2)).toBe('0 48px 120px rgba(0, 0, 0, 0.45)');
	});

	it('turns numbers into px and leaves missing sizes to fill', () => {
		expect(cssSize(300)).toBe('300px');
		expect(cssSize(undefined)).toBe('100%');
	});
});
