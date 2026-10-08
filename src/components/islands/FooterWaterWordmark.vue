<script setup lang="ts">
/**
 * Wordmark and water from Interactive Footer 6.
 * The letters stay real text. Below the waterline a WebGL pass refracts the
 * same letters through a wave field: a simulated height-field (pointer wake,
 * click rings, ambient drops) on top of four analytic swell waves, with a
 * bioluminescent glow where the water moves and a moonlight glint path.
 * Until the GL pass is ready, a CSS mirror of the word stands in.
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

type Metrics = {
	k: number;
	left: number;
	ascent: number;
	descent: number;
	base: number;
	key: string;
};

type WaterState = {
	metrics: Metrics;
	text: string;
	reflection: number;
	waves: number;
	ambient: number;
	moonlight: number;
	glow: number;
	interactive: boolean;
};

const props = withDefaults(
	defineProps<{
		text?: string;
		maxSize?: number;
		color?: string;
		tint?: string;
		glowColor?: string;
		reflection?: number;
		waves?: number;
		ambient?: number;
		glow?: number;
		moonlight?: number;
		interactive?: boolean;
	}>(),
	{
		text: 'Astro Vue',
		maxSize: 720,
		color: '#ECE9DF',
		tint: '#7B9B91',
		glowColor: '#3DE8FF',
		reflection: 72,
		waves: 50,
		ambient: 50,
		glow: 60,
		moonlight: 35,
		interactive: true,
	},
);

const FONT_FAMILY = '"Instrument Serif", "Instrument Serif Placeholder", serif';
const FONT_CSS = `normal 400 {size} ${FONT_FAMILY}`;
const SPACING_EM = -0.02;

// Ink metrics per wordmark, measured in the browser with Instrument Serif loaded,
// so the server render already sits where the hydrated one will.
const KNOWN_METRICS: Record<string, Omit<Metrics, 'key'>> = {
	marée: { k: 0.4961, left: -0.0125, ascent: 0.7406, descent: 0.0094, base: 0.8406 },
	'Astro Vue': { k: 0.3354, left: 0.0187, ascent: 0.7312, descent: 0.0125, base: 0.8406 },
};

const GLOW_STOPS: [number, number][] = [
	[0, 1],
	[14, 0.94],
	[28, 0.8],
	[42, 0.61],
	[56, 0.41],
	[70, 0.22],
	[84, 0.08],
	[100, 0],
];

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uLine;
uniform sampler2D uText; uniform vec2 uTextRes; uniform float uBase; uniform float uSquash;
uniform sampler2D uSim; uniform vec2 uSimTexel; uniform float uSimGain; uniform float uP;
uniform float uTime, uAmb, uWaves, uRefl, uMoon, uGlow, uFs, uMoonX;
uniform vec3 uColor, uTint, uNeon;
float ink(vec2 q){ return texture2D(uText, q / uTextRes).a; }
float bloomAt(vec2 st){ return texture2D(uSim, st).a * 1.5; }
float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 x){
    vec2 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void wave(inout vec2 s, vec2 w, vec2 k, float amp, float speed, float phase, vec2 fpx){
    float lod = clamp(1.0 - length(k * fpx) * 1.8, 0.0, 1.0);
    s += k * (amp * cos(dot(k, w) - uTime * speed + phase) * lod);
}
void main(){
    vec2 c = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
    float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    if (c.y < uLine) {
        // Above the waterline: light from the glowing water catches the base of the letters.
        float dy = uLine - c.y;
        float gx = uSimTexel.x * 2.5;
        float g = (bloomAt(vec2(vUv.x - gx, 0.04)) + 2.0 * bloomAt(vec2(vUv.x, 0.04)) + bloomAt(vec2(vUv.x + gx, 0.04))) * 0.25;
        float idle = 0.05 * (0.8 + 0.2 * sin(uTime * 0.8 + c.x / uFs * 1.7));
        float rim = ink(vec2(c.x, uBase - dy)) * exp(-dy / (uFs * 0.055)) * 0.45;
        float mist = exp(-dy / (uFs * 0.02)) * 0.05;
        float lit = clamp((g + idle) * uGlow * (rim + mist), 0.0, 1.0);
        gl_FragColor = vec4(mix(uNeon, vec3(1.0), 0.1) * lit + dither, clamp(lit * 0.3 + dither, 0.0, 1.0));
        return;
    }
    float hw = max(1.0, uRes.y - uLine);
    vec2 p = vec2(c.x, c.y - uLine);
    float v = clamp(p.y / hw, 0.0, 1.0);
    float z = 2.0 / (v + 0.06);
    vec2 fpx = vec2(z / uFs * 0.5, 2.0 / ((v + 0.06) * (v + 0.06)) / hw);
    vec2 w = vec2((p.x - uMoonX) / uFs * z * 0.5, z);
    vec2 amb = vec2(0.0);
    wave(amb, w, vec2(0.55, 1.7), 0.05, 0.85, 0.0, fpx);
    wave(amb, w, vec2(-1.05, 2.6), 0.034, 1.15, 1.7, fpx);
    wave(amb, w, vec2(1.8, 4.3), 0.021, 1.55, 4.1, fpx);
    wave(amb, w, vec2(-2.9, 7.4), 0.009, 2.1, 2.3, fpx);
    vec2 st = vec2(vUv.x, pow(v, 1.0 / uP));
    vec4 sm = texture2D(uSim, st);
    vec2 simSlope = (sm.rg - 0.5) * uSimGain * uWaves;
    vec2 slope = amb * uAmb + simSlope;
    vec2 disp = vec2(slope.x * 0.07, slope.y * 0.11) * uFs * (0.3 + 0.7 * v);
    float blur = mix(0.6, 5.5, v) + length(slope) * 7.0;
    vec2 q = vec2(p.x + disp.x, uBase - p.y * uSquash + disp.y);
    float a = (ink(q - vec2(0.0, 2.0 * blur)) + 2.0 * ink(q - vec2(0.0, blur)) + 3.0 * ink(q) + 2.0 * ink(q + vec2(0.0, blur)) + ink(q + vec2(0.0, 2.0 * blur))) / 9.0;
    float reflA = a * uRefl * mix(0.62, 0.08, pow(v, 0.55)) * (1.0 - smoothstep(0.5, 0.92, v));
    vec3 reflC = mix(uColor, uTint, 0.28 + 0.4 * v) * 0.92;
    float under = ink(vec2(p.x + disp.x * 0.4, uBase + p.y + disp.y * 0.3)) * 0.32 * (1.0 - smoothstep(0.0, 0.1, v));
    // Bioluminescence: moving water glows, with a soft bloom around the brightest crests.
    float g0 = sm.b * 1.5;
    float gb = sm.a * 1.5;
    float glowRaw = (g0 * 1.55 + gb * 0.6) * uGlow * (1.0 - 0.35 * v);
    float glowI = glowRaw / (1.0 + glowRaw * 0.9);
    float gc = clamp(glowI, 0.0, 1.0);
    vec3 neonC = mix(uNeon, vec3(1.0), smoothstep(0.6, 1.1, g0 * uGlow) * 0.35);
    reflC = mix(reflC, uNeon, gc * 0.35);
    reflA = min(1.0, reflA * (1.0 + gc * 0.4));
    float pp = (p.x - uMoonX) / (uFs * (0.18 + 0.5 * v));
    float path = exp(-pp * pp) * exp(-(v - 0.2) * (v - 0.2) * 6.0);
    float moon = 0.0;
    if (path > 0.004 && uMoon > 0.0) {
        float lodG = clamp(1.0 - fpx.y * 9.0, 0.0, 1.0) * uAmb;
        vec2 fine = vec2(vnoise(w * vec2(6.0, 9.0) + vec2(0.0, -uTime * 1.7)), vnoise(w * vec2(7.0, 11.0) + vec2(3.1, -uTime * 2.1))) - 0.5;
        vec2 dS = slope + fine * 0.16 * lodG - vec2((p.x - uMoonX) / uFs * (1.6 + 1.2 * v), (v - 0.16) * 0.55);
        float glint = exp(-dot(dS, dS) * 460.0);
        moon = uMoon * (glint * 0.36 * smoothstep(90.0, 300.0, uFs) + path * 0.03) * smoothstep(0.0, 0.04, v) * (1.0 - smoothstep(0.55, 0.95, v));
    }
    float hx = (p.x - uMoonX) / (uRes.x * 0.5);
    float sheen = (simSlope.y * 0.9 - simSlope.x * 0.25 + (amb.y * 0.9 - amb.x * 0.25) * uAmb * 0.3) * exp(-hx * hx) * (1.0 - 0.55 * v) * smoothstep(0.0, 0.06, v);
    float lift = clamp(sheen, 0.0, 1.0) * 0.24 * (0.4 + 0.6 * uMoon);
    float shade = clamp(-sheen, 0.0, 1.0) * 0.14;
    float lineI = exp(-p.y * p.y / 2.0) * ink(vec2(p.x, uBase - 1.5)) * (0.16 + 0.08 * uGlow);
    vec3 col = vec3(0.0); float al = shade;
    col = mix(uTint, uNeon, 0.45 * min(1.0, uGlow)) * lift + col; al = al + lift * (1.0 - al);
    col = reflC * reflA + col * (1.0 - reflA); al = reflA + al * (1.0 - reflA);
    col = uTint * 0.8 * under + col * (1.0 - under); al = under + al * (1.0 - under);
    float ga = clamp(glowI * 0.95, 0.0, 0.72);
    col = neonC * ga + col * (1.0 - ga); al = ga + al * (1.0 - ga);
    float mo = clamp(moon, 0.0, 1.0);
    col += uColor * mo; al = al + mo * (1.0 - al);
    col += mix(uColor, uNeon, 0.7 * min(1.0, uGlow)) * lineI; al = al + lineI * (1.0 - al);
    gl_FragColor = vec4(max(col + dither * 1.5, 0.0), clamp(al + dither, 0.0, 1.0));
}`;

function clampNum(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function fallbackMetrics(text: string): Omit<Metrics, 'key'> {
	const count = Math.max(1, Array.from(text).length);
	return { ...KNOWN_METRICS['marée'], k: 1 / (0.5 * count), left: -0.02 };
}

function drawText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	spacing: number,
	native: boolean,
) {
	if (native || Math.abs(spacing) < 0.01) {
		ctx.fillText(text, x, y);
		return;
	}
	let before = '';
	Array.from(text).forEach((char, i) => {
		ctx.fillText(char, x + ctx.measureText(before).width + i * spacing, y);
		before += char;
	});
}

// Ink bounds of the word at 320px, as fractions of the font size.
function measureMetrics(text: string): Omit<Metrics, 'key'> | null {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx || !text.trim()) return null;
	const font = FONT_CSS.replace('{size}', '320px');
	const spacing = SPACING_EM * 320;
	const native = 'letterSpacing' in ctx;
	const setup = () => {
		ctx.font = font;
		if (native) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
		ctx.textBaseline = 'alphabetic';
		ctx.textAlign = 'left';
		ctx.fillStyle = '#000';
	};
	setup();
	const advance = ctx.measureText(text).width + (native ? 0 : spacing * Array.from(text).length);
	const w = Math.ceil(Math.max(1, advance) + 384);
	canvas.width = w;
	canvas.height = 704;
	setup();
	drawText(ctx, text, 192, 464, spacing, native);
	const data = ctx.getImageData(0, 0, w, 704).data;
	let minX = w;
	let maxX = -1;
	let minY = 704;
	let maxY = -1;
	for (let y = 0; y < 704; y++) {
		const row = y * w * 4;
		for (let x = 0; x < w; x++) {
			if (data[row + x * 4 + 3] > 24) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				maxY = y;
			}
		}
	}
	if (maxX < minX) return null;
	const box = ctx.measureText(text);
	const ascent = box.fontBoundingBoxAscent ?? 320 * 0.92;
	const descent = box.fontBoundingBoxDescent ?? 320 * 0.24;
	return {
		k: 320 / (maxX + 1 - minX),
		left: -(minX - 192) / 320,
		ascent: (464 - minY) / 320,
		descent: Math.max(0, maxY + 1 - 464) / 320,
		base: (320 + ascent - descent) / 2 / 320,
	};
}

function parseColor(value: string): [number, number, number] {
	const parts = value.match(/[\d.]+(?:e-?\d+)?/gi);
	if (!parts || parts.length < 3) return [1, 1, 1];
	if (value.startsWith('color(')) {
		return [Number(parts[0]), Number(parts[1]), Number(parts[2])].map((n) =>
			Math.min(1, Math.max(0, n)),
		) as [number, number, number];
	}
	return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
}

function createWater(
	host: HTMLElement,
	canvas: HTMLCanvasElement,
	textEl: HTMLElement,
	tintEl: HTMLElement,
	neonEl: HTMLElement,
	read: () => WaterState,
	staticMode: boolean,
	setReady: (value: boolean) => void,
) {
	const gl = canvas.getContext('webgl', {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		preserveDrawingBuffer: true,
		powerPreference: 'low-power',
	});
	if (!gl) return null;

	const compile = (type: number, source: string) => {
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		return shader;
	};
	const vert = compile(gl.VERTEX_SHADER, VERT);
	const frag = compile(gl.FRAGMENT_SHADER, FRAG);
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		gl.deleteShader(vert);
		gl.deleteShader(frag);
		return null;
	}
	gl.useProgram(program);

	const quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
	const position = gl.getAttribLocation(program, 'p');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

	const makeTexture = (unit: number) => {
		const tex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	};
	const textTex = makeTexture(0);
	const simTex = makeTexture(1);
	const uni = (name: string) => gl.getUniformLocation(program, name);
	const u = {
		res: uni('uRes'),
		line: uni('uLine'),
		text: uni('uText'),
		textRes: uni('uTextRes'),
		base: uni('uBase'),
		squash: uni('uSquash'),
		sim: uni('uSim'),
		simTexel: uni('uSimTexel'),
		simGain: uni('uSimGain'),
		p: uni('uP'),
		time: uni('uTime'),
		amb: uni('uAmb'),
		waves: uni('uWaves'),
		refl: uni('uRefl'),
		moon: uni('uMoon'),
		glow: uni('uGlow'),
		fs: uni('uFs'),
		moonX: uni('uMoonX'),
		color: uni('uColor'),
		tint: uni('uTint'),
		neon: uni('uNeon'),
	};
	gl.uniform1i(u.text, 0);
	gl.uniform1i(u.sim, 1);

	// Rows are packed toward the waterline, where the perspective is tightest.
	const ROW_POWER = 1.45;
	const textCanvas = document.createElement('canvas');
	const textCtx = textCanvas.getContext('2d')!;
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

	let width = 0;
	let waterH = 0;
	let canvasH = 0;
	let line = 0;
	let fontSize = 100;
	let textLeft = 0;
	let inkL = 0;
	let inkR = 0;
	let lineY = 0;
	let texH = 1;
	let cols = 2;
	let rows = 2;
	let cell = 1;
	let upCols = 0;
	let upRows = 0;
	let height = new Float32Array(4);
	let heightPrev = new Float32Array(4);
	let damping = new Float32Array(4);
	let pixels = new Uint8ClampedArray(16);
	let glowFast = new Float32Array(4);
	let glowSlow = new Float32Array(4);
	let glowPeak = 0;
	let blurWide = new Float32Array(4);
	let blurTmp = new Float32Array(4);
	let blurNarrow = new Float32Array(4);
	let active = false;
	let wavePeak = 0;
	let acc = 0;
	let time = 1.7;
	let lastFrame = 0;
	let raf = 0;
	let alive = true;
	let visible = false;
	let introDone = false;
	let stillDone = false;
	let lastSplat = 0;
	let lastDrag = -1e9;
	let nextDrop = 0;
	let odd = false;
	let prevPoint: { x: number; y: number; t: number } | null = null;
	let color: [number, number, number] = [1, 1, 1];
	let tint: [number, number, number] = [0.5, 0.6, 0.6];
	let neon: [number, number, number] = [0.24, 0.9, 1];
	const reduced = () => staticMode || motion.matches;

	function resizeSim() {
		cols = Math.max(48, Math.min(240, Math.round(width / (width < 700 ? 3.8 : 5.5))));
		cell = width / cols;
		rows = Math.max(20, Math.min(150, Math.round((waterH * 2.2) / cell)));
		const n = cols * rows;
		height = new Float32Array(n);
		heightPrev = new Float32Array(n);
		damping = new Float32Array(n);
		glowFast = new Float32Array(n);
		glowSlow = new Float32Array(n);
		blurWide = new Float32Array(n);
		blurTmp = new Float32Array(n);
		blurNarrow = new Float32Array(n);
		glowPeak = 0;
		stillDone = false;
		pixels = new Uint8ClampedArray(n * 4);
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const edge = Math.min(x, cols - 1 - x, rows - 1 - y);
				let d = 0.988;
				if (edge < 10) d *= 0.86 + (edge / 10) * 0.14;
				if (y < 4) d *= 0.8 + (y / 4) * 0.2;
				damping[y * cols + x] = d;
			}
		}
		upload(true);
	}

	// Glow bloom: blurNarrow is a 3x3 binomial, blurWide a 5x5 binomial of fast+slow glow.
	function blurGlow() {
		const n = cols * rows;
		for (let i = 0; i < n; i++) blurWide[i] = glowFast[i] + glowSlow[i];
		for (let y = 0; y < rows; y++) {
			const row = y * cols;
			for (let x = 0; x < cols; x++) {
				const i = row + x;
				const l1 = x > 0 ? blurWide[i - 1] : 0;
				const r1 = x < cols - 1 ? blurWide[i + 1] : 0;
				blurNarrow[i] = (l1 + 2 * blurWide[i] + r1) * 0.25;
				const l2 = x > 1 ? blurWide[i - 2] : 0;
				const r2 = x < cols - 2 ? blurWide[i + 2] : 0;
				blurTmp[i] = (l2 + 4 * l1 + 6 * blurWide[i] + 4 * r1 + r2) * 0.0625;
			}
		}
		for (let y = 0; y < rows; y++) {
			const row = y * cols;
			for (let x = 0; x < cols; x++) {
				const i = row + x;
				const up = y > 0 ? blurNarrow[i - cols] : 0;
				const down = y < rows - 1 ? blurNarrow[i + cols] : 0;
				blurWide[i] = (up + 2 * blurNarrow[i] + down) * 0.25;
			}
		}
		for (let i = 0; i < n; i++) blurNarrow[i] = blurWide[i];
		for (let y = 0; y < rows; y++) {
			const row = y * cols;
			for (let x = 0; x < cols; x++) {
				const i = row + x;
				const u1 = y > 0 ? blurTmp[i - cols] : 0;
				const d1 = y < rows - 1 ? blurTmp[i + cols] : 0;
				const u2 = y > 1 ? blurTmp[i - 2 * cols] : 0;
				const d2 = y < rows - 2 ? blurTmp[i + 2 * cols] : 0;
				blurWide[i] = (u2 + 4 * u1 + 6 * blurTmp[i] + 4 * d1 + d2) * 0.0625;
			}
		}
	}

	// RG: surface slope. B: tight glow. A: wide bloom.
	function upload(flat = false) {
		if (!flat) blurGlow();
		for (let y = 0, o = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++, o += 4) {
				const i = y * cols + x;
				if (flat) {
					pixels[o] = 128;
					pixels[o + 1] = 128;
					pixels[o + 2] = 0;
					pixels[o + 3] = 0;
					continue;
				}
				const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
				pixels[o] = border ? 128 : 128 + (height[i + 1] - height[i - 1]) * 60;
				pixels[o + 1] = border ? 128 : 128 + (height[i + cols] - height[i - cols]) * 60;
				pixels[o + 2] = (blurNarrow[i] / 1.5) * 255;
				pixels[o + 3] = (blurWide[i] / 1.5) * 255;
			}
		}
		gl!.activeTexture(gl!.TEXTURE1);
		gl!.bindTexture(gl!.TEXTURE_2D, simTex);
		if (upCols === cols && upRows === rows) {
			gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, cols, rows, gl!.RGBA, gl!.UNSIGNED_BYTE, pixels);
		} else {
			gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, cols, rows, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, pixels);
			upCols = cols;
			upRows = rows;
		}
	}

	function stepSim(gain = 1) {
		let peak = 0;
		for (let y = 1; y < rows - 1; y++) {
			const row = y * cols;
			for (let x = 1; x < cols - 1; x++) {
				const i = row + x;
				const next =
					((height[i - 1] + height[i + 1] + height[i - cols] + height[i + cols]) * 0.5 - heightPrev[i]) *
					damping[i] *
					gain;
				heightPrev[i] = next;
				const mag = next < 0 ? -next : next;
				if (mag > peak) peak = mag;
			}
		}
		const swap = height;
		height = heightPrev;
		heightPrev = swap;
		wavePeak = peak;
	}

	// While dragging, the surface holds energy a touch less, so a wake does not ring forever.
	function dragGain(now: number) {
		const since = now - lastDrag;
		if (since < 180 || since > 3600) return 1;
		return 1 - 0.015 * (Math.min(1, (since - 180) / 520) * Math.min(1, (3600 - since) / 1000));
	}

	function stepGlow(dt: number) {
		const fastDecay = 0.82 ** (dt * 60);
		const slowDecay = 0.955 ** (dt * 60);
		let peak = 0;
		for (let y = 1; y < rows - 1; y++) {
			const row = y * cols;
			for (let x = 1; x < cols - 1; x++) {
				const i = row + x;
				const lap = height[i - 1] + height[i + 1] + height[i - cols] + height[i + cols] - 4 * height[i];
				const crest = lap < 0 ? Math.min(0.9, -lap * 17) : 0;
				const fast = glowFast[i] * fastDecay;
				glowFast[i] = crest > fast ? crest : fast;
				const slow = glowSlow[i] * slowDecay;
				const feed = crest * 0.16;
				glowSlow[i] = feed > slow ? feed : slow;
				const sum = glowFast[i] + glowSlow[i];
				if (sum > peak) peak = sum;
			}
		}
		glowPeak = peak;
	}

	function settle() {
		active = false;
		height.fill(0);
		heightPrev.fill(0);
		glowFast.fill(0);
		glowSlow.fill(0);
		glowPeak = 0;
		upload(true);
	}

	function splat(px: number, py: number, radius: number, power: number) {
		if (!width || !waterH) return;
		const depth = Math.min(1, Math.max(0, py / waterH));
		const cx = px / cell;
		const cy = depth ** (1 / ROW_POWER) * (rows - 1);
		const r = Math.max(1.2, radius / cell);
		const x0 = Math.max(1, Math.floor(cx - r * 2));
		const x1 = Math.min(cols - 2, Math.ceil(cx + r * 2));
		const y0 = Math.max(1, Math.floor(cy - r * 2));
		const y1 = Math.min(rows - 2, Math.ceil(cy + r * 2));
		const inv = 1 / (r * r);
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const dx = x - cx;
				const dy = y - cy;
				height[y * cols + x] -= power * Math.exp(-(dx * dx + dy * dy) * inv);
			}
		}
		active = true;
		lastSplat = performance.now();
	}

	function measure() {
		const canvasStyle = getComputedStyle(canvas);
		const textStyle = getComputedStyle(textEl);
		width = Math.max(1, parseFloat(getComputedStyle(host).width) || canvas.clientWidth);
		canvasH = Math.max(2, parseFloat(canvasStyle.height) || canvas.clientHeight);
		fontSize = parseFloat(textStyle.fontSize) || 100;
		textLeft = parseFloat(textStyle.left) || 0;
		line = Math.min(canvasH - 1, Math.max(0, read().metrics.ascent * fontSize));
		lineY = (parseFloat(canvasStyle.top) || canvas.offsetTop) + line;
		waterH = Math.max(1, canvasH - line);
	}

	const fonts = document.fonts;
	function ensureFont(state: WaterState) {
		const css = FONT_CSS.replace('{size}', '100px');
		try {
			if (fonts && !fonts.check(css, state.text || 'a')) {
				fonts.load(css, state.text || 'a').then(
					() => alive && rebuild(),
					() => {},
				);
			}
		} catch {
			// Font checks can throw on unusual font strings; the fallback still renders.
		}
	}
	const onFontsDone = () => alive && rebuild();
	fonts?.addEventListener?.('loadingdone', onFontsDone);

	function rebuild() {
		if (!alive) return;
		const state = read();
		ensureFont(state);
		const prevW = width;
		const prevH = waterH;
		measure();
		const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
		const scale = Math.min(dpr, Math.sqrt(2.6e6 / (width * canvasH)));
		canvas.width = Math.max(1, Math.round(width * scale));
		canvas.height = Math.max(1, Math.round(canvasH * scale));
		gl!.viewport(0, 0, canvas.width, canvas.height);
		color = parseColor(getComputedStyle(textEl).color);
		tint = parseColor(getComputedStyle(tintEl).color);
		neon = parseColor(getComputedStyle(neonEl).color);

		const above = fontSize * 1.05;
		const below = fontSize * 0.35;
		texH = Math.ceil(above + below + 16);
		const texScale = Math.min(dpr, 1.5);
		textCanvas.width = Math.max(1, Math.round(width * texScale));
		textCanvas.height = Math.max(1, Math.round(texH * texScale));
		textCtx.setTransform(texScale, 0, 0, texScale, 0, 0);
		textCtx.clearRect(0, 0, width, texH);
		textCtx.fillStyle = '#fff';
		textCtx.textAlign = 'left';
		textCtx.textBaseline = 'alphabetic';
		textCtx.font = FONT_CSS.replace('{size}', `${fontSize}px`);
		const spacing = SPACING_EM * fontSize;
		const baseline = 8 + above;
		const native = 'letterSpacing' in textCtx;
		if (native) (textCtx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
		drawText(textCtx, state.text, textLeft, baseline, spacing, native);

		const m = state.metrics;
		inkL = textLeft - m.left * fontSize;
		inkR = inkL + fontSize / m.k;
		gl!.activeTexture(gl!.TEXTURE0);
		gl!.bindTexture(gl!.TEXTURE_2D, textTex);
		gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, textCanvas);
		gl!.uniform2f(u.textRes, width, texH);
		gl!.uniform1f(u.base, baseline);
		if (Math.abs(prevW - width) > 1 || Math.abs(prevH - waterH) > 1 || cols < 3) resizeSim();

		// Reduced motion: freeze one settled ripple instead of an empty surface.
		if (staticMode && !stillDone && state.waves > 0.001 && state.glow > 0.001) {
			stillDone = true;
			splat(
				(inkL + inkR) / 2,
				waterH * 0.34,
				fontSize * 0.05,
				0.7 * Math.min(2, state.waves) * Math.min(1, Math.max(0.55, fontSize / 420)),
			);
			for (let i = 0; i < 26; i++) {
				stepSim();
				stepGlow(1 / 60);
			}
			upload();
			active = false;
		}
		draw();
		if (!api.ready) {
			api.ready = true;
			setReady(true);
		}
	}

	function draw() {
		const state = read();
		gl!.uniform2f(u.res, width, canvasH);
		gl!.uniform1f(u.line, line);
		gl!.uniform1f(u.squash, 1.3);
		gl!.uniform2f(u.simTexel, 1 / cols, 1 / rows);
		gl!.uniform1f(u.simGain, (255 / 60) * 2.5);
		gl!.uniform1f(u.p, ROW_POWER);
		gl!.uniform1f(u.time, time);
		gl!.uniform1f(u.amb, Math.min(2, Math.max(0, state.ambient)));
		gl!.uniform1f(u.waves, Math.min(3, Math.max(0, state.waves)));
		gl!.uniform1f(u.refl, Math.min(1, Math.max(0, state.reflection)));
		gl!.uniform1f(u.moon, Math.min(1, Math.max(0, state.moonlight)));
		const glowScale = 0.6 + 0.4 * Math.min(1, Math.max(0, (fontSize - 120) / 300));
		gl!.uniform1f(u.glow, Math.min(1.5, Math.max(0, state.glow)) * glowScale);
		gl!.uniform1f(u.fs, fontSize);
		gl!.uniform1f(u.moonX, (inkL + inkR) / 2);
		gl!.uniform3f(u.color, color[0], color[1], color[2]);
		gl!.uniform3f(u.tint, tint[0], tint[1], tint[2]);
		gl!.uniform3f(u.neon, neon[0], neon[1], neon[2]);
		gl!.clearColor(0, 0, 0, 0);
		gl!.clear(gl!.COLOR_BUFFER_BIT);
		gl!.drawArrays(gl!.TRIANGLES, 0, 6);
	}

	function shouldRun() {
		return alive && visible && !document.hidden && !reduced() && (active || read().ambient > 0.001);
	}

	function frame(now: number) {
		raf = 0;
		if (!shouldRun()) return;
		const state = read();
		const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
		lastFrame = now;
		const ambient = Math.min(2, Math.max(0, state.ambient));
		time += dt * (0.55 + 0.45 * ambient);
		if (active) {
			acc += dt;
			let steps = 0;
			const gain = dragGain(now);
			while (acc >= 1 / 60 && steps < 3) {
				stepSim(gain);
				acc -= 1 / 60;
				steps++;
			}
			if (acc > 0.1) acc = 0;
			stepGlow(dt);
			upload();
			if (wavePeak < 0.0012 && glowPeak < 0.02 && now - lastSplat > 900) settle();
		}
		// Ambient drops land just past the waterline, under the word.
		if (ambient > 0.001 && state.waves > 0.001 && now > nextDrop) {
			if (nextDrop) {
				splat(
					inkL + Math.random() * Math.max(1, inkR - inkL),
					waterH * (0.04 + Math.random() * 0.08),
					fontSize * 0.022,
					0.34 * Math.min(1.5, ambient),
				);
			}
			nextDrop = now + (2000 + Math.random() * 2800) / Math.max(0.35, ambient);
		}
		// Idle swell only needs every other frame.
		odd = !odd;
		if (active || odd) draw();
		raf = requestAnimationFrame(frame);
	}

	function kick() {
		if (raf || !shouldRun()) {
			if (!shouldRun()) draw();
			return;
		}
		lastFrame = performance.now();
		raf = requestAnimationFrame(frame);
	}

	// Pointer to water coordinates. Hovering the letters themselves ripples the line under them.
	function toWater(event: PointerEvent) {
		const rect = host.getBoundingClientRect();
		const zoom = rect.width / Math.max(1, host.offsetWidth) || 1;
		const x = (event.clientX - rect.left) / zoom;
		const y = (event.clientY - rect.top) / zoom;
		if (x < 0 || y < 0 || x > host.offsetWidth || y > host.offsetHeight) return null;
		const below = y - lineY;
		if (below >= 0) return { x, y: below };
		if (y >= lineY - fontSize && x >= inkL - fontSize * 0.05 && x <= inkR + fontSize * 0.05) {
			return { x, y: waterH * 0.04 };
		}
		return null;
	}

	function onMove(event: PointerEvent) {
		const state = read();
		if (!state.interactive || reduced() || !visible) return;
		const point = toWater(event);
		const now = performance.now();
		if (!point) {
			prevPoint = null;
			return;
		}
		if (prevPoint && now - prevPoint.t < 140) {
			const dx = point.x - prevPoint.x;
			const dy = point.y - prevPoint.y;
			const dist = Math.hypot(dx, dy);
			if (dist > 0.5) {
				const speed = dist / Math.max(8, now - prevPoint.t);
				const power = Math.min(0.7, speed * 0.3) * Math.min(3, state.waves);
				const steps = Math.min(24, Math.max(1, Math.ceil(dist / (cell * 1.2))));
				for (let i = 1; i <= steps; i++) {
					splat(
						prevPoint.x + (dx * i) / steps,
						prevPoint.y + (dy * i) / steps,
						fontSize * 0.035,
						(power * 1.6) / steps,
					);
				}
				lastDrag = now;
				kick();
			}
		}
		prevPoint = { x: point.x, y: point.y, t: now };
	}

	function onDown(event: PointerEvent) {
		const state = read();
		if (!state.interactive || reduced() || !visible) return;
		const point = toWater(event);
		if (!point) return;
		splat(
			point.x,
			point.y,
			fontSize * 0.045,
			0.9 * Math.min(3, state.waves) * Math.min(1, Math.max(0.55, fontSize / 420)),
		);
		lastDrag = -1e9;
		kick();
	}

	const resize = new ResizeObserver(() => rebuild());
	resize.observe(host);
	resize.observe(textEl);

	const seen = new IntersectionObserver(
		(entries) => {
			const entry = entries[0];
			visible = entry.isIntersecting;
			const state = read();
			if (visible && !introDone && entry.intersectionRatio > 0.2 && !reduced() && state.waves > 0.001) {
				introDone = true;
				splat(
					(inkL + inkR) / 2,
					waterH * 0.32,
					fontSize * 0.06,
					0.9 * Math.min(2, state.waves) * Math.min(1, Math.max(0.55, fontSize / 420)),
				);
			}
			kick();
		},
		{ threshold: [0, 0.25] },
	);
	seen.observe(host);

	const onVisibility = () => kick();
	const onMotion = () => {
		if (reduced()) settle();
		kick();
	};
	document.addEventListener('visibilitychange', onVisibility);
	motion.addEventListener('change', onMotion);
	window.addEventListener('pointermove', onMove, { passive: true });
	window.addEventListener('pointerdown', onDown, { passive: true });

	const onLost = (event: Event) => {
		event.preventDefault();
		alive = false;
		cancelAnimationFrame(raf);
		setReady(false);
	};
	canvas.addEventListener('webglcontextlost', onLost);

	const api = {
		ready: false,
		rebuild,
		kick,
		dispose() {
			alive = false;
			cancelAnimationFrame(raf);
			resize.disconnect();
			seen.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motion.removeEventListener('change', onMotion);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('webglcontextlost', onLost);
			fonts?.removeEventListener?.('loadingdone', onFontsDone);
			gl!.deleteTexture(textTex);
			gl!.deleteTexture(simTex);
			gl!.deleteBuffer(quad);
			gl!.deleteProgram(program);
			gl!.deleteShader(vert);
			gl!.deleteShader(frag);
			gl!.getExtension('WEBGL_lose_context')?.loseContext();
		},
	};
	rebuild();
	return api;
}

const root = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const textRef = ref<HTMLElement | null>(null);
const baseProbe = ref<HTMLElement | null>(null);
const tintRef = ref<HTMLElement | null>(null);
const neonRef = ref<HTMLElement | null>(null);
const ready = ref(false);

const word = computed(() => (props.text || '').normalize('NFC'));
const metricsKey = computed(() => `${word.value}|${FONT_CSS}|${SPACING_EM}|0`);
const metrics = ref<Metrics>({
	...(KNOWN_METRICS[word.value] ?? fallbackMetrics(word.value)),
	key: metricsKey.value,
});

const moonlight = computed(() => clampNum(props.moonlight, 0, 100) / 100);
const glowAmount = computed(() => (clampNum(props.glow, 0, 100) / 100) * 1.5);

function readState(): WaterState {
	return {
		metrics: metrics.value,
		text: word.value,
		reflection: clampNum(props.reflection, 0, 100) / 100,
		waves: clampNum(props.waves, 0, 100) / 50,
		ambient: clampNum(props.ambient, 0, 100) / 50,
		moonlight: moonlight.value,
		glow: glowAmount.value,
		interactive: props.interactive,
	};
}

// Layout is plain CSS so the server render already has the final geometry.
// --ww-pt / --ww-px / --ww-pb / --ww-depth come from the breakpoint classes on the root.
const fs = computed(
	() => `min(calc((100cqw - var(--ww-px) * 2) * ${metrics.value.k}), ${Math.max(12, props.maxSize)}px)`,
);
const inkWidth = computed(() => `calc(var(--ww-fs) / ${metrics.value.k})`);
const textLeft = computed(
	() =>
		`calc(var(--ww-px) + (100cqw - var(--ww-px) * 2 - ${inkWidth.value}) / 2 + var(--ww-fs) * ${metrics.value.left})`,
);
const lineTop = computed(() => `calc(var(--ww-pt) + var(--ww-fs) * ${metrics.value.ascent})`);
const waterHeight = computed(() => `calc(var(--ww-fs) * var(--ww-depth) + var(--ww-pb))`);
const textTop = computed(
	() => `calc(var(--ww-pt) + var(--ww-fs) * ${metrics.value.ascent - metrics.value.base})`,
);
const canvasHeight = computed(
	() => `calc(var(--ww-fs) * (${metrics.value.ascent} + var(--ww-depth)) + var(--ww-pb))`,
);
const blockHeight = computed(() => `calc(var(--ww-pt) + ${canvasHeight.value})`);

const glowStrength = computed(() =>
	Math.round(Math.min(1, Math.max(0, moonlight.value)) * 14 + Math.min(1, glowAmount.value) * 7),
);
const glowBackground = computed(() => {
	const hue =
		glowAmount.value > 0
			? `color-mix(in srgb, ${props.glowColor} ${Math.round(Math.min(1, glowAmount.value) * 45)}%, ${props.tint})`
			: props.tint;
	const stops = GLOW_STOPS.map(
		([at, weight]) => `color-mix(in srgb, ${hue} ${(glowStrength.value * weight).toFixed(2)}%, transparent) ${at}%`,
	).join(', ');
	return `radial-gradient(calc(100cqw * 0.5) calc(var(--ww-fs) * 0.62) at 50% ${lineTop.value}, ${stops})`;
});

const wordStyle = computed(() => ({
	fontFamily: FONT_FAMILY,
	letterSpacing: `${SPACING_EM}em`,
	fontSize: 'var(--ww-fs)',
	left: textLeft.value,
}));

let engine: ReturnType<typeof createWater> = null;
let stopMetrics = () => {};

function refreshMetrics() {
	const css = FONT_CSS.replace('{size}', '100px');
	try {
		if (document.fonts && !document.fonts.check(css, word.value || 'a')) return;
	} catch {
		// Keep the current metrics if the check is not supported.
	}
	const next = measureMetrics(word.value);
	if (!next) return;
	const cur = metrics.value;
	const same =
		cur.key === metricsKey.value &&
		Math.abs(cur.k - next.k) < 1e-4 &&
		Math.abs(cur.left - next.left) < 1e-4 &&
		Math.abs(cur.ascent - next.ascent) < 1e-4 &&
		Math.abs(cur.base - next.base) < 1e-4;
	if (!same) metrics.value = { ...next, key: metricsKey.value };
}

// The canvas baseline estimate can be off by a pixel or two; trust where the browser put it.
function syncBaseline() {
	const text = textRef.value;
	const probe = baseProbe.value;
	if (!text || !probe || metrics.value.key !== metricsKey.value) return;
	const size = parseFloat(getComputedStyle(text).fontSize);
	if (!(size > 0)) return;
	const base = probe.offsetTop / size;
	if (Number.isFinite(base) && Math.abs(base - metrics.value.base) * size > 1) {
		metrics.value = { ...metrics.value, base };
	}
}

function watchMetrics() {
	let gone = false;
	const run = () => {
		if (!gone) refreshMetrics();
	};
	const css = FONT_CSS.replace('{size}', '100px');
	const fonts = document.fonts;
	run();
	if (fonts) {
		fonts.load(css, word.value || 'a').then(run, () => {});
		fonts.ready.then(run, () => {});
		fonts.addEventListener?.('loadingdone', run);
	}
	const resize = new ResizeObserver(() => run());
	if (textRef.value) resize.observe(textRef.value);
	return () => {
		gone = true;
		resize.disconnect();
		fonts?.removeEventListener?.('loadingdone', run);
	};
}

watch(metricsKey, () => {
	stopMetrics();
	stopMetrics = watchMetrics();
});

watch(
	metrics,
	() => {
		void nextTick(syncBaseline);
	},
	{ flush: 'post' },
);

watch(
	() => [
		metrics.value,
		word.value,
		props.color,
		props.tint,
		props.glowColor,
		props.reflection,
		props.waves,
		props.ambient,
		props.glow,
		props.moonlight,
		props.interactive,
		props.maxSize,
	],
	() => {
		if (!engine) return;
		engine.rebuild();
		engine.kick();
	},
	{ flush: 'post' },
);

onMounted(() => {
	stopMetrics = watchMetrics();
	void nextTick(syncBaseline);
	const host = root.value;
	const canvas = canvasRef.value;
	const text = textRef.value;
	const tintEl = tintRef.value;
	const neonEl = neonRef.value;
	if (!host || !canvas || !text || !tintEl || !neonEl) return;
	const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	try {
		engine = createWater(host, canvas, text, tintEl, neonEl, readState, still, (value) => {
			ready.value = value;
		});
	} catch {
		engine = null;
	}
	if (!engine) ready.value = false;
});

onUnmounted(() => {
	stopMetrics();
	engine?.dispose();
	engine = null;
});
</script>

<template>
	<!--
		Breakpoints follow the footer's own steps:
		phones/tablet (<1020px): 32 24 64 24, depth 34%
		laptop (1020–1131px):    32 32 48 32, depth 26%
		desktop / laptop L:      40 56 52 56, depth 24%
	-->
	<div
		ref="root"
		class="relative w-full touch-pan-y select-none @container [-webkit-tap-highlight-color:transparent] [--ww-depth:0.34] [--ww-pb:64px] [--ww-pt:32px] [--ww-px:24px] min-[1020px]:[--ww-depth:0.26] min-[1020px]:[--ww-pb:48px] min-[1020px]:[--ww-px:32px] min-[1132px]:[--ww-depth:0.24] min-[1132px]:[--ww-pb:52px] min-[1132px]:[--ww-pt:40px] min-[1132px]:[--ww-px:56px]"
		:style="{ '--ww-fs': fs }"
		aria-hidden="true"
	>
		<div :style="{ height: blockHeight }"></div>
		<span ref="tintRef" class="absolute size-0 overflow-hidden" :style="{ color: tint }"></span>
		<span ref="neonRef" class="absolute size-0 overflow-hidden" :style="{ color: glowColor }"></span>
		<div
			v-if="glowStrength > 0"
			class="pointer-events-none absolute inset-0"
			:style="{ background: glowBackground }"
		></div>
		<div class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" :style="{ height: lineTop }">
			<div
				ref="textRef"
				class="absolute m-0 whitespace-pre text-left font-normal not-italic leading-none"
				:style="{ ...wordStyle, top: textTop, color }"
			>
				{{ word }}<span ref="baseProbe" class="inline-block size-0 align-baseline"></span>
			</div>
		</div>
		<div
			class="pointer-events-none absolute inset-x-0 overflow-hidden transition-opacity duration-800 ease-[ease] mask-[linear-gradient(to_bottom,rgba(0,0,0,0.4),rgba(0,0,0,0)_62%)] motion-reduce:transition-none"
			:class="ready ? 'opacity-0' : 'opacity-100'"
			:style="{ top: lineTop, height: waterHeight }"
		>
			<div
				class="absolute m-0 whitespace-pre text-left font-normal not-italic leading-none blur-[0.6px]"
				:style="{
					...wordStyle,
					top: `calc(var(--ww-fs) * ${-metrics.base})`,
					color,
					transform: 'scaleY(-0.77)',
					transformOrigin: `0 calc(var(--ww-fs) * ${metrics.base})`,
				}"
			>
				{{ word }}
			</div>
		</div>
		<canvas
			ref="canvasRef"
			class="pointer-events-none absolute left-0 top-(--ww-pt) block w-full transition-opacity duration-800 ease-[ease] motion-reduce:transition-none"
			:class="ready ? 'opacity-100' : 'opacity-0'"
			:style="{ height: canvasHeight }"
		></canvas>
	</div>
</template>

<style>
@font-face {
	font-family: 'Instrument Serif';
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url('https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjg.woff2')
		format('woff2');
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308,
		U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
	font-family: 'Instrument Serif';
	font-style: italic;
	font-weight: 400;
	font-display: swap;
	src: url('https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjjH7M.woff2')
		format('woff2');
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308,
		U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Times metrics adjusted to Instrument Serif, so the swap does not move the word. */
@font-face {
	font-family: 'Instrument Serif Placeholder';
	src: local('Times New Roman');
	ascent-override: 117.87%;
	descent-override: 36.91%;
	line-gap-override: 0%;
	size-adjust: 83.99%;
}
</style>
