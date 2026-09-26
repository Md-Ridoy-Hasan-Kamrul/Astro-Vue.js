<script setup lang="ts">
/**
 * Page transition: circle iris opens → plane L→center→R → circle closes → partner.
 */
import { computed, ref, useTemplateRef } from 'vue';
import {
	FALLBACK_FLY_IMAGE,
	FLY_IMAGE_PATH,
	SCROLL_TRACK_VH,
	circleRadiusPercent,
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
		imageAlt: 'Aircraft flying through the page transition',
	},
);

const trackRef = useTemplateRef<HTMLElement>('track');
const { progress } = useScrollFlyInProgress(trackRef);
const imageSrc = ref(props.imageUrl);

const reducedMotion = ref(
	typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);

const irisStyle = computed(() => {
	if (reducedMotion.value) {
		return { clipPath: 'circle(0% at 50% 50%)' };
	}
	const radius = circleRadiusPercent(progress.value);
	return { clipPath: `circle(${radius}% at 50% 50%)` };
});

const flyStyle = computed(() => {
	if (typeof window === 'undefined' || reducedMotion.value) {
		return { transform: 'translate3d(0, 0, 0)', opacity: 0 };
	}
	const x = planeTranslateXPx(progress.value, window.innerWidth);
	const opacity = planeOpacity(progress.value);
	return {
		transform: `translate3d(${x}px, 0, 0)`,
		opacity,
	};
});

function onImageError() {
	imageSrc.value = FALLBACK_FLY_IMAGE;
}
</script>

<template>
	<div
		ref="track"
		class="relative w-full bg-[#f4f5f7]"
		:style="{ height: `${SCROLL_TRACK_VH}vh` }"
		data-scroll-fly-in
		aria-hidden="true"
	>
		<div class="sticky top-0 h-svh overflow-hidden bg-[#f4f5f7]">
			<!-- Soft hero glow behind the iris so it never reads as empty white -->
			<div
				class="pointer-events-none absolute inset-0 opacity-80"
				aria-hidden="true"
			>
				<div
					class="absolute top-[-20%] left-[-10%] h-[55vmin] w-[55vmin] rounded-full bg-[#60B1FF]/30 blur-[100px]"
				></div>
				<div
					class="absolute top-[10%] right-[-5%] h-[40vmin] w-[40vmin] rounded-full bg-[#319AFF]/22 blur-[90px]"
				></div>
			</div>

			<!-- Circle portal: opens, holds (plane centered), then shrinks -->
			<div class="absolute inset-0" :style="irisStyle">
				<div
					class="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#e8f3ff_0%,#f4f5f7_55%,#eef1f4_100%)]"
				></div>
				<div
					class="pointer-events-none absolute inset-0 flex items-center justify-center"
					:style="flyStyle"
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
	</div>
</template>
