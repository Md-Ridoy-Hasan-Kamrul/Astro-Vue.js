import { describe, expect, it } from 'vitest';
import {
	CIRCLE_MAX_RADIUS_PERCENT,
	CIRCLE_OPEN_END,
	FALLBACK_FLY_IMAGE,
	FLY_IMAGE_PATH,
	PLANE_CENTER_PROGRESS,
	PLANE_X_END_VIEWPORTS,
	PLANE_X_START_VIEWPORTS,
	SCROLL_TRACK_VH,
	circleRadiusPercent,
	clamp01,
	interpolate,
	planeOpacity,
	planeTranslateXPx,
	sampleKeyframes,
	scrollProgressForTarget,
} from './scrollFlyIn';

describe('scrollFlyIn tokens', () => {
	it('keeps a sticky track for the iris + plane beat', () => {
		expect(SCROLL_TRACK_VH).toBe(200);
	});

	it('exposes local fly image + fallback URL', () => {
		expect(FLY_IMAGE_PATH).toBe('/transition/jet.webp');
		expect(FALLBACK_FLY_IMAGE).toContain('cdn.21st.dev');
	});
});

describe('clamp01 / interpolate / sampleKeyframes', () => {
	it('clamps progress into 0..1', () => {
		expect(clamp01(-1)).toBe(0);
		expect(clamp01(0.4)).toBe(0.4);
		expect(clamp01(2)).toBe(1);
	});

	it('interpolates linearly between stops', () => {
		expect(interpolate(0.45, 0.1, 0.8, -100, 100)).toBeCloseTo(0, 5);
	});

	it('samples multi-stop keyframes', () => {
		expect(
			sampleKeyframes(0.5, [
				{ progress: 0, value: 0 },
				{ progress: 1, value: 10 },
			]),
		).toBe(5);
	});
});

describe('circleRadiusPercent', () => {
	it('opens to max and stays open (no shrink)', () => {
		expect(circleRadiusPercent(0)).toBe(0);
		expect(circleRadiusPercent(CIRCLE_OPEN_END)).toBe(CIRCLE_MAX_RADIUS_PERCENT);
		expect(circleRadiusPercent(0.7)).toBe(CIRCLE_MAX_RADIUS_PERCENT);
		expect(circleRadiusPercent(1)).toBe(CIRCLE_MAX_RADIUS_PERCENT);
	});
});

describe('planeTranslateXPx', () => {
	it('moves left → center → flies fully off right', () => {
		const width = 1000;
		expect(planeTranslateXPx(0, width)).toBe(PLANE_X_START_VIEWPORTS * width);
		expect(planeTranslateXPx(PLANE_CENTER_PROGRESS, width)).toBe(0);
		expect(planeTranslateXPx(1, width)).toBe(PLANE_X_END_VIEWPORTS * width);
	});
});

describe('planeOpacity', () => {
	it('stays visible mid-flight then fades as it exits', () => {
		expect(planeOpacity(0)).toBe(0);
		expect(planeOpacity(0.5)).toBe(1);
		expect(planeOpacity(1)).toBe(0);
	});
});

describe('scrollProgressForTarget', () => {
	it('returns 0 when the target start meets the viewport end', () => {
		expect(
			scrollProgressForTarget({
				targetTop: 800,
				targetHeight: 1600,
				viewportHeight: 800,
			}),
		).toBe(0);
	});

	it('returns 1 when the target end meets the viewport start', () => {
		expect(
			scrollProgressForTarget({
				targetTop: -1600,
				targetHeight: 1600,
				viewportHeight: 800,
			}),
		).toBe(1);
	});

	it('returns mid progress while scrolling through the track', () => {
		expect(
			scrollProgressForTarget({
				targetTop: -400,
				targetHeight: 1600,
				viewportHeight: 800,
			}),
		).toBeCloseTo(0.5, 5);
	});
});
