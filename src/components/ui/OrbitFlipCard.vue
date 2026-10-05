<script setup lang="ts">
/** Orbit card: stat over dimmed artwork on the front, the artwork alone on the back. */
import { ORBIT_IMAGE, type OrbitItem } from '../../lib/orbit/orbitProjects';
import FlipCard from './FlipCard.vue';
import OrbitStatCard from './OrbitStatCard.vue';

withDefaults(defineProps<{ item: OrbitItem; pixelScale?: number }>(), { pixelScale: 1 });

const emit = defineEmits<{ flipChange: [flipped: boolean] }>();
</script>

<template>
	<FlipCard
		:label="`${item.label}: ${item.value}`"
		:pixel-scale="pixelScale"
		@flip-change="(flipped) => emit('flipChange', flipped)"
	>
		<template #front>
			<OrbitStatCard :item="item" />
		</template>
		<template #back>
			<img
				:src="item.image"
				alt=""
				:width="ORBIT_IMAGE.widthPx"
				:height="ORBIT_IMAGE.heightPx"
				loading="lazy"
				decoding="async"
				draggable="false"
				class="pointer-events-none block h-full w-full select-none object-cover"
			/>
		</template>
	</FlipCard>
</template>
