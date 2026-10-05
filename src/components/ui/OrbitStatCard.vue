<script setup lang="ts">
/**
 * One company stat over its dimmed artwork: number and label on top, divider,
 * big value below. Sizes come from --orbit-stat-* / --orbit-art-* (OrbitProjects.astro).
 */
import { ORBIT_IMAGE, type OrbitItem } from '../../lib/orbit/orbitProjects';

defineProps<{ item: OrbitItem }>();
</script>

<template>
	<div data-orbit-stat class="orbit-stat">
		<img
			:src="item.image"
			alt=""
			:width="ORBIT_IMAGE.widthPx"
			:height="ORBIT_IMAGE.heightPx"
			loading="lazy"
			decoding="async"
			draggable="false"
			class="orbit-stat__art"
		/>
		<div class="orbit-stat__top">
			<p class="orbit-stat__index" aria-hidden="true">{{ item.index }}</p>
			<p class="orbit-stat__label">{{ item.label }}</p>
		</div>
		<div class="orbit-stat__bottom">
			<p class="orbit-stat__value">{{ item.value }}</p>
		</div>
	</div>
</template>

<style scoped>
	.orbit-stat {
		container-type: inline-size;
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		color: #fff;
		font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-variant-numeric: tabular-nums;
		-webkit-font-smoothing: antialiased;
		text-shadow: 0 1px 10px rgb(0 0 0 / 0.55);
		user-select: none;
	}

	.orbit-stat::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgb(0 0 0 / 0.42), transparent 38%, transparent 58%, rgb(0 0 0 / 0.5)),
			rgb(0 0 0 / var(--orbit-art-wash));
		pointer-events: none;
	}

	.orbit-stat p {
		margin: 0;
	}

	.orbit-stat__art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: var(--orbit-art-opacity);
		filter: grayscale(var(--orbit-art-grayscale));
		pointer-events: none;
	}

	.orbit-stat__top,
	.orbit-stat__bottom {
		position: relative;
		z-index: 1;
	}

	.orbit-stat__top {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: space-between;
		padding: var(--orbit-stat-pad);
	}

	.orbit-stat__index {
		font-size: var(--orbit-stat-index);
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.06em;
	}

	.orbit-stat__label {
		font-size: var(--orbit-stat-label);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.orbit-stat__bottom {
		border-top: 1px solid rgb(255 255 255 / 0.28);
		padding: var(--orbit-stat-bottom-pad) var(--orbit-stat-pad);
	}

	.orbit-stat__value {
		font-size: var(--orbit-stat-value);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.045em;
	}
</style>
