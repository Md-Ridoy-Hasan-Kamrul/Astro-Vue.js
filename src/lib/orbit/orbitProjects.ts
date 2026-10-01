/**
 * Orbit projects — Vue/Astro port of the Framer "OrbitProject" component:
 * https://framer.com/m/OrbitProject-9wzRp1.js@PjYJYM0UOVDHnPEXbdIB
 *
 * Pure math only. The Vue island and composable apply the results.
 * Every constant below is a Framer default for this component.
 */
import { productCatalog } from '../showcase/products';

export type Viewport = { width: number; height: number };

export type OrbitItem = { id: string; src: string; label: string };

export type StageGeometry = {
	columns: number;
	rows: number;
	gridWidth: number;
	gridHeight: number;
	cardWidth: number;
	cardHeight: number;
	arcCardWidth: number;
	arcCardHeight: number;
	curveWidth: number;
	curveHeight: number;
	depth: number;
};

export type CardPose = {
	x: number;
	y: number;
	z: number;
	width: number;
	height: number;
	rotateY: number;
	rotateZ: number;
	scale: number;
};

export type CardFrame = CardPose & {
	opacity: number;
	zIndex: number;
	flattened: number;
};

export type TitleFrame = {
	opacity: number;
	shift: number;
	leftOffset: number;
	rightOffset: number;
	copyWidth: number;
};

type Span = readonly [start: number, end: number];

export const ORBIT_COPY = {
	leftTitle: 'MOTION',
	rightTitle: 'DESIGN IN',
	centerText: 'Exploring ideas through daily design practice.',
	sectionLabel: 'Motion design projects',
} as const;

export const ORBIT_COLORS = {
	background: '#D4D4D4',
	text: '#242424',
	card: '#E8E8E8',
} as const;

export const ORBIT_LAYOUT = {
	desktopMinPx: 1024,
	mobileMaxPx: 640,
	scrollLengthVh: 460,
	minStageHeightPx: 600,
	perspectivePx: 1300,
	horizontalPaddingPx: 48,
	minGridWidthPx: 200,
	defaultViewport: { width: 1440, height: 900 } satisfies Viewport,
} as const;

export const ORBIT_SCROLL = {
	startOffset: 0.55,
	smoothness: 7,
	maxFrameSeconds: 0.064,
	settleEpsilon: 1e-4,
} as const;

export const ORBIT_GRID = {
	columns: 3,
	gapPx: 16,
	maxWidthPx: 1160,
	positionY: 0.52,
	minCardWidthPx: 90,
} as const;

export const ORBIT_CARD = {
	aspect: 1.48,
	radiusPx: 8,
	renderQuality: 2,
	depthScaleMin: 0.82,
	depthOpacityMin: 0.2,
} as const;

export const ORBIT_ARC = {
	cardWidthPx: 410,
	cardWidthRatio: 0.28,
	curveWidthPx: 570,
	curveWidthRatio: 0.44,
	curveHeightPx: 210,
	curveHeightRatio: 0.3,
	depthPx: 520,
	depthRatio: 0.42,
	rotationDeg: 310,
	offsetYPx: -40,
	startAngleDeg: -125,
	heightPhaseRad: 0.65,
	dropRatio: 0.025,
	tiltYDeg: 62,
	tiltZDeg: 8,
	entranceDropRatio: 0.48,
} as const;

/** Tablet / mobile grid (below 1024px). */
export const ORBIT_COMPACT = {
	paddingYPx: 72,
	paddingXPx: 24,
	headerGapPx: 56,
	copyGapPx: 28,
	gridGapPx: 14,
	titleSizePx: 72,
	/** Below 480px the 72px title would overflow, so it follows the width. */
	titleFitVw: 15,
} as const;

export const ORBIT_TITLE = {
	sizePx: 144,
	/** Below 1440px the 144px title follows the width so it never clips. */
	fitVw: 10,
	enterShiftPx: 28,
	outsideRatio: 0.7,
	centerTextWidthPx: 220,
	centerTextMaxRatio: 0.5,
	centerGapPx: 32,
	leftTopPercent: 56,
	rightTopPercent: 39,
} as const;

export const ORBIT_TIMING = {
	titleEnter: [0, 0.2],
	titleExit: [0.74, 0.94],
	reveal: [0, 0.17],
	orbit: [0.05, 0.7],
	copyIn: [0.12, 0.25],
	copyOut: [0.58, 0.82],
	cardRevealStart: 0.025,
	cardRevealStartStep: 0.01,
	cardRevealEnd: 0.18,
	cardRevealEndStep: 0.012,
	flattenStart: 0.56,
	flattenEnd: 0.91,
	flattenStep: 0.009,
	flattenCap: 0.99,
	gridStackAt: 0.86,
} as const satisfies Record<string, Span | number>;

const STACK = { base: 100, depthRange: 800 } as const;

const SHADOW = {
	offsetPx: 18,
	blurPx: 50,
	alpha: 0.12,
	flatStrength: 0.4,
	compactStrength: 0.3,
} as const;

/** Ken Perlin's smootherstep polynomial: 6t^5 - 15t^4 + 10t^3. */
const SMOOTHERSTEP = { quintic: 6, quartic: 15, cubic: 10 } as const;
/** Compact cards are not scaled in 3D, so they render at native size. */
const NATIVE_QUALITY = 1;
const DEG_TO_RAD = Math.PI / 180;
const FULL_TURN_DEG = 360;
const MS_PER_SECOND = 1000;
const PX_DECIMALS = 2;
const ALPHA_DECIMALS = 3;

/** Product ids picked from the catalog for the six orbit cards. */
const ORBIT_PRODUCT_IDS = ['2', '4', '11', '13', '17', '27'] as const;

export const ORBIT_ITEMS: readonly OrbitItem[] = ORBIT_PRODUCT_IDS.map((id) => ({
	id,
	src: `/orbit/${id}.webp`,
	label: productCatalog.find((product) => product.id === id)?.title ?? `Project ${id}`,
}));

/** Intrinsic size of the /orbit/*.webp files (4:3), so img tags reserve space. */
export const ORBIT_IMAGE = { widthPx: 1600, heightPx: 1200 } as const;

export const ORBIT_MEDIA_QUERY = `(min-width: ${ORBIT_LAYOUT.desktopMinPx}px)`;

export function clamp(value: number, minimum = 0, maximum = 1): number {
	return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(from: number, to: number, progress: number): number {
	return from + (to - from) * progress;
}

export function smootherstep(start: number, end: number, value: number): number {
	if (start === end) return value < start ? 0 : 1;
	const t = clamp((value - start) / (end - start));
	return t * t * t * (t * (t * SMOOTHERSTEP.quintic - SMOOTHERSTEP.quartic) + SMOOTHERSTEP.cubic);
}

function ease(span: Span, progress: number): number {
	return smootherstep(span[0], span[1], progress);
}

function round(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

export function isCompactWidth(width: number): boolean {
	return width < ORBIT_LAYOUT.desktopMinPx;
}

export function isMobileWidth(width: number): boolean {
	return width < ORBIT_LAYOUT.mobileMaxPx;
}

/** 0 when the section top reaches 55% of the viewport, 1 when the sticky track ends. */
export function scrollTargetProgress(rect: { top: number; height: number; viewportHeight: number }): number {
	const entryLead = rect.viewportHeight * ORBIT_SCROLL.startOffset;
	const travel = Math.max(rect.height - rect.viewportHeight, 1);
	return clamp((entryLead - rect.top) / travel);
}

export function frameSeconds(now: number, previous: number): number {
	return clamp((now - previous) / MS_PER_SECOND, 0, ORBIT_SCROLL.maxFrameSeconds);
}

/** Exponential follow toward the scroll target, frame-rate independent. */
export function dampProgress(current: number, target: number, deltaSeconds: number): number {
	const seconds = clamp(deltaSeconds, 0, ORBIT_SCROLL.maxFrameSeconds);
	const next = current + (target - current) * (1 - Math.exp(-ORBIT_SCROLL.smoothness * seconds));
	return Math.abs(target - next) < ORBIT_SCROLL.settleEpsilon ? target : next;
}

export function isSettled(current: number, target: number): boolean {
	return current === target;
}

export function titleFrame(progress: number, viewportWidth: number): TitleFrame {
	const enter = ease(ORBIT_TIMING.titleEnter, progress);
	const exit = ease(ORBIT_TIMING.titleExit, progress);
	const copyWidth = Math.min(ORBIT_TITLE.centerTextWidthPx, viewportWidth * ORBIT_TITLE.centerTextMaxRatio);
	const parked = (copyWidth + ORBIT_TITLE.centerGapPx) / 2;
	const offset = lerp(viewportWidth * ORBIT_TITLE.outsideRatio, parked, enter);
	return {
		opacity: enter * (1 - exit),
		shift: lerp(ORBIT_TITLE.enterShiftPx, 0, enter),
		leftOffset: offset,
		rightOffset: offset,
		copyWidth,
	};
}

export function centerCopyOpacity(progress: number): number {
	return ease(ORBIT_TIMING.copyIn, progress) * (1 - ease(ORBIT_TIMING.copyOut, progress));
}

function gridGeometry(viewport: Viewport, count: number) {
	const columns = Math.min(ORBIT_GRID.columns, Math.max(count, 1));
	const rows = Math.ceil(count / columns);
	const available = Math.max(viewport.width - ORBIT_LAYOUT.horizontalPaddingPx * 2, ORBIT_LAYOUT.minGridWidthPx);
	const gridWidth = Math.min(ORBIT_GRID.maxWidthPx, available);
	const cardWidth = Math.max(ORBIT_GRID.minCardWidthPx, (gridWidth - ORBIT_GRID.gapPx * (columns - 1)) / columns);
	const cardHeight = cardWidth / ORBIT_CARD.aspect;
	const gridHeight = rows * cardHeight + Math.max(rows - 1, 0) * ORBIT_GRID.gapPx;
	return { columns, rows, gridWidth, gridHeight, cardWidth, cardHeight };
}

function arcGeometry(viewport: Viewport) {
	const arcCardWidth = Math.min(ORBIT_ARC.cardWidthPx, viewport.width * ORBIT_ARC.cardWidthRatio);
	return {
		arcCardWidth,
		arcCardHeight: arcCardWidth / ORBIT_CARD.aspect,
		curveWidth: Math.min(ORBIT_ARC.curveWidthPx, viewport.width * ORBIT_ARC.curveWidthRatio),
		curveHeight: Math.min(ORBIT_ARC.curveHeightPx, viewport.height * ORBIT_ARC.curveHeightRatio),
		depth: Math.min(ORBIT_ARC.depthPx, viewport.width * ORBIT_ARC.depthRatio),
	};
}

export function stageGeometry(viewport: Viewport, count: number): StageGeometry {
	return { ...gridGeometry(viewport, count), ...arcGeometry(viewport) };
}

function cardReveal(index: number, progress: number): number {
	const start = ORBIT_TIMING.cardRevealStart + index * ORBIT_TIMING.cardRevealStartStep;
	const end = ORBIT_TIMING.cardRevealEnd + index * ORBIT_TIMING.cardRevealEndStep;
	return smootherstep(start, end, progress);
}

function cardFlatten(index: number, progress: number): number {
	const start = ORBIT_TIMING.flattenStart + index * ORBIT_TIMING.flattenStep;
	const end = Math.min(ORBIT_TIMING.flattenEnd + index * ORBIT_TIMING.flattenStep, ORBIT_TIMING.flattenCap);
	return smootherstep(start, end, progress);
}

function orbitAngle(index: number, count: number, progress: number): number {
	const base = (index / Math.max(count, 1)) * FULL_TURN_DEG + ORBIT_ARC.startAngleDeg;
	return (base + ease(ORBIT_TIMING.orbit, progress) * ORBIT_ARC.rotationDeg) * DEG_TO_RAD;
}

/** 0 at the back of the ring, 1 at the front. */
function depthRatio(z: number, depth: number): number {
	return clamp((z + depth) / Math.max(depth * 2, 1));
}

function arcPose(radians: number, reveal: number, viewport: Viewport, geometry: StageGeometry): CardPose {
	const centerX = Math.sin(radians) * geometry.curveWidth;
	const centerY =
		Math.cos(radians + ORBIT_ARC.heightPhaseRad) * geometry.curveHeight -
		viewport.height * ORBIT_ARC.dropRatio +
		ORBIT_ARC.offsetYPx;
	const z = Math.cos(radians) * geometry.depth;
	const entrance = (1 - reveal) * viewport.height * ORBIT_ARC.entranceDropRatio;
	return {
		x: centerX - geometry.arcCardWidth / 2,
		y: centerY - geometry.arcCardHeight / 2 + entrance,
		z,
		width: geometry.arcCardWidth,
		height: geometry.arcCardHeight,
		rotateY: -Math.sin(radians) * ORBIT_ARC.tiltYDeg,
		rotateZ: -Math.sin(radians) * ORBIT_ARC.tiltZDeg,
		scale: lerp(ORBIT_CARD.depthScaleMin, 1, depthRatio(z, geometry.depth)),
	};
}

function gridPose(index: number, viewport: Viewport, geometry: StageGeometry): CardPose {
	const column = index % geometry.columns;
	const row = Math.floor(index / geometry.columns);
	return {
		x: -geometry.gridWidth / 2 + column * (geometry.cardWidth + ORBIT_GRID.gapPx),
		y:
			viewport.height * ORBIT_GRID.positionY -
			viewport.height / 2 -
			geometry.gridHeight / 2 +
			row * (geometry.cardHeight + ORBIT_GRID.gapPx),
		z: 0,
		width: geometry.cardWidth,
		height: geometry.cardHeight,
		rotateY: 0,
		rotateZ: 0,
		scale: 1,
	};
}

function blendPose(from: CardPose, to: CardPose, t: number): CardPose {
	return {
		x: lerp(from.x, to.x, t),
		y: lerp(from.y, to.y, t),
		z: lerp(from.z, to.z, t),
		width: lerp(from.width, to.width, t),
		height: lerp(from.height, to.height, t),
		rotateY: lerp(from.rotateY, to.rotateY, t),
		rotateZ: lerp(from.rotateZ, to.rotateZ, t),
		scale: lerp(from.scale, to.scale, t),
	};
}

function cardOpacity(depth: number, reveal: number, progress: number, flattened: number): number {
	const arcOpacity = lerp(ORBIT_CARD.depthOpacityMin, 1, depth);
	return clamp(lerp(arcOpacity * reveal * ease(ORBIT_TIMING.reveal, progress), 1, flattened));
}

function cardStack(index: number, depth: number, flattened: number): number {
	if (flattened > ORBIT_TIMING.gridStackAt) return STACK.base + index;
	return Math.round(STACK.base + depth * STACK.depthRange);
}

export function cardFrame(
	index: number,
	count: number,
	progress: number,
	viewport: Viewport,
	geometry: StageGeometry,
): CardFrame {
	const reveal = cardReveal(index, progress);
	const flattened = cardFlatten(index, progress);
	const arc = arcPose(orbitAngle(index, count, progress), reveal, viewport, geometry);
	const depth = depthRatio(arc.z, geometry.depth);
	return {
		...blendPose(arc, gridPose(index, viewport, geometry), flattened),
		opacity: cardOpacity(depth, reveal, progress, flattened),
		zIndex: cardStack(index, depth, flattened),
		flattened,
	};
}

/**
 * Cards sit in front of the perspective plane, so the browser would upscale
 * their texture. Render them larger and scale back to keep images sharp.
 */
export function cardRenderBox(pose: Pick<CardPose, 'x' | 'y' | 'width' | 'height' | 'scale'>) {
	const quality = ORBIT_CARD.renderQuality;
	const width = pose.width * quality;
	const height = pose.height * quality;
	return {
		x: pose.x - (width - pose.width) / 2,
		y: pose.y - (height - pose.height) / 2,
		width,
		height,
		scale: pose.scale / quality,
		radius: ORBIT_CARD.radiusPx * quality,
	};
}

export function cardTransform(pose: Pick<CardPose, 'x' | 'y' | 'z' | 'rotateY' | 'rotateZ' | 'scale'>): string {
	return `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateY(${pose.rotateY}deg) rotateZ(${pose.rotateZ}deg) scale(${pose.scale})`;
}

function shadow(strength: number, quality: number): string {
	const offset = round(SHADOW.offsetPx * strength * quality, PX_DECIMALS);
	const blur = round(SHADOW.blurPx * strength * quality, PX_DECIMALS);
	const alpha = round(SHADOW.alpha * strength, ALPHA_DECIMALS);
	return `0 ${offset}px ${blur}px rgba(0, 0, 0, ${alpha})`;
}

export function cardShadow(flattened: number): string {
	return shadow(lerp(1, SHADOW.flatStrength, flattened), ORBIT_CARD.renderQuality);
}

export function compactCardShadow(): string {
	return shadow(SHADOW.compactStrength, NATIVE_QUALITY);
}

/** CSS custom properties for the section, so styles reuse the constants above. */
export function orbitCssVars(): string {
	const vars: Record<string, string> = {
		'--orbit-bg': ORBIT_COLORS.background,
		'--orbit-ink': ORBIT_COLORS.text,
		'--orbit-card': ORBIT_COLORS.card,
		'--orbit-card-radius': `${ORBIT_CARD.radiusPx}px`,
		'--orbit-card-aspect': String(ORBIT_CARD.aspect),
		'--orbit-card-shadow': compactCardShadow(),
		'--orbit-pad-y': `${ORBIT_COMPACT.paddingYPx}px`,
		'--orbit-pad-x': `${ORBIT_COMPACT.paddingXPx}px`,
		'--orbit-header-gap': `${ORBIT_COMPACT.headerGapPx}px`,
		'--orbit-copy-gap': `${ORBIT_COMPACT.copyGapPx}px`,
		'--orbit-grid-gap': `${ORBIT_COMPACT.gridGapPx}px`,
		'--orbit-compact-title': `min(${ORBIT_COMPACT.titleSizePx}px, ${ORBIT_COMPACT.titleFitVw}vw)`,
		'--orbit-desktop-title': `min(${ORBIT_TITLE.sizePx}px, ${ORBIT_TITLE.fitVw}vw)`,
		'--orbit-copy-width': `${ORBIT_TITLE.centerTextWidthPx}px`,
	};
	return Object.entries(vars)
		.map(([name, value]) => `${name}: ${value};`)
		.join(' ');
}
