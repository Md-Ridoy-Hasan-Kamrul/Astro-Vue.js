import { describe, expect, it } from 'vitest';
import {
	ARCHIVE_CDN,
	ARCHIVE_FILM_URL,
	CAM_Z_CAP,
	HEADLINE_COPY,
	HEADLINE_Z_RATIO,
	HOVER_SPIN_DEG,
	SCROLL_ZOOM_VIEWPORTS,
	SPHERE_COUNT,
	TILT_DEG,
	archiveShots,
	camZTarget,
	cardChrome,
	cardTransform,
	distributeSphere,
	headlineOpacity,
	headlineTransform,
	hoverYaw,
	perspectiveForWidth,
	scrollZoomProgress,
	sphereRadius,
	circleDolly,
	eyeClipPath,
	eyeFilmProgress,
	eyeLayerOpacity,
	eyeZoomScale,
	containerScrollProgress,
	thumbUrl,
	worldTransform,
	EYE_WINDOW_END,
	EYE_ZOOM_END,
	TRACK_HEIGHT_VH,
} from './archiveSphere';

describe('archive catalog', () => {
	it('lists 21 stills and marks only Left Behind as tall', () => {
		expect(archiveShots).toHaveLength(SPHERE_COUNT);
		expect(archiveShots.filter((shot) => shot.tall).map((shot) => shot.title)).toEqual([
			'Left Behind',
		]);
		expect(archiveShots[0]?.title).toBe('Before the Dust Settled');
		expect(archiveShots[20]?.title).toBe('The Other Side');
	});

	it('builds CloudFront thumb and film URLs exactly', () => {
		expect(thumbUrl(archiveShots[0]!.id)).toBe(`${ARCHIVE_CDN}${archiveShots[0]!.id}_min.webp`);
		expect(ARCHIVE_FILM_URL).toContain('cloudfront.net');
		expect(HEADLINE_COPY).toBe('I See Through the Wild');
	});

	it('opens the eye with scroll, zooms in, then shows the circle', () => {
		expect(TRACK_HEIGHT_VH).toBe(350);
		expect(containerScrollProgress(400, 2800, 800)).toBe(0);
		expect(containerScrollProgress(800 - 2800, 2800, 800)).toBe(1);
		expect(eyeClipPath(0)).toContain('inset(45%');
		expect(eyeClipPath(EYE_WINDOW_END)).toContain('inset(0%');
		expect(eyeZoomScale(0)).toBe(1);
		expect(eyeZoomScale(EYE_WINDOW_END)).toBe(1);
		expect(eyeZoomScale(EYE_ZOOM_END)).toBeGreaterThan(1.1);
		expect(eyeZoomScale(EYE_ZOOM_END)).toBeLessThan(1.4);
		expect(eyeFilmProgress(0)).toBe(0);
		expect(eyeFilmProgress(EYE_ZOOM_END)).toBe(1);
		expect(eyeLayerOpacity(EYE_WINDOW_END)).toBe(1);
		expect(eyeLayerOpacity(1)).toBe(0);
		expect(circleDolly(EYE_ZOOM_END)).toBe(0);
		expect(circleDolly(1)).toBe(1);
	});
});

describe('fibonacci sphere', () => {
	it('places every card on the unit sphere around the origin', () => {
		const points = distributeSphere(SPHERE_COUNT);
		expect(points).toHaveLength(SPHERE_COUNT);
		expect(points[0]?.y).toBeCloseTo(1, 5);
		expect(points[SPHERE_COUNT - 1]?.y).toBeCloseTo(-1, 5);
		for (const point of points) {
			const length = point.x ** 2 + point.y ** 2 + point.z ** 2;
			expect(length).toBeCloseTo(1, 5);
		}
	});
});

describe('radius and perspective', () => {
	it('uses the phone, tablet, and desktop floors', () => {
		expect(sphereRadius(320, 568)).toBeGreaterThanOrEqual(108);
		expect(sphereRadius(425, 700)).toBeGreaterThanOrEqual(120);
		expect(sphereRadius(1280, 800)).toBeGreaterThanOrEqual(155);
		expect(sphereRadius(1280, 800)).toBeLessThanOrEqual(480);
	});

	it('picks perspective by width', () => {
		expect(perspectiveForWidth(320)).toBe(620);
		expect(perspectiveForWidth(500)).toBe(760);
		expect(perspectiveForWidth(800)).toBe(920);
		expect(perspectiveForWidth(1400)).toBe(1150);
	});
});

describe('camera and headline', () => {
	it('maps 16vh of scroll into 0..1 and clamps past it', () => {
		expect(SCROLL_ZOOM_VIEWPORTS).toBe(0.16);
		expect(scrollZoomProgress(0, 1000)).toBe(0);
		expect(scrollZoomProgress(160, 1000)).toBe(1);
		expect(scrollZoomProgress(400, 1000)).toBe(1);
	});

	it('dollies forward without flying through the sphere', () => {
		expect(camZTarget(0, 400)).toBe(0);
		expect(camZTarget(1, 400)).toBe(Math.min(CAM_Z_CAP, 400 * 0.12));
	});

	it('keeps the world on center and the title counter-rotated', () => {
		expect(worldTransform(12, 20, TILT_DEG)).toBe(
			`translateZ(12px) rotateX(${TILT_DEG}deg) rotateY(20deg)`,
		);
		expect(worldTransform(12, 20, TILT_DEG)).not.toContain('translateX');
		expect(worldTransform(12, 20, TILT_DEG)).not.toContain('translateY');
		expect(headlineTransform(TILT_DEG, 0, 200)).toBe(
			`rotateY(0deg) rotateX(${-TILT_DEG}deg) translateZ(${200 * HEADLINE_Z_RATIO}px)`,
		);
		expect(headlineOpacity(0)).toBe(1);
		expect(headlineOpacity(1)).toBeCloseTo(0.45, 5);
	});

	it('spins slowly while active and holds still while dragging or blocked', () => {
		expect(HOVER_SPIN_DEG).toBeGreaterThan(0.12);
		expect(HOVER_SPIN_DEG).toBeLessThan(0.35);
		expect(hoverYaw(10, true, false, false)).toBe(10 + HOVER_SPIN_DEG);
		expect(hoverYaw(10, false, false, false)).toBe(10);
		expect(hoverYaw(10, true, true, false)).toBe(10);
		expect(hoverYaw(10, true, false, true)).toBe(10);
	});
});

describe('card transform', () => {
	it('translates from the shared origin and rotates by lat/lon', () => {
		const point = distributeSphere(SPHERE_COUNT)[1]!;
		const transform = cardTransform(point, 200);
		expect(transform).toContain('translate3d(');
		expect(transform).toContain(`rotateY(${point.lon}deg)`);
		expect(transform).toContain(`rotateX(${point.lat}deg)`);
	});

	it('uses a portrait frame only for the tall card', () => {
		const wide = cardChrome(200, 1400, false);
		const tall = cardChrome(200, 1400, true);
		expect(tall.height).toBeGreaterThan(wide.height);
		expect(wide.width).toBe(tall.width);
	});
});
