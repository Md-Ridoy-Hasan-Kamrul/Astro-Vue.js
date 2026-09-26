import { describe, expect, it } from 'vitest';
import {
	CONTENT_Y_END_PX,
	CONTENT_Y_START_PX,
	FALLBACK_FLY_IMAGE,
	FLY_IMAGE_PATH,
	INSET_PROGRESS_END,
	INSET_X_START,
	INSET_Y_START,
	PLANE_CENTER_PROGRESS,
	PLANE_X_END_VIEWPORTS,
	PLANE_X_START_VIEWPORTS,
	ROUND_END_PX,
	ROUND_START_PX,
	SCROLL_TRACK_VH,
	clamp01,
	contentTranslateYPx,
	insetClipPath,
	insetRoundPx,
	insetXPercent,
	insetYPercent,
	planeOpacity,
	planeTranslateXPx,
	scrollProgressForTarget,
} from './scrollFlyIn';

describe('scrollFlyIn tokens', () => {
	it('uses a tall ContainerScroll-style track', () => {
		expect(SCROLL_TRACK_VH).toBe(350);
	});

	it('exposes local fly image + fallback URL', () => {
		expect(FLY_IMAGE_PATH).toBe('/transition/jet.webp');
		expect(FALLBACK_FLY_IMAGE).toContain('cdn.21st.dev');
	});
});

describe('ContainerInset math', () => {
	it('opens inset from 45% to 0% (never shrinks back)', () => {
		expect(insetYPercent(0)).toBe(INSET_Y_START);
		expect(insetXPercent(0)).toBe(INSET_X_START);
		expect(insetYPercent(INSET_PROGRESS_END)).toBe(0);
		expect(insetXPercent(1)).toBe(0);
		expect(insetYPercent(1)).toBe(0);
	});

	it('softens roundedness from circle-like to card radius', () => {
		expect(insetRoundPx(0)).toBe(ROUND_START_PX);
		expect(insetRoundPx(1)).toBe(ROUND_END_PX);
	});

	it('builds an inset() clip-path string', () => {
		expect(insetClipPath(0)).toContain('inset(');
		expect(insetClipPath(0)).toContain('round');
		expect(insetClipPath(1)).toBe(`inset(0% 0% 0% 0% round ${ROUND_END_PX}px)`);
	});
});

describe('contentTranslateYPx', () => {
	it('rises from below into center', () => {
		expect(contentTranslateYPx(0)).toBe(CONTENT_Y_START_PX);
		expect(contentTranslateYPx(1)).toBe(CONTENT_Y_END_PX);
	});
});

describe('plane flight', () => {
	it('moves left → center → fully off right', () => {
		const width = 1000;
		expect(planeTranslateXPx(0, width)).toBe(PLANE_X_START_VIEWPORTS * width);
		expect(planeTranslateXPx(PLANE_CENTER_PROGRESS, width)).toBe(0);
		expect(planeTranslateXPx(1, width)).toBe(PLANE_X_END_VIEWPORTS * width);
	});

	it('stays visible while the partner section can already show', () => {
		expect(planeOpacity(0.5)).toBe(1);
		expect(clamp01(0.5)).toBe(0.5);
	});
});

describe('scrollProgressForTarget (start center → end end)', () => {
	it('returns 0 when target start meets viewport center', () => {
		expect(
			scrollProgressForTarget({
				targetTop: 400,
				targetHeight: 2800,
				viewportHeight: 800,
			}),
		).toBe(0);
	});

	it('returns 1 when target end meets viewport end', () => {
		expect(
			scrollProgressForTarget({
				targetTop: 800 - 2800,
				targetHeight: 2800,
				viewportHeight: 800,
			}),
		).toBe(1);
	});
});
