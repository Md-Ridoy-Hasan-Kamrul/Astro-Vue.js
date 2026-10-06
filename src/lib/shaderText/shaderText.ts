/**
 * Pure Shader Text helpers. Vue port of the Framer TextShader mask + presets.
 * The canvas fill is clipped to these glyph lines; no WebGL lives here.
 */

export const SHADER_PRESETS = ['Plasma', 'Aurora', 'Ember', 'Tide'] as const;

export type ShaderPreset = (typeof SHADER_PRESETS)[number];

export type ShaderTextMotion = {
	speed: number;
	scale: number;
	softness: number;
	resolutionScale: number;
};

export type WrappedLine = {
	text: string;
	/** Distance from the host top edge to the line box top, in CSS pixels. */
	top: number;
	height: number;
};

export type TextMaskInput = {
	width: number;
	height: number;
	fontFamily: string;
	fontSizePx: number;
	fontWeight: string;
	letterSpacing: string;
	lines: WrappedLine[];
};

const SPEED_MAX = 4;
const SCALE_MIN = 0.2;
const SCALE_MAX = 12;
const RESOLUTION_MIN = 0.25;
const RESOLUTION_MAX = 1;
const LINE_BREAK_PX = 1;

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uScale;
uniform float uSoftness;
uniform float uPreset;
varying vec2 vUv;

vec3 palettePlasma(float t) {
	return vec3(0.08, 0.28, 0.32) + vec3(0.35, 0.45, 0.28) * cos(6.28318 * (vec3(1.0, 0.85, 0.55) * t + vec3(0.10, 0.25, 0.45)));
}

vec3 paletteAurora(float t) {
	return vec3(0.05, 0.22, 0.28) + vec3(0.25, 0.55, 0.40) * cos(6.28318 * (vec3(0.70, 1.0, 0.80) * t + vec3(0.20, 0.45, 0.35)));
}

vec3 paletteEmber(float t) {
	return vec3(0.32, 0.12, 0.06) + vec3(0.45, 0.28, 0.12) * cos(6.28318 * (vec3(1.0, 0.72, 0.40) * t + vec3(0.00, 0.18, 0.42)));
}

vec3 paletteTide(float t) {
	return vec3(0.04, 0.16, 0.28) + vec3(0.20, 0.35, 0.55) * cos(6.28318 * (vec3(0.65, 0.80, 1.0) * t + vec3(0.35, 0.20, 0.10)));
}

float field(vec2 uv, float time) {
	float v = 0.0;
	v += sin(uv.x * 1.4 + time);
	v += sin(uv.y * 1.7 - time * 0.8);
	v += sin((uv.x + uv.y) * 1.1 + time * 0.6);
	v += sin(length(uv) * 1.6 - time);
	return v * 0.25;
}

void main() {
	float aspect = uResolution.x / max(uResolution.y, 1.0);
	vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0) * uScale;
	float soft = clamp(uSoftness, 0.0, 1.0);
	float sharp = field(uv, uTime);
	float broad = field(uv * (1.0 - soft * 0.65), uTime);
	float t = mix(sharp, broad, soft) * 0.5 + 0.5;
	vec3 color = palettePlasma(t);
	if (uPreset > 2.5) color = paletteTide(t);
	else if (uPreset > 1.5) color = paletteEmber(t);
	else if (uPreset > 0.5) color = paletteAurora(t);
	gl_FragColor = vec4(color, 1.0);
}
`;

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function finite(value: number | undefined, fallback: number): number {
	const next = Number(value);
	return Number.isFinite(next) ? next : fallback;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function px(value: number): string {
	return (Math.round(value * 100) / 100).toString();
}

export function shaderPresetIndex(preset: string): number {
	const index = SHADER_PRESETS.indexOf(preset as ShaderPreset);
	return index < 0 ? 0 : index;
}

export function resolveShaderMotion(input: Partial<ShaderTextMotion> = {}): ShaderTextMotion {
	return {
		speed: clamp(finite(input.speed, 1), 0, SPEED_MAX),
		scale: clamp(finite(input.scale, 3), SCALE_MIN, SCALE_MAX),
		softness: clamp(finite(input.softness, 0.35), 0, 1),
		resolutionScale: clamp(finite(input.resolutionScale, 0.75), RESOLUTION_MIN, RESOLUTION_MAX),
	};
}

export function measureWrappedLines(el: HTMLElement): WrappedLine[] {
	const node = el.firstChild;
	if (!node || node.nodeType !== Node.TEXT_NODE) return [];
	const text = node.textContent ?? '';
	if (!text.trim() || typeof document === 'undefined') return [];

	const range = document.createRange();
	const hostTop = el.getBoundingClientRect().top;
	const lines: WrappedLine[] = [];
	let start = 0;
	let lineTop = 0;
	let lineHeight = 0;
	let open = false;

	const push = (end: number) => {
		const slice = text.slice(start, end).trim();
		if (!slice) return;
		lines.push({ text: slice, top: lineTop, height: lineHeight });
	};

	for (let index = 0; index < text.length; index += 1) {
		range.setStart(node, index);
		range.setEnd(node, index + 1);
		const rect = range.getClientRects()[0];
		if (!rect || rect.height === 0) continue;
		const top = rect.top - hostTop;
		if (!open) {
			open = true;
			start = index;
			lineTop = top;
			lineHeight = rect.height;
			continue;
		}
		if (top > lineTop + LINE_BREAK_PX) {
			push(index);
			start = index;
			lineTop = top;
			lineHeight = rect.height;
			continue;
		}
		lineHeight = Math.max(lineHeight, rect.height);
	}

	if (open) push(text.length);
	return lines;
}

export function makeTextMaskSVG(input: TextMaskInput): string {
	const width = Math.max(1, Math.round(input.width));
	const height = Math.max(1, Math.round(input.height));
	const letterSpacing = input.letterSpacing === 'normal' ? '0' : input.letterSpacing;
	const tspans = input.lines
		.map((line) => {
			return `<tspan x="0" y="${px(line.top)}" dominant-baseline="text-before-edge">${escapeXml(line.text)}</tspan>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text fill="#ffffff" font-family="${escapeXml(input.fontFamily)}" font-size="${px(input.fontSizePx)}" font-weight="${escapeXml(input.fontWeight)}" letter-spacing="${escapeXml(letterSpacing)}">${tspans}</text></svg>`;
}

export function encodeSvgDataUrl(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
