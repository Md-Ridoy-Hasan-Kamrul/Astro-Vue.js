<script setup lang="ts">
/**
 * Wordmark and water from Interactive Footer 6.
 * The letters stay real text. A height-field bends only the reflection:
 * a wake follows the pointer, a click sends a ring, and a small entry
 * ripple plus ambient drops keep the surface alive.
 */
import { onMounted, onUnmounted, ref } from 'vue';

const props = withDefaults(
	defineProps<{
		text?: string;
	}>(),
	{ text: 'Astro Vue' },
);

const root = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const live = ref(false);

const fs = ref(160);
const padX = ref(56);
const padTop = ref(40);
const blockH = ref(420);
const waterY = ref(200);
const textLeft = ref(56);

let stop = () => {};

function layoutFor(width: number) {
	// Same cuts as Interactive Footer 6, keyed to the section column.
	// Desktop and Laptop L sit in the wide column; Laptop is the middle step; tablet and phones share the narrow step.
	if (width >= 1100) {
		return { padX: 56, padTop: 40, inset: 112, extra: 52, mirror: 0.24 };
	}
	if (width >= 760) {
		return { padX: 32, padTop: 32, inset: 64, extra: 48, mirror: 0.26 };
	}
	return { padX: 24, padTop: 32, inset: 48, extra: 64, mirror: 0.34 };
}

onMounted(() => {
	const host = root.value;
	const canvas = canvasRef.value;
	if (!host || !canvas) return;

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const measure = document.createElement('span');
	measure.textContent = props.text;
	measure.style.cssText =
		'position:absolute;visibility:hidden;white-space:pre;font-family:"Instrument Serif", "Times New Roman", serif;font-weight:400;letter-spacing:-0.02em;line-height:1;';
	host.appendChild(measure);

	let frame = 0;
	let running = false;
	let cols = 0;
	let rows = 0;
	let curr = new Float32Array(0);
	let prev = new Float32Array(0);
	let lastX = -1;
	let lastY = -1;
	let ambientAt = 0;
	let entered = false;

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		premultipliedAlpha: false,
	});
	const reflect = document.createElement('canvas');
	const reflectCtx = reflect.getContext('2d');

	function fit() {
		const width = host.getBoundingClientRect().width || host.clientWidth || 1;
		const box = layoutFor(width);
		padX.value = box.padX;
		padTop.value = box.padTop;
		measure.style.fontSize = '100px';
		const unit = Math.max(measure.getBoundingClientRect().width, 1) / 100;
		const inner = Math.max(1, width - box.inset);
		const size = Math.min(720, inner / unit);
		fs.value = size;
		textLeft.value = box.padX + size * -0.0125;
		// Feet of the letters meet the water. The mirror is only the band under that line.
		waterY.value = box.padTop + size * 0.7406;
		blockH.value = waterY.value + size * box.mirror + box.extra;
		paintReflection(width);
		resizeSim(width);
	}

	function paintReflection(width: number) {
		if (!reflectCtx) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(1, Math.round(width * dpr));
		const h = Math.max(1, Math.round(blockH.value * dpr));
		reflect.width = w;
		reflect.height = h;
		reflectCtx.clearRect(0, 0, w, h);
		reflectCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		reflectCtx.font = `400 ${fs.value}px "Instrument Serif", "Times New Roman", serif`;
		reflectCtx.fillStyle = '#ece9df';
		reflectCtx.textBaseline = 'top';
		reflectCtx.filter = 'blur(0.6px)';
		reflectCtx.save();
		const through = waterY.value - (padTop.value - fs.value * 0.1);
		reflectCtx.translate(textLeft.value, waterY.value);
		reflectCtx.scale(1, -0.77);
		reflectCtx.fillText(props.text, 0, -through);
		reflectCtx.restore();
		reflectCtx.filter = 'none';
		if (gl) uploadReflection();
	}

	function resizeSim(width: number) {
		cols = 180;
		rows = 64;
		if (curr.length !== cols * rows) {
			curr = new Float32Array(cols * rows);
			prev = new Float32Array(cols * rows);
		}
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const nextW = Math.max(1, Math.round(width * dpr));
		const nextH = Math.max(1, Math.round(blockH.value * dpr));
		if (canvas.width !== nextW || canvas.height !== nextH) {
			canvas.width = nextW;
			canvas.height = nextH;
		}
		if (!gl) return;
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.bindTexture(gl.TEXTURE_2D, heightTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.LUMINANCE,
			cols,
			rows,
			0,
			gl.LUMINANCE,
			gl.UNSIGNED_BYTE,
			new Uint8Array(cols * rows),
		);
	}

	function splat(nx: number, ny: number, radius: number, power: number) {
		if (!cols) return;
		const cx = nx * (cols - 1);
		const cy = ny * (rows - 1);
		const r = Math.max(2, radius * cols);
		const y0 = Math.max(1, Math.floor(cy - r));
		const y1 = Math.min(rows - 2, Math.ceil(cy + r));
		const x0 = Math.max(1, Math.floor(cx - r));
		const x1 = Math.min(cols - 2, Math.ceil(cx + r));
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const dx = x - cx;
				const dy = y - cy;
				const d = Math.hypot(dx, dy);
				if (d > r) continue;
				const fall = 0.5 * (Math.cos((d / r) * Math.PI) + 1);
				curr[y * cols + x] += power * fall;
			}
		}
	}

	function step() {
		const damp = 0.984;
		for (let y = 1; y < rows - 1; y++) {
			for (let x = 1; x < cols - 1; x++) {
				const i = y * cols + x;
				const n =
					(curr[i - 1] + curr[i + 1] + curr[i - cols] + curr[i + cols]) / 2 - prev[i];
				prev[i] = n * damp;
			}
		}
		const swap = curr;
		curr = prev;
		prev = swap;
	}

	function localPoint(event: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		if (rect.width < 1 || rect.height < 1) return null;
		return {
			x: (event.clientX - rect.left) / rect.width,
			y: (event.clientY - rect.top) / rect.height,
		};
	}

	function onMove(event: PointerEvent) {
		if (reduce || event.pointerType !== 'mouse') return;
		const point = localPoint(event);
		if (!point) return;
		if (lastX >= 0) {
			const speed = Math.hypot(point.x - lastX, point.y - lastY);
			splat(point.x, point.y, 0.045, Math.min(0.55, 0.08 + speed * 1.4));
		}
		lastX = point.x;
		lastY = point.y;
	}

	function onLeave() {
		lastX = -1;
		lastY = -1;
	}

	function onDown(event: PointerEvent) {
		if (reduce) return;
		const point = localPoint(event);
		if (!point) return;
		splat(point.x, point.y, 0.09, 1.15);
	}

	let program: WebGLProgram | null = null;
	let heightTex: WebGLTexture | null = null;
	let reflectTex: WebGLTexture | null = null;
	let buffer: WebGLBuffer | null = null;
	let waterLineLoc: WebGLUniformLocation | null = null;
	let timeLoc: WebGLUniformLocation | null = null;
	let height: Uint8Array | null = null;

	function uploadReflection() {
		if (!gl || !reflectTex) return;
		gl.bindTexture(gl.TEXTURE_2D, reflectTex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, reflect);
	}

	function draw() {
		if (!gl || !program || !heightTex || !reflectTex || !height) return;
		if (height.length !== cols * rows) height = new Uint8Array(cols * rows);
		for (let i = 0; i < curr.length; i++) {
			height[i] = Math.max(0, Math.min(255, 128 + curr[i] * 28));
		}
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		const position = gl.getAttribLocation(program, 'a');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
		gl.uniform1f(
			waterLineLoc,
			blockH.value > 0 ? (blockH.value - waterY.value) / blockH.value : 0.5,
		);
		gl.uniform1f(timeLoc, performance.now() * 0.001);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, reflectTex);
		gl.uniform1i(gl.getUniformLocation(program, 'uReflect'), 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, heightTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.LUMINANCE,
			cols,
			rows,
			0,
			gl.LUMINANCE,
			gl.UNSIGNED_BYTE,
			height,
		);
		gl.uniform1i(gl.getUniformLocation(program, 'uHeight'), 1);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	function tick(now: number) {
		if (!running) return;
		step();
		if (!entered) {
			entered = true;
			splat(0.22, 0.78, 0.14, 1.1);
			splat(0.55, 0.86, 0.18, 1.25);
			splat(0.82, 0.8, 0.12, 0.9);
		}
		if (now - ambientAt > 2600) {
			ambientAt = now;
			splat(0.12 + Math.random() * 0.76, 0.74 + Math.random() * 0.2, 0.07, 0.42);
		}
		draw();
		frame = window.requestAnimationFrame(tick);
	}

	function start() {
		if (running || reduce || !gl) return;
		running = true;
		live.value = true;
		ambientAt = performance.now();
		frame = window.requestAnimationFrame(tick);
	}

	function halt() {
		running = false;
		window.cancelAnimationFrame(frame);
	}

	if (gl) {
		const vert = `
			attribute vec2 a;
			varying vec2 vUv;
			void main() {
				vUv = a * 0.5 + 0.5;
				gl_Position = vec4(a, 0.0, 1.0);
			}
		`;
		const frag = `
			precision mediump float;
			varying vec2 vUv;
			uniform sampler2D uReflect;
			uniform sampler2D uHeight;
			uniform float uLine;
			uniform float uTime;
			void main() {
				vec2 uv = vUv;
				float h = texture2D(uHeight, uv).r;
				float hx = texture2D(uHeight, uv + vec2(0.008, 0.0)).r;
				float hy = texture2D(uHeight, uv + vec2(0.0, 0.02)).r;
				vec2 grad = vec2(hx - h, hy - h);
				float bands = sin(uv.x * 17.0 + uTime * 1.15) * sin(uv.y * 9.0 - uTime * 0.65);
				float ripple = clamp(length(grad) * 18.0 + smoothstep(0.004, 0.09, abs(h - 0.5)) + bands * 0.45 + 0.45, 0.0, 1.0);
				vec3 crest = vec3(0.239216, 0.909804, 1.0);
				float water = 1.0 - smoothstep(uLine - 0.001, uLine + 0.004, uv.y);
				float below = clamp((uLine - uv.y) / max(0.001, uLine), 0.0, 1.0);
				float fade = 1.0 - smoothstep(0.12, 0.9, below);
				gl_FragColor = vec4(crest, water * fade * mix(0.02, 0.72, ripple));
			}
		`;
		function shader(type: number, source: string) {
			const item = gl!.createShader(type)!;
			gl!.shaderSource(item, source);
			gl!.compileShader(item);
			return item;
		}
		program = gl.createProgram();
		gl.attachShader(program, shader(gl.VERTEX_SHADER, vert));
		gl.attachShader(program, shader(gl.FRAGMENT_SHADER, frag));
		gl.linkProgram(program);
		waterLineLoc = gl.getUniformLocation(program, 'uLine');
		timeLoc = gl.getUniformLocation(program, 'uTime');
		buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		function makeTex() {
			const tex = gl!.createTexture();
			gl!.bindTexture(gl!.TEXTURE_2D, tex);
			gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
			gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
			gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
			gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
			return tex;
		}
		heightTex = makeTex();
		reflectTex = makeTex();
		gl.disable(gl.BLEND);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		height = new Uint8Array(0);
	}

	const fonts = document.fonts?.load('400 120px "Instrument Serif"');
	void Promise.resolve(fonts)
		.catch(() => undefined)
		.then(() => {
			fit();
			if (!reduce) start();
		});

	const resize = new ResizeObserver(() => fit());
	resize.observe(host);
	host.addEventListener('pointermove', onMove);
	host.addEventListener('pointerleave', onLeave);
	host.addEventListener('pointerdown', onDown);

	const seen = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) start();
			else halt();
		},
		{ threshold: 0.05 },
	);
	seen.observe(host);

	const onReduce = () => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			halt();
			live.value = false;
		} else start();
	};
	window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', onReduce);

	stop = () => {
		halt();
		resize.disconnect();
		seen.disconnect();
		host.removeEventListener('pointermove', onMove);
		host.removeEventListener('pointerleave', onLeave);
		host.removeEventListener('pointerdown', onDown);
		window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener?.('change', onReduce);
		measure.remove();
		gl?.deleteProgram(program);
		gl?.deleteTexture(heightTex);
		gl?.deleteTexture(reflectTex);
		gl?.deleteBuffer(buffer);
	};
});

onUnmounted(() => stop());
</script>

<template>
	<div
		ref="root"
		class="relative w-full touch-pan-y select-none"
		:style="{ height: `${blockH}px` }"
		aria-hidden="true"
	>
		<div
			class="pointer-events-none absolute inset-0"
			:style="{
				background: `radial-gradient(${Math.round(fs * 1.1)}px ${Math.round(fs * 0.62)}px at 50% ${waterY}px, color-mix(in srgb, color-mix(in srgb, #3de8ff 40%, #7b9b91) 11%, transparent), transparent 70%)`,
			}"
		></div>
		<div class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" :style="{ height: `${waterY}px` }">
			<p
				class="absolute m-0 whitespace-pre text-left font-normal leading-none tracking-[-0.02em] text-[#ece9df]"
				:style="{
					fontFamily: `'Instrument Serif', 'Times New Roman', serif`,
					fontSize: `${fs}px`,
					left: `${textLeft}px`,
					top: `${padTop - fs * 0.1}px`,
				}"
			>
				{{ text }}
			</p>
		</div>
		<div
			class="pointer-events-none absolute inset-x-0 overflow-hidden"
			:style="{
				top: `${waterY}px`,
				height: `${Math.max(0, blockH - waterY)}px`,
				maskImage: 'linear-gradient(to bottom, #000 0%, rgb(0 0 0 / 0.72) 42%, transparent 82%)',
				webkitMaskImage: 'linear-gradient(to bottom, #000 0%, rgb(0 0 0 / 0.72) 42%, transparent 82%)',
			}"
		>
			<p
				class="absolute m-0 whitespace-pre text-left font-normal leading-none tracking-[-0.02em] text-[#ece9df] blur-[0.6px]"
				:style="{
					fontFamily: `'Instrument Serif', 'Times New Roman', serif`,
					fontSize: `${fs}px`,
					left: `${textLeft}px`,
					top: `${-(waterY - (padTop - fs * 0.1))}px`,
					transform: 'scaleY(-0.77)',
					transformOrigin: `0 ${waterY - (padTop - fs * 0.1)}px`,
				}"
			>
				{{ text }}
			</p>
		</div>
		<canvas
			ref="canvasRef"
			class="pointer-events-none absolute inset-0 block h-full w-full transition-opacity duration-800 ease-linear"
			:class="live ? 'opacity-100' : 'opacity-0'"
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
</style>
