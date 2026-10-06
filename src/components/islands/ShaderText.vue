<script setup lang="ts">
/**
 * Shader Text — Vue port of the Framer TextShader.
 * A WebGL preset is masked to the heading glyphs. The ink text stays until the first frame.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
	encodeSvgDataUrl,
	makeTextMaskSVG,
	measureWrappedLines,
	type ShaderPreset,
} from '../../lib/shaderText/shaderText.ts';
import { useShaderText } from '../../lib/shaderText/useShaderText.ts';

const props = withDefaults(
	defineProps<{
		text?: string;
		preset?: ShaderPreset;
		speed?: number;
		scale?: number;
		softness?: number;
		resolutionScale?: number;
		fontSize?: string;
		fontWeight?: number | string;
	}>(),
	{
		text: 'Shader Text',
		preset: 'Plasma',
		speed: 1,
		scale: 3,
		softness: 0.35,
		resolutionScale: 0.75,
		fontSize: 'clamp(2.15rem, 5.2vw, 3.65rem)',
		fontWeight: 800,
	},
);

const rootRef = ref<HTMLElement | null>(null);
const sizerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const maskUrl = ref('');
const live = ref(false);

const sizerStyle = computed(() => ({
	'--shader-text-size': props.fontSize,
	'--shader-text-weight': String(props.fontWeight),
}));

const maskStyle = computed(() => {
	if (!maskUrl.value) return undefined;
	const image = `url("${maskUrl.value}")`;
	return {
		WebkitMaskImage: image,
		maskImage: image,
		WebkitMaskRepeat: 'no-repeat',
		maskRepeat: 'no-repeat',
		WebkitMaskPosition: 'left top',
		maskPosition: 'left top',
		WebkitMaskSize: '100% 100%',
		maskSize: '100% 100%',
	};
});

function refreshMask() {
	const el = sizerRef.value;
	if (!el) return;
	const style = getComputedStyle(el);
	const lines = measureWrappedLines(el);
	if (!lines.length) return;
	const svg = makeTextMaskSVG({
		width: Math.max(1, el.clientWidth),
		height: Math.max(1, el.clientHeight),
		fontFamily: style.fontFamily,
		fontSizePx: Number.parseFloat(style.fontSize) || 48,
		fontWeight: style.fontWeight,
		letterSpacing: style.letterSpacing,
		lines,
	});
	maskUrl.value = encodeSvgDataUrl(svg);
}

useShaderText(
	rootRef,
	canvasRef,
	() => props.preset,
	() => ({
		speed: props.speed,
		scale: props.scale,
		softness: props.softness,
		resolutionScale: props.resolutionScale,
	}),
	() => {
		live.value = true;
	},
);

let observer: ResizeObserver | undefined;

onMounted(() => {
	refreshMask();
	if (typeof ResizeObserver !== 'undefined' && sizerRef.value) {
		observer = new ResizeObserver(() => refreshMask());
		observer.observe(sizerRef.value);
	}
	document.fonts?.ready.then(() => refreshMask());
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
	<span ref="rootRef" class="shader-text relative block w-full max-w-full font-display">
		<span
			ref="sizerRef"
			class="block w-full text-left leading-[0.86] tracking-[-0.065em] [font-size:var(--shader-text-size)] font-(--shader-text-weight)"
			:class="live && maskUrl ? 'text-transparent' : 'text-ink'"
			:style="sizerStyle"
		>{{ text }}</span>
		<span
			v-show="maskUrl"
			class="pointer-events-none absolute inset-0"
			:style="maskStyle"
			aria-hidden="true"
		>
			<canvas ref="canvasRef" class="block size-full" />
		</span>
	</span>
</template>
