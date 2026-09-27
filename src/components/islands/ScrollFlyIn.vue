<script setup lang="ts">
/**
 * ContainerScroll + ContainerInset + plane pass (Vue, no React/motion).
 * Inset opens circle→full; partner rises to center; plane flies off.
 */
import { computed, ref, useTemplateRef } from 'vue';
import {
	FALLBACK_FLY_IMAGE,
	FLY_IMAGE_PATH,
	SCROLL_TRACK_VH,
	contentTranslateYPx,
	insetClipPath,
	planeOpacity,
	planeTranslateXPx,
} from '../../lib/transition/scrollFlyIn';
import { useScrollFlyInProgress } from '../../lib/transition/useScrollFlyInProgress';

const props = withDefaults(
	defineProps<{
		imageUrl?: string;
		imageAlt?: string;
	}>(),
	{
		imageUrl: FLY_IMAGE_PATH,
		imageAlt: 'Aircraft flying across during the page transition',
	},
);

const trackRef = useTemplateRef<HTMLElement>('track');
const { progress } = useScrollFlyInProgress(trackRef);
const imageSrc = ref(props.imageUrl);

const reducedMotion = ref(
	typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);

const insetStyle = computed(() => {
	if (reducedMotion.value) {
		return { clipPath: insetClipPath(1) };
	}
	return { clipPath: insetClipPath(progress.value) };
});

const contentStyle = computed(() => {
	if (reducedMotion.value) {
		return { transform: 'translate3d(0, 0, 0)' };
	}
	const y = contentTranslateYPx(progress.value);
	return { transform: `translate3d(0, ${y}px, 0)` };
});

const flyStyle = computed(() => {
	if (typeof window === 'undefined' || reducedMotion.value) {
		return { transform: 'translate3d(0, 0, 0)', opacity: 0 };
	}
	return {
		transform: `translate3d(${planeTranslateXPx(progress.value, window.innerWidth)}px, 0, 0)`,
		opacity: planeOpacity(progress.value),
	};
});

function onImageError() {
	imageSrc.value = FALLBACK_FLY_IMAGE;
}
</script>

<template>
	<div
		ref="track"
		class="scroll-fly relative w-full"
		:style="{ height: `${SCROLL_TRACK_VH}vh` }"
		data-scroll-fly-in
	>
		<div
			class="scroll-fly__stage sticky top-0 flex min-h-svh w-full items-center justify-center overflow-hidden bg-[#f4f5f7]"
		>
			<div
				class="pointer-events-none absolute inset-0 opacity-90"
				aria-hidden="true"
			>
				<div
					class="absolute top-[-18%] left-[-10%] h-[52vmin] w-[52vmin] rounded-full bg-[#60B1FF]/28 blur-[100px]"
				></div>
				<div
					class="absolute top-[8%] right-[-8%] h-[38vmin] w-[38vmin] rounded-full bg-[#319AFF]/2 blur-[90px]"
				></div>
			</div>

			<!-- Partner section revealed through opening inset (visible before plane fully exits) -->
			<div
				class="scroll-fly__inset absolute inset-0 z-10 overflow-hidden bg-paper"
				:style="insetStyle"
			>
				<div
					class="scroll-fly__content flex min-h-svh w-full items-center"
					:style="contentStyle"
				>
					<slot />
				</div>
			</div>

			<!-- Large plane pass — leaves completely after center -->
			<div
				class="scroll-fly__plane pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
				:style="flyStyle"
				aria-hidden="true"
			>
				<img
					:src="imageSrc"
					:alt="imageAlt"
					class="h-auto w-auto max-w-none scale-125 select-none min-[768px]:scale-150"
					draggable="false"
					@error="onImageError"
				/>
			</div>
		</div>
	</div>
</template>

<style>
	/* ≤1020: partner copy must flow at full width — no 100vh clip, no side inset. */
	@media (max-width: 1020px) {
		.scroll-fly {
			height: auto !important;
		}

		.scroll-fly__stage {
			position: relative;
			height: auto;
			min-height: 0;
			overflow: visible;
		}

		.scroll-fly__inset {
			position: relative;
			inset: auto;
			height: auto;
			overflow: visible;
			clip-path: none !important;
		}

		.scroll-fly__content {
			display: block;
			height: auto;
			min-height: 0;
			transform: none !important;
		}

		.scroll-fly__plane {
			display: none;
		}
	}
</style>
