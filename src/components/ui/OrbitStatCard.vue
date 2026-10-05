<script setup lang="ts">
/**
 * One company stat: number, label, divider, value.
 * Sizes come from --orbit-stat-* (set by OrbitProjects.astro) in cqw.
 */
import type { OrbitItem } from '../../lib/orbit/orbitProjects';

defineProps<{ item: OrbitItem }>();
</script>

<template>
	<div data-orbit-stat class="orbit-stat">
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
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		background: var(--orbit-stat-bg);
		color: var(--orbit-stat-ink);
		font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
		user-select: none;
	}

	.orbit-stat p {
		margin: 0;
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
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.orbit-stat__label {
		font-size: var(--orbit-stat-label);
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: -0.01em;
	}

	.orbit-stat__bottom {
		border-top: 1px solid var(--orbit-stat-divider);
		padding: var(--orbit-stat-bottom-pad);
	}

	.orbit-stat__value {
		font-size: var(--orbit-stat-value);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.04em;
	}
</style>
