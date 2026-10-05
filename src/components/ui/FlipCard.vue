<script setup lang="ts">
/**
 * FlipCard — Vue port of the React FlipCard API (front / back as slots).
 * Click or Enter flips, drag turns it, hover tilts with a glare.
 */
import { computed, ref, type CSSProperties } from 'vue';
import {
	FLIP_CARD_DEFAULTS,
	HALF_TURN_DEG,
	cssSize,
	flipShadow,
	flipTransform,
	glareBackground,
	type FlipAxis,
} from '../../lib/flipCard/flipCard';
import { useFlipCard } from '../../lib/flipCard/useFlipCard';

const props = withDefaults(
	defineProps<{
		label: string;
		axis?: FlipAxis;
		flipOnClick?: boolean;
		draggable?: boolean;
		dragDistance?: number;
		tilt?: boolean;
		tiltMax?: number;
		glare?: boolean;
		glareOpacity?: number;
		hoverScale?: number;
		perspective?: number;
		stiffness?: number;
		damping?: number;
		width?: number;
		height?: number;
		radius?: number;
		background?: string;
		color?: string;
		shadow?: boolean;
		shadowColor?: string;
		shadowOpacity?: number;
		/** Multiplies px sizes when the card is rendered larger and scaled down. */
		pixelScale?: number;
	}>(),
	{ ...FLIP_CARD_DEFAULTS, width: undefined, height: undefined },
);

const emit = defineEmits<{ flipChange: [flipped: boolean] }>();

const rootRef = ref<HTMLElement | null>(null);
const { flipped, pose, glare, handlers } = useFlipCard(
	rootRef,
	() => props,
	(next) => emit('flipChange', next),
);

const rootStyle = computed<CSSProperties>(() => ({
	width: cssSize(props.width),
	height: cssSize(props.height),
	perspective: `${props.perspective * props.pixelScale}px`,
	touchAction: props.draggable ? (props.axis === 'y' ? 'pan-y' : 'pan-x') : 'auto',
}));

const tiltStyle = computed<CSSProperties>(() => ({
	transform: `rotateX(${pose.value.tiltX}deg) rotateY(${pose.value.tiltY}deg) scale(${pose.value.scale})`,
}));

const flipperStyle = computed<CSSProperties>(() => ({
	transform: flipTransform(props.axis, pose.value.rotation),
}));

const faceStyle = computed<CSSProperties>(() => ({
	borderRadius: `${props.radius * props.pixelScale}px`,
	background: props.background,
	color: props.color,
	boxShadow: props.shadow ? flipShadow(props.shadowColor, props.shadowOpacity, props.pixelScale) : 'none',
}));

const backStyle = computed<CSSProperties>(() => ({
	...faceStyle.value,
	transform: flipTransform(props.axis, HALF_TURN_DEG),
}));

const glareStyle = computed<CSSProperties>(() => ({
	borderRadius: `${props.radius * props.pixelScale}px`,
	opacity: glare.visible ? 1 : 0,
	background: glareBackground(glare, props.glareOpacity),
}));
</script>

<template>
	<div
		ref="rootRef"
		data-flip-card
		class="flip-card relative cursor-[var(--cursor-site-pointer,pointer)] [-webkit-tap-highlight-color:transparent] select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-current"
		role="button"
		tabindex="0"
		:aria-label="label"
		:aria-pressed="flipped"
		:style="rootStyle"
		@pointerdown="handlers.onPointerDown"
		@pointermove="handlers.onPointerMove"
		@pointerup="handlers.onPointerUp"
		@pointercancel="handlers.onPointerCancel"
		@pointerleave="handlers.onPointerLeave"
		@keydown="handlers.onKeydown"
	>
		<div class="flip-card__tilt relative size-full [transform-style:preserve-3d]" :style="tiltStyle">
			<div class="flip-card__flipper relative size-full [transform-style:preserve-3d]" :style="flipperStyle">
				<div class="flip-card__face absolute inset-0 overflow-hidden backface-hidden [-webkit-backface-visibility:hidden]" :aria-hidden="flipped" :style="faceStyle">
					<slot name="front" />
				</div>
				<div class="flip-card__face absolute inset-0 overflow-hidden backface-hidden [-webkit-backface-visibility:hidden]" :aria-hidden="!flipped" :style="backStyle">
					<slot name="back" />
				</div>
			</div>
			<div v-if="glare" class="flip-card__glare pointer-events-none absolute inset-0 [transform:translateZ(1px)] mix-blend-screen transition-opacity duration-[0.25s] ease-[ease]" aria-hidden="true" :style="glareStyle"></div>
		</div>
	</div>
</template>
