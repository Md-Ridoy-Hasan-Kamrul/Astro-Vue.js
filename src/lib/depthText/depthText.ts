/** Pure DepthText math. Vue port of the React Bits component — no React runtime. */

export const MAX_LAYERS = 64;

export const DEPTH_TEXT_DEFAULTS = {
	text: 'Elevate',
	layers: 34,
	depth: 2.4,
	faceColor: '#f8fafc',
	depthColor: '#7c3aed',
	tilt: 7.5,
	pointerTracking: true,
	smoothing: 0.14,
	perspective: 900,
	autoOrbit: true,
	orbitSpeed: 0.35,
	fontSize: 'clamp(3rem, 12vw, 7rem)',
	fontWeight: 900,
	shadow: true,
} as const;

const LAYER_MIN = 2;
const DEPTH_MAX = 12;
const TILT_MAX = 12;
const SMOOTHING_MIN = 0.02;
const SMOOTHING_MAX = 0.35;
const PERSPECTIVE_MIN = 300;
const PERSPECTIVE_MAX = 2000;
const ORBIT_SPEED_MAX = 2;
const BASE_TILT_X = 0.32;
const BASE_TILT_Y = 0.42;
const FACE_MIX_SPAN = 72;
const FACE_MIX_FLOOR = 4;
const ROTATION_DECIMALS = 3;

export type DepthRotation = { x: number; y: number };

export type DepthLayer = { index: number; color: string; transform: string };

export type DepthTextInput = {
	layers?: number;
	depth?: number;
	tilt?: number;
	smoothing?: number;
	perspective?: number;
	orbitSpeed?: number;
};

export type ResolvedDepthText = {
	layers: number;
	depth: number;
	tilt: number;
	smoothing: number;
	perspective: number;
	orbitSpeed: number;
	baseRotation: DepthRotation;
};

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function getLayerColor(faceColor: string, depthColor: string, index: number, total: number): string {
	const progress = total <= 1 ? 1 : index / total;
	const eased = progress * progress;
	const faceMix = Math.round((1 - eased) * FACE_MIX_SPAN + FACE_MIX_FLOOR);
	return `color-mix(in srgb, ${faceColor} ${faceMix}%, ${depthColor})`;
}

export function getTransform(rotateX: number, rotateY: number): string {
	return `rotateX(${rotateX.toFixed(ROTATION_DECIMALS)}deg) rotateY(${rotateY.toFixed(ROTATION_DECIMALS)}deg)`;
}

export function depthShadow(depthColor: string, enabled: boolean): string {
	if (!enabled) return 'none';
	return `0 22px 34px color-mix(in srgb, ${depthColor} 36%, transparent), 0 4px 8px rgba(0, 0, 0, 0.28)`;
}

export function depthLayers(count: number, depth: number, faceColor: string, depthColor: string): DepthLayer[] {
	return Array.from({ length: count }, (_, layerIndex) => {
		const index = count - layerIndex;
		return {
			index,
			color: getLayerColor(faceColor, depthColor, index, count),
			transform: `translateZ(${-index * depth}px)`,
		};
	});
}

export function resolveDepthText(input: DepthTextInput): ResolvedDepthText {
	const layers = clamp(
		Math.round(Number(input.layers ?? DEPTH_TEXT_DEFAULTS.layers) || 1),
		LAYER_MIN,
		MAX_LAYERS,
	);
	const tilt = clamp(Number(input.tilt ?? DEPTH_TEXT_DEFAULTS.tilt) || 0, 0, TILT_MAX);
	return {
		layers,
		depth: clamp(Number(input.depth ?? DEPTH_TEXT_DEFAULTS.depth) || 0, 0, DEPTH_MAX),
		tilt,
		smoothing: clamp(
			Number(input.smoothing ?? DEPTH_TEXT_DEFAULTS.smoothing) || DEPTH_TEXT_DEFAULTS.smoothing,
			SMOOTHING_MIN,
			SMOOTHING_MAX,
		),
		perspective: clamp(
			Number(input.perspective ?? DEPTH_TEXT_DEFAULTS.perspective) || DEPTH_TEXT_DEFAULTS.perspective,
			PERSPECTIVE_MIN,
			PERSPECTIVE_MAX,
		),
		orbitSpeed: clamp(Number(input.orbitSpeed ?? DEPTH_TEXT_DEFAULTS.orbitSpeed) || 0, 0, ORBIT_SPEED_MAX),
		baseRotation: { x: -tilt * BASE_TILT_X, y: tilt * BASE_TILT_Y },
	};
}
