/**
 * Fullscreen WebGL preset for Shader Text. One rAF loop, paused offscreen.
 * The ink heading stays until the first frame actually paints.
 */
import { onMounted, onUnmounted, type Ref } from 'vue';
import {
	FRAGMENT_SHADER,
	VERTEX_SHADER,
	resolveShaderMotion,
	shaderPresetIndex,
	type ShaderPreset,
	type ShaderTextMotion,
} from './shaderText';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MAX_PIXEL_RATIO = 2;
const MS_PER_SECOND = 1000;

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	gl.deleteShader(shader);
	return null;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
	const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
	if (!vertex || !fragment) return null;

	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
	gl.deleteProgram(program);
	return null;
}

export function useShaderText(
	rootRef: Ref<HTMLElement | null>,
	canvasRef: Ref<HTMLCanvasElement | null>,
	preset: () => ShaderPreset,
	motion: () => ShaderTextMotion,
	onLive: () => void,
) {
	let stop = () => {};

	onMounted(() => {
		const root = rootRef.value;
		const canvas = canvasRef.value;
		if (!root || !canvas || typeof window === 'undefined') return;

		const gl = canvas.getContext('webgl', {
			alpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: false,
			powerPreference: 'low-power',
		});
		if (!gl) return;

		const program = createProgram(gl);
		if (!program) return;

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

		const position = gl.getAttribLocation(program, 'aPosition');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
		gl.useProgram(program);
		gl.disable(gl.DEPTH_TEST);

		const uTime = gl.getUniformLocation(program, 'uTime');
		const uResolution = gl.getUniformLocation(program, 'uResolution');
		const uScale = gl.getUniformLocation(program, 'uScale');
		const uSoftness = gl.getUniformLocation(program, 'uSoftness');
		const uPreset = gl.getUniformLocation(program, 'uPreset');

		const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
		const start = performance.now();
		let frameId = 0;
		let running = true;
		let visible = true;
		let live = false;

		const resize = () => {
			const { resolutionScale } = resolveShaderMotion(motion());
			const width = root.clientWidth;
			const height = root.clientHeight;
			if (width < 2 || height < 2) return false;
			const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * resolutionScale;
			const bufferWidth = Math.max(1, Math.round(width * ratio));
			const bufferHeight = Math.max(1, Math.round(height * ratio));
			if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
				canvas.width = bufferWidth;
				canvas.height = bufferHeight;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
			return true;
		};

		const draw = (now: number) => {
			if (gl.isContextLost() || !resize()) return false;
			const options = resolveShaderMotion(motion());
			const elapsed = reducedMotion ? 0 : ((now - start) / MS_PER_SECOND) * options.speed;
			gl.uniform1f(uTime, elapsed);
			gl.uniform2f(uResolution, canvas.width, canvas.height);
			gl.uniform1f(uScale, options.scale);
			gl.uniform1f(uSoftness, options.softness);
			gl.uniform1f(uPreset, shaderPresetIndex(preset()));
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			if (!live && canvas.getClientRects().length > 0) {
				live = true;
				onLive();
			}
			return true;
		};

		const tick = (now: number) => {
			if (!running || !visible) return;
			const drew = draw(now);
			if (reducedMotion && drew && live) return;
			frameId = requestAnimationFrame(tick);
		};

		const schedule = () => {
			if (!running || !visible) return;
			cancelAnimationFrame(frameId);
			frameId = requestAnimationFrame(tick);
		};

		const onContextLost = (event: Event) => {
			event.preventDefault();
			running = false;
			cancelAnimationFrame(frameId);
		};

		const observer =
			typeof IntersectionObserver === 'undefined'
				? null
				: new IntersectionObserver((entries) => {
						visible = entries.some((entry) => entry.isIntersecting);
						if (visible) schedule();
						else cancelAnimationFrame(frameId);
					});

		const resizeObserver =
			reducedMotion && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						schedule();
					})
				: null;

		canvas.addEventListener('webglcontextlost', onContextLost);
		observer?.observe(root);
		resizeObserver?.observe(root);
		schedule();

		stop = () => {
			running = false;
			cancelAnimationFrame(frameId);
			observer?.disconnect();
			resizeObserver?.disconnect();
			canvas.removeEventListener('webglcontextlost', onContextLost);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
		};
	});

	onUnmounted(() => stop());
}
