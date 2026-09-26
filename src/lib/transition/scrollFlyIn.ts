/**
 * Hero → partner scroll reveal — Vue port of ContainerInset + plane pass.
 * Inset opens (circle-like → full); never shrinks. Plane flies off; partner rises.
 */

export const SCROLL_TRACK_VH = 350;

export const FLY_IMAGE_PATH = '/transition/jet.webp';

export const FALLBACK_FLY_IMAGE =
	'https://cdn.21st.dev/assets/mirror/1f/1fc1cc87bf58406056e825358749e9cd26c0b98170fd8b786dccf0b71f8192c6.svg';

/** ContainerInset defaults from animated-video-on-scroll. */
export const INSET_PROGRESS_END = 0.8;
export const INSET_Y_START = 45;
export const INSET_Y_END = 0;
export const INSET_X_START = 45;
export const INSET_X_END = 0;
export const ROUND_START_PX = 1000;
export const ROUND_END_PX = 16;

/** Partner content rises into center (ContainerAnimated-style). */
export const CONTENT_Y_PROGRESS_START = 0.2;
export const CONTENT_Y_PROGRESS_END = 0.8;
export const CONTENT_Y_START_PX = 80;
export const CONTENT_Y_END_PX = 0;

/** Plane: left → center while inset opens → fully off right. */
export const PLANE_CENTER_PROGRESS = 0.42;
export const PLANE_X_START_VIEWPORTS = -1.2;
export const PLANE_X_END_VIEWPORTS = 1.4;

export type ProgressKeyframe = { readonly progress: number; readonly value: number };

export function clamp01(value: number): number {
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

export function interpolate(
	progress: number,
	fromProgress: number,
	toProgress: number,
	fromValue: number,
	toValue: number,
): number {
	if (progress <= fromProgress) return fromValue;
	if (progress >= toProgress) return toValue;
	const span = toProgress - fromProgress;
	if (span === 0) return toValue;
	const t = (progress - fromProgress) / span;
	return fromValue + (toValue - fromValue) * t;
}

export function sampleKeyframes(progress: number, frames: readonly ProgressKeyframe[]): number {
	if (frames.length === 0) return 0;
	if (progress <= frames[0].progress) return frames[0].value;
	const last = frames[frames.length - 1];
	if (progress >= last.progress) return last.value;

	for (let index = 0; index < frames.length - 1; index += 1) {
		const current = frames[index];
		const next = frames[index + 1];
		if (progress >= current.progress && progress <= next.progress) {
			return interpolate(
				progress,
				current.progress,
				next.progress,
				current.value,
				next.value,
			);
		}
	}

	return last.value;
}

export function insetYPercent(progress: number): number {
	return interpolate(progress, 0, INSET_PROGRESS_END, INSET_Y_START, INSET_Y_END);
}

export function insetXPercent(progress: number): number {
	return interpolate(progress, 0, INSET_PROGRESS_END, INSET_X_START, INSET_X_END);
}

export function insetRoundPx(progress: number): number {
	return interpolate(progress, 0, 1, ROUND_START_PX, ROUND_END_PX);
}

/** CSS clip-path matching ContainerInset (opens only — never shrinks). */
export function insetClipPath(progress: number): string {
	const y = insetYPercent(progress);
	const x = insetXPercent(progress);
	const round = insetRoundPx(progress);
	return `inset(${y}% ${x}% ${y}% ${x}% round ${round}px)`;
}

export function contentTranslateYPx(progress: number): number {
	return interpolate(
		progress,
		CONTENT_Y_PROGRESS_START,
		CONTENT_Y_PROGRESS_END,
		CONTENT_Y_START_PX,
		CONTENT_Y_END_PX,
	);
}

export function planeTranslateXPx(progress: number, screenWidth: number): number {
	if (progress <= PLANE_CENTER_PROGRESS) {
		return interpolate(
			progress,
			0,
			PLANE_CENTER_PROGRESS,
			PLANE_X_START_VIEWPORTS * screenWidth,
			0,
		);
	}
	return interpolate(
		progress,
		PLANE_CENTER_PROGRESS,
		1,
		0,
		PLANE_X_END_VIEWPORTS * screenWidth,
	);
}

export function planeOpacity(progress: number): number {
	return sampleKeyframes(progress, [
		{ progress: 0, value: 0 },
		{ progress: 0.08, value: 1 },
		{ progress: 0.88, value: 1 },
		{ progress: 1, value: 0 },
	]);
}

/**
 * Progress for offset ["start center", "end end"] (ContainerScroll reference).
 */
export function scrollProgressForTarget(input: {
	targetTop: number;
	targetHeight: number;
	viewportHeight: number;
}): number {
	const { targetTop, targetHeight, viewportHeight } = input;
	const startTop = viewportHeight / 2;
	const endTop = viewportHeight - targetHeight;
	const span = startTop - endTop;
	if (span <= 0) return clamp01((startTop - targetTop) / Math.max(targetHeight, 1));
	return clamp01((startTop - targetTop) / span);
}
