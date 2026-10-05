<script setup lang="ts">
/**
 * One company stat over its dimmed artwork: label on top, number and value at
 * the bottom. Sizes come from --orbit-stat-* / --orbit-art-* (OrbitProjects.astro).
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
		<p class="orbit-stat__label">{{ item.label }}</p>
		<div class="orbit-stat__meta">
			<p aria-hidden="true">{{ item.index }}</p>
			<p>{{ item.value }}</p>
		</div>
	</div>
</template>

<style scoped>
	.orbit-stat {
		container-type: inline-size;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		padding: var(--orbit-stat-pad);
		color: inherit;
		font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
		user-select: none;
	}

	.orbit-stat p {
		position: relative;
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

	.orbit-stat__label {
		font-size: var(--orbit-stat-title);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}

	.orbit-stat__meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: var(--orbit-stat-meta);
		font-weight: 500;
		line-height: 1;
		opacity: 0.8;
	}
</style>
