<script setup lang="ts">
/**
 * Desktop orbit (1024px and up). Six cards ride a 3D ring while the
 * titles slide in, then the ring flattens into a 3-column grid.
 * Math lives in lib/orbit/orbitProjects.ts; scroll in useOrbitProgress.
 */
import { computed, ref, type CSSProperties } from 'vue';
import {
	ORBIT_COLORS,
	ORBIT_CARD,
	ORBIT_COPY,
	ORBIT_LAYOUT,
	ORBIT_TITLE,
	cardFrame,
	cardRenderBox,
	cardTransform,
	centerCopyOpacity,
	stageGeometry,
	titleFrame,
	type CardFrame,
	type OrbitItem,
} from '../../lib/orbit/orbitProjects';
import { useOrbitProgress } from '../../lib/orbit/useOrbitProgress';
import OrbitFlipCard from '../ui/OrbitFlipCard.vue';

const props = defineProps<{ items: readonly OrbitItem[] }>();

const rootRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const { progress, viewport } = useOrbitProgress(rootRef, stageRef);

const geometry = computed(() => stageGeometry(viewport.value, props.items.length));
const title = computed(() => titleFrame(progress.value, viewport.value.width));

const cards = computed(() =>
	props.items.map((item, index) => ({
		item,
		frame: cardFrame(index, props.items.length, progress.value, viewport.value, geometry.value),
	})),
);

const sectionStyle: CSSProperties = {
	height: `${ORBIT_LAYOUT.scrollLengthVh}vh`,
	background: ORBIT_COLORS.background,
};

const stageStyle: CSSProperties = {
	minHeight: `${ORBIT_LAYOUT.minStageHeightPx}px`,
	background: ORBIT_COLORS.background,
	color: ORBIT_COLORS.text,
	perspective: `${ORBIT_LAYOUT.perspectivePx}px`,
};

const leftTitleStyle = computed<CSSProperties>(() => ({
	top: `${ORBIT_TITLE.leftTopPercent}%`,
	opacity: title.value.opacity,
	transform: `translate3d(calc(-100% - ${title.value.leftOffset}px), calc(-50% + ${title.value.shift}px), 0)`,
}));

const rightTitleStyle = computed<CSSProperties>(() => ({
	top: `${ORBIT_TITLE.rightTopPercent}%`,
	opacity: title.value.opacity,
	transform: `translate3d(${title.value.rightOffset}px, calc(-50% - ${title.value.shift}px), 0)`,
}));

const copyStyle = computed<CSSProperties>(() => ({
	width: `${title.value.copyWidth}px`,
	opacity: centerCopyOpacity(progress.value),
}));

function cardStyle(frame: CardFrame): CSSProperties {
	const box = cardRenderBox(frame);
	return {
		width: `${box.width}px`,
		height: `${box.height}px`,
		opacity: frame.opacity,
		zIndex: frame.zIndex,
		transform: cardTransform({ ...frame, x: box.x, y: box.y, scale: box.scale }),
	};
}
</script>

<template>
	<div ref="rootRef" class="relative w-full" :style="sectionStyle">
		<div
			ref="stageRef"
			data-orbit-stage
			class="orbit-stage sticky top-0 h-svh w-full overflow-hidden"
			:style="stageStyle"
		>
			<h2 class="sr-only">{{ ORBIT_COPY.leftTitle }} {{ ORBIT_COPY.rightTitle }}</h2>

			<div
				data-orbit-title="left"
				aria-hidden="true"
				class="orbit-title pointer-events-none absolute left-1/2 z-0 w-max"
				:style="leftTitleStyle"
			>
				{{ ORBIT_COPY.leftTitle }}
			</div>
			<div
				data-orbit-title="right"
				aria-hidden="true"
				class="orbit-title pointer-events-none absolute left-1/2 z-0 w-max"
				:style="rightTitleStyle"
			>
				{{ ORBIT_COPY.rightTitle }}
			</div>
			<p
				class="orbit-copy pointer-events-none absolute left-1/2 top-1/2 z-[2] m-0 box-border max-w-[80vw] p-4"
				:style="copyStyle"
			>
				{{ ORBIT_COPY.centerText }}
			</p>

			<div class="orbit-ring absolute inset-0 z-10">
				<div
					v-for="{ item, frame } in cards"
					:key="item.id"
					data-orbit-card
					class="orbit-card absolute left-1/2 top-1/2"
					:style="cardStyle(frame)"
				>
					<OrbitFlipCard :item="item" :pixel-scale="ORBIT_CARD.renderQuality" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	.orbit-stage {
		perspective-origin: 50% 50%;
		transform-style: preserve-3d;
		isolation: isolate;
		font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
	}

	.orbit-title {
		margin: 0;
		font-size: var(--orbit-desktop-title);
		font-weight: 400;
		line-height: 0.86;
		letter-spacing: -0.075em;
		white-space: nowrap;
		will-change: transform, opacity;
	}

	.orbit-copy {
		font-size: 12px;
		font-weight: 500;
		line-height: 1.05;
		letter-spacing: -0.035em;
		text-align: center;
		transform: translate3d(-50%, -50%, 0);
	}

	.orbit-ring {
		transform-style: preserve-3d;
	}

	.orbit-card {
		transform-origin: 50% 50%;
		transform-style: preserve-3d;
		backface-visibility: hidden;
	}
</style>
