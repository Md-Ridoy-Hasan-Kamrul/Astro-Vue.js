<script setup lang="ts">
/**
 * Full-bleed photo strip. Two equal groups translate by half so the loop never stops.
 */
type Shot = {
	src: string;
	alt: string;
};

defineProps<{
	shots: Shot[];
}>();
</script>

<template>
	<div class="specialist-strip relative h-full w-full min-w-0 max-w-full overflow-hidden" data-specialist-strip>
		<div class="specialist-strip__track flex w-max" data-specialist-track>
			<ul
				v-for="copy in 2"
				:key="copy"
				class="m-0 flex h-full shrink-0 list-none items-center gap-3 p-0 pr-3"
				:aria-hidden="copy === 2 ? 'true' : undefined"
			>
				<li
					v-for="(shot, index) in shots"
					:key="`${copy}-${shot.src}`"
					class="shrink-0 overflow-hidden rounded-[1.5rem]"
					:class="index % 2 === 0 ? 'aspect-[3/4] h-[clamp(13.5rem,30vh,18rem)]' : 'aspect-[2/3] h-[clamp(10rem,22vh,13.25rem)]'"
				>
					<img
						:src="shot.src"
						:alt="copy === 1 ? shot.alt : ''"
						width="720"
						height="780"
						class="size-full object-cover"
						draggable="false"
					/>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
.specialist-strip__track {
	animation: specialist-marquee 42s linear infinite;
}

@keyframes specialist-marquee {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(-50%);
	}
}

@media (prefers-reduced-motion: reduce) {
	.specialist-strip__track {
		animation: none;
		transform: none;
	}
}
</style>
