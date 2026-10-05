<script setup lang="ts">
/**
 * DepthText — Vue port of the React Bits extruded type.
 * Layers are server-rendered; pointer tilt and orbit start after hydration.
 */
import { computed, ref, type CSSProperties } from 'vue';
import {
	DEPTH_TEXT_DEFAULTS,
	depthLayers,
	depthShadow,
	resolveDepthText,
} from '../../lib/depthText/depthText';
import { useDepthText } from '../../lib/depthText/useDepthText';

const props = withDefaults(
	defineProps<{
		text?: string;
		layers?: number;
		depth?: number;
		faceColor?: string;
		depthColor?: string;
		tilt?: number;
		pointerTracking?: boolean;
		smoothing?: number;
		perspective?: number;
		autoOrbit?: boolean;
		orbitSpeed?: number;
		fontSize?: string;
		fontWeight?: number | string;
		shadow?: boolean;
		/** Hero heading wraps. The default stays one nowrap line. */
		wrap?: boolean;
	}>(),
	{ ...DEPTH_TEXT_DEFAULTS, wrap: false },
);

const rootRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);

const resolved = computed(() =>
	resolveDepthText({
		layers: props.layers,
		depth: props.depth,
		tilt: props.tilt,
		smoothing: props.smoothing,
		perspective: props.perspective,
		orbitSpeed: props.orbitSpeed,
	}),
);

const layers = computed(() =>
	depthLayers(resolved.value.layers, resolved.value.depth, props.faceColor, props.depthColor),
);

const rootStyle = computed<CSSProperties>(() => ({
	'--depth-text-perspective': `${resolved.value.perspective}px`,
	'--depth-text-font-size': props.fontSize,
	'--depth-text-font-weight': String(props.fontWeight),
	'--depth-text-face-color': props.faceColor,
	'--depth-text-depth-color': props.depthColor,
	'--depth-text-shadow': depthShadow(props.depthColor, props.shadow),
}));

useDepthText(rootRef, stageRef, () => ({
	baseRotation: resolved.value.baseRotation,
	tilt: resolved.value.tilt,
	smoothing: resolved.value.smoothing,
	orbitSpeed: resolved.value.orbitSpeed,
	pointerTracking: props.pointerTracking,
	autoOrbit: props.autoOrbit,
}));

const glyph =
	'[grid-area:1/1] inline-block [font-size:var(--depth-text-font-size)] [font-weight:var(--depth-text-font-weight)] leading-[0.86] tracking-[-0.065em] select-none [transform-style:preserve-3d] backface-hidden [font-kerning:normal] [text-rendering:geometricPrecision]';
</script>

<template>
	<span
		ref="rootRef"
		class="depth-text isolate max-w-full [perspective:var(--depth-text-perspective)] [perspective-origin:50%_48%] [@media(hover:hover)_and_(pointer:fine)]:cursor-[var(--cursor-site-default,default)]"
		:class="wrap ? 'block w-full' : 'inline-block'"
		:style="rootStyle"
	>
		<span
			ref="stageRef"
			class="depth-text__stage relative place-items-center [transform-style:preserve-3d] [transform:rotateX(-2.4deg)_rotateY(3.15deg)] origin-center will-change-transform motion-reduce:will-change-auto"
			:class="wrap ? 'grid w-full justify-items-start' : 'inline-grid'"
		>
			<span
				v-for="layer in layers"
				:key="layer.index"
				:class="[glyph, 'pointer-events-none absolute inset-0 z-0 [filter:saturate(0.95)_brightness(0.92)]', wrap ? 'w-full text-left whitespace-normal' : 'whitespace-nowrap']"
				aria-hidden="true"
				:style="{ color: layer.color, transform: layer.transform }"
			>{{ text }}</span>
			<span
				:class="[glyph, 'relative z-[1] [color:var(--depth-text-face-color)] [text-shadow:var(--depth-text-shadow)] [transform:translateZ(0.6px)]', wrap ? 'w-full text-left whitespace-normal' : 'whitespace-nowrap']"
			>{{ text }}</span>
		</span>
	</span>
</template>
