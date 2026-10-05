/**
 * FlipCard math: spring, flip snapping, drag, tilt, glare and shadow.
 * Pure functions only; useFlipCard applies them to the DOM.
 */
export type FlipAxis = 'x' | 'y';

export type SpringState = { value: number; velocity: number };

export type SpringConfig = { stiffness: number; damping: number };

export type Ratio = { x: number; y: number };

export const FLIP_CARD_DEFAULTS = {
	axis: 'y' as FlipAxis,
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
	pixelScale: 1,
} as const;

export const HALF_TURN_DEG = 180;
/** Pointer travel below this still counts as a click, not a drag. */
export const TAP_SLOP_PX = 4;

/** Longest step the spring integrates at once; keeps it stable after a hitch. */
const MAX_FRAME_SECONDS = 0.064;
const SETTLE_EPSILON = 0.05;
const SHADOW = { offsetYPx: 24, blurPx: 60 } as const;
const PERCENT = 100;
const HEX_RADIX = 16;
const SHORT_HEX_LENGTH = 3;

export function clamp(value: number, minimum = 0, maximum = 1): number {
	return Math.min(Math.max(value, minimum), maximum);
}

/** One semi-implicit Euler step of a damped spring (mass 1). */
export function springStep(state: SpringState, target: number, deltaSeconds: number, config: SpringConfig): SpringState {
	const seconds = clamp(deltaSeconds, 0, MAX_FRAME_SECONDS);
	const force = config.stiffness * (target - state.value) - config.damping * state.velocity;
	const velocity = state.velocity + force * seconds;
	return { value: state.value + velocity * seconds, velocity };
}

export function isSpringSettled(state: SpringState, target: number): boolean {
	return Math.abs(target - state.value) < SETTLE_EPSILON && Math.abs(state.velocity) < SETTLE_EPSILON;
}

export function snapRotation(rotation: number): number {
	return Math.round(rotation / HALF_TURN_DEG) * HALF_TURN_DEG + 0;
}

export function isFlipped(rotation: number): boolean {
	return Math.abs(Math.round(rotation / HALF_TURN_DEG)) % 2 === 1;
}

/** Dragging one full card size turns the card half a revolution. */
export function dragRotation(startRotation: number, deltaPx: number, sizePx: number, axis: FlipAxis): number {
	const turn = (deltaPx / Math.max(sizePx, 1)) * HALF_TURN_DEG;
	return axis === 'y' ? startRotation + turn : startRotation - turn;
}

export function flipTransform(axis: FlipAxis, rotation: number): string {
	return `${axis === 'y' ? 'rotateY' : 'rotateX'}(${rotation}deg)`;
}

/** Pointer position inside a rect as 0–1 ratios, clamped to the card. */
export function pointerRatio(clientX: number, clientY: number, rect: DOMRectReadOnly): Ratio {
	return {
		x: clamp((clientX - rect.left) / Math.max(rect.width, 1)),
		y: clamp((clientY - rect.top) / Math.max(rect.height, 1)),
	};
}

/** Lean toward the pointer: right edge turns +Y, top edge turns +X. */
export function tiltAngles(x: number, y: number, tiltMax: number) {
	const centered = { x: clamp(x) * 2 - 1, y: 1 - clamp(y) * 2 };
	return { rotateX: centered.y * tiltMax + 0, rotateY: centered.x * tiltMax + 0 };
}

export function glarePosition(x: number, y: number): Ratio {
	return { x: Math.round(clamp(x) * PERCENT), y: Math.round(clamp(y) * PERCENT) };
}

/** Glare fades out at this share of the gradient radius. */
const GLARE_FALLOFF_PERCENT = 60;

export function glareBackground(position: Ratio, opacity: number): string {
	return `radial-gradient(circle at ${position.x}% ${position.y}%, rgba(255, 255, 255, ${opacity}), transparent ${GLARE_FALLOFF_PERCENT}%)`;
}

export function hexToRgba(hex: string, alpha: number): string {
	const digits = hex.replace('#', '');
	const full = digits.length === SHORT_HEX_LENGTH ? [...digits].map((digit) => digit + digit).join('') : digits;
	const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), HEX_RADIX));
	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function flipShadow(color: string, opacity: number, pixelScale: number): string {
	return `0 ${SHADOW.offsetYPx * pixelScale}px ${SHADOW.blurPx * pixelScale}px ${hexToRgba(color, opacity)}`;
}

export function cssSize(size: number | undefined): string {
	return size === undefined ? '100%' : `${size}px`;
}
