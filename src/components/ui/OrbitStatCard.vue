<script setup lang="ts">
/**
 * One company stat over its dimmed artwork: number and label on top, divider,
 * big value below. Sizes come from --orbit-stat-* / --orbit-art-* (OrbitProjects.astro).
 */
import { ORBIT_IMAGE, type OrbitItem } from '../../lib/orbit/orbitProjects';

defineProps<{ item: OrbitItem }>();
</script>

<template>
	<div
		data-orbit-stat
		class="orbit-stat relative flex h-full w-full flex-col @container font-['Inter',system-ui,-apple-system,'Segoe_UI',sans-serif] text-white [font-variant-numeric:tabular-nums] antialiased select-none [text-shadow:0_1px_10px_rgb(0_0_0/0.55)] after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_bottom,rgb(0_0_0/0.42),transparent_38%,transparent_58%,rgb(0_0_0/0.5)),rgb(0_0_0/var(--orbit-art-wash))] after:content-['']"
	>
		<img
			:src="item.image"
			alt=""
			:width="ORBIT_IMAGE.widthPx"
			:height="ORBIT_IMAGE.heightPx"
			loading="lazy"
			decoding="async"
			draggable="false"
			class="orbit-stat__art pointer-events-none absolute inset-0 size-full object-cover opacity-(--orbit-art-opacity) filter-[grayscale(var(--orbit-art-grayscale))]"
		/>
		<div class="orbit-stat__top relative z-1 flex flex-1 flex-col justify-between p-(--orbit-stat-pad)">
			<p class="orbit-stat__index m-0 text-(length:--orbit-stat-index) leading-none font-medium tracking-[0.06em]" aria-hidden="true">{{ item.index }}</p>
			<p class="orbit-stat__label m-0 text-(length:--orbit-stat-label) leading-[1.2] font-semibold tracking-[-0.02em]">{{ item.label }}</p>
		</div>
		<div class="orbit-stat__bottom relative z-1 border-t border-[rgb(255_255_255/0.28)] px-(--orbit-stat-pad) py-(--orbit-stat-bottom-pad)">
			<p class="orbit-stat__value m-0 text-(length:--orbit-stat-value) leading-none font-bold tracking-[-0.045em]">{{ item.value }}</p>
		</div>
	</div>
</template>
