<script setup lang="ts">
/**
 * Scroll-driven orbit, at every width. Six cards ride a 3D ring while the
 * titles slide in, then the ring flattens into a grid (3 columns, 2 on phones).
 * Math lives in lib/orbit/orbitProjects.ts; scroll in useOrbitProgress.
 */
import { computed, ref, type CSSProperties } from 'vue';
import {
	ORBIT_COLORS,
	ORBIT_COPY,
	ORBIT_LAYOUT,
	cardFrame,
	cardRenderBox,
	cardTransform,
	centerCopyOpacity,
	stageGeometry,
	titleFrame,
	titleLayout,
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
const layout = computed(() => titleLayout(viewport.value.width));

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

const titleSize = computed<CSSProperties>(() =>
	layout.value.fontSizePx === null ? {} : { fontSize: `${layout.value.fontSizePx}px` },
);

const leftTitleStyle = computed<CSSProperties>(() => ({
	...titleSize.value,
	top: `${layout.value.leftTopPercent}%`,
	opacity: title.value.opacity,
	transform: `translate3d(calc(-100% - ${title.value.leftOffset}px), calc(-50% + ${title.value.shift}px), 0)`,
}));

const rightTitleStyle = computed<CSSProperties>(() => ({
	...titleSize.value,
	top: `${layout.value.rightTopPercent}%`,
	opacity: title.value.opacity,
	transform: `translate3d(${title.value.rightOffset}px, calc(-50% - ${title.value.shift}px), 0)`,
}));

const copyStyle = computed<CSSProperties>(() => ({
	top: `${layout.value.copyTopPercent}%`,
	width: `${title.value.copyWidth}px`,
	opacity: centerCopyOpacity(progress.value),
}));

function cardStyle(frame: CardFrame): CSSProperties {
	const box = cardRenderBox(frame, geometry.value.renderQuality);
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
		<!-- Phones: the stat type floors step down so a stat still fits a 2-column card. -->
		<div
			ref="stageRef"
			data-orbit-stage
			class="orbit-stage sticky top-0 isolate h-svh w-full overflow-hidden transform-3d perspective-origin-[50%_50%] font-['Inter',system-ui,-apple-system,'Segoe_UI',sans-serif] max-[639px]:[--orbit-stat-bottom-pad:max(10px,5cqw)] max-[639px]:[--orbit-stat-index:max(11px,4cqw)] max-[639px]:[--orbit-stat-label:max(13px,5.6cqw)] max-[639px]:[--orbit-stat-pad:max(12px,6.5cqw)] max-[639px]:[--orbit-stat-value:max(26px,16cqw)]"
			:style="stageStyle"
		>
			<h2 class="sr-only">{{ ORBIT_COPY.leftTitle }} {{ ORBIT_COPY.rightTitle }}</h2>

			<div
				data-orbit-title="left"
				aria-hidden="true"
				class="orbit-title pointer-events-none absolute left-1/2 z-0 m-0 w-max text-(length:--orbit-desktop-title) leading-[0.86] font-normal tracking-[-0.075em] whitespace-nowrap will-change-[transform,opacity]"
				:style="leftTitleStyle"
			>
				{{ ORBIT_COPY.leftTitle }}
			</div>
			<div
				data-orbit-title="right"
				aria-hidden="true"
				class="orbit-title pointer-events-none absolute left-1/2 z-0 m-0 w-max text-(length:--orbit-desktop-title) leading-[0.86] font-normal tracking-[-0.075em] whitespace-nowrap will-change-[transform,opacity]"
				:style="rightTitleStyle"
			>
				{{ ORBIT_COPY.rightTitle }}
			</div>
			<p
				class="orbit-copy pointer-events-none absolute left-1/2 z-2 m-0 box-border max-w-[80vw] transform-[translate3d(-50%,-50%,0)] p-4 text-center text-[12px] leading-[1.05] font-medium tracking-[-0.035em]"
				:style="copyStyle"
			>
				{{ ORBIT_COPY.centerText }}
			</p>

			<div class="orbit-ring absolute inset-0 z-10 transform-3d">
				<div
					v-for="{ item, frame } in cards"
					:key="item.id"
					data-orbit-card
					class="orbit-card absolute top-1/2 left-1/2 origin-center transform-3d backface-hidden"
					:style="cardStyle(frame)"
				>
					<OrbitFlipCard :item="item" :pixel-scale="geometry.renderQuality" />
				</div>
			</div>
		</div>
	</div>
</template>
