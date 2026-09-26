/**
 * Hero → partner page transition: circle opens, plane L→center→flies off.
 * Circle stays open (no shrink). Next section rises as the track ends.
 */

export const SCROLL_TRACK_VH = 200;

/** Local jet asset for the fly-across. */
export const FLY_IMAGE_PATH = '/transition/jet.webp';

/** Spec fallback when the primary asset fails to load. */
export const FALLBACK_FLY_IMAGE =
	'https://cdn.21st.dev/assets/mirror/1f/1fc1cc87bf58406056e825358749e9cd26c0b98170fd8b786dccf0b71f8192c6.svg';

/** clip-path circle() radius at full open (% of viewport). */
export const CIRCLE_MAX_RADIUS_PERCENT = 78;

/** Progress when the circle finishes opening (then holds open). */
export const CIRCLE_OPEN_END = 0.38;

/** Progress where the plane sits centered. */
export const PLANE_CENTER_PROGRESS = 0.45;

/** Plane X in viewport widths: far left → center → flies fully off right. */
export const PLANE_X_START_VIEWPORTS = -1.15;
export const PLANE_X_END_VIEWPORTS = 1.35;

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

/** Circle radius %: opens once, then stays fully open (no shrink). */
export function circleRadiusPercent(progress: number): number {
	return sampleKeyframes(progress, [
		{ progress: 0, value: 0 },
		{ progress: CIRCLE_OPEN_END, value: CIRCLE_MAX_RADIUS_PERCENT },
		{ progress: 1, value: CIRCLE_MAX_RADIUS_PERCENT },
	]);
}

/** Plane translateX: left → center → flies completely off to the right. */
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

/** Plane visible through the flight; fades only as it exits. */
export function planeOpacity(progress: number): number {
	return sampleKeyframes(progress, [
		{ progress: 0, value: 0 },
		{ progress: 0.1, value: 1 },
		{ progress: 0.82, value: 1 },
		{ progress: 1, value: 0 },
	]);
}

/**
 * Maps element geometry to 0..1 for offset pair ["start end", "end start"].
 */
export function scrollProgressForTarget(input: {
	targetTop: number;
	targetHeight: number;
	viewportHeight: number;
}): number {
	const { targetTop, targetHeight, viewportHeight } = input;
	const total = targetHeight + viewportHeight;
	if (total <= 0) return 0;
	const travelled = viewportHeight - targetTop;
	return clamp01(travelled / total);
}
