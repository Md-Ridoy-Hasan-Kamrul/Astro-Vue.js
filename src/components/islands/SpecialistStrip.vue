<script setup lang="ts">
/**
 * Full-bleed hanging cards. Two equal groups translate by half so the loop never stops.
 */
type Shot = {
	src: string;
	alt: string;
	title: string;
	caption: string;
};

defineProps<{
	shots: Shot[];
}>();

const tilts = ['-rotate-6', 'rotate-3', 'rotate-0', '-rotate-3', 'rotate-[7deg]'] as const;
const delays = ['0s', '-0.28s', '-0.56s', '-0.84s', '-1.12s'] as const;

function tilt(index: number) {
	return tilts[index % tilts.length];
}

function delay(index: number) {
	return delays[index % delays.length];
}

function width(index: number) {
	return index % 2 === 0
		? 'w-[clamp(15rem,22vw,20rem)]'
		: 'w-[clamp(12.5rem,18vw,16.5rem)]';
}
</script>

<template>
	<div class="specialist-strip relative h-full w-full min-w-0 max-w-full overflow-hidden max-[426px]:h-auto max-[426px]:pb-3" data-specialist-strip>
		<div class="specialist-strip__track flex w-max items-start" data-specialist-track>
			<ul
				v-for="copy in 2"
				:key="copy"
				class="relative m-0 flex shrink-0 list-none items-start gap-12 border-t border-ink/25 p-0 pt-0 pr-12"
				:aria-hidden="copy === 2 ? 'true' : undefined"
			>
				<li
					v-for="(shot, index) in shots"
					:key="`${copy}-${shot.src}`"
					class="relative shrink-0 pt-8"
					:class="width(index)"
				>
					<span class="absolute top-0 left-1/2 h-8 w-px -translate-x-1/2 bg-ink/25" aria-hidden="true" />
					<div
						class="hanging-gallery-card origin-top [--swing:2]"
						:style="{ animationDelay: delay(index) }"
					>
						<article
							class="relative origin-top rounded-[1.625rem] border border-black/10 bg-white p-2 shadow-[0_15px_25px_rgb(34_35_18/0.16),0_3px_5px_rgb(0_0_0/0.1)]"
							:class="tilt(index)"
						>
							<span
								class="absolute -top-7 left-1/2 z-2 h-[2.1rem] w-[1.35rem] -translate-x-1/2 rounded-[4px_4px_5px_5px] border border-black/15 bg-[#12b83a] shadow-[0_3px_4px_rgb(0_0_0/0.14)]"
								aria-hidden="true"
							>
								<span class="mx-auto mt-1.5 block size-1.5 rounded-full bg-[#f7f4e9]" />
							</span>
							<div class="aspect-7/5 overflow-hidden rounded-[1.125rem] bg-mist">
								<img
									:src="shot.src"
									:alt="copy === 1 ? shot.alt : ''"
									width="780"
									height="438"
									class="size-full object-cover"
									draggable="false"
								/>
							</div>
							<div class="px-1 pt-2.5 pb-1">
								<p class="text-[0.95rem] leading-none font-bold tracking-[-0.06em] text-ink">
									{{ shot.title }}
								</p>
								<p class="mt-1 text-[0.68rem] leading-tight font-medium tracking-[-0.02em] text-ink/60">
									{{ shot.caption }}
								</p>
							</div>
						</article>
					</div>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
.specialist-strip__track {
	animation: specialist-marquee 42s linear infinite;
}

.hanging-gallery-card {
	animation: hanging-swing 2.5s linear infinite alternate;
}

@keyframes specialist-marquee {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(-50%);
	}
}

@keyframes hanging-swing {
	from {
		transform: rotate(calc(var(--swing) * -1deg));
	}
	to {
		transform: rotate(calc(var(--swing) * 1deg));
	}
}

@media (prefers-reduced-motion: reduce) {
	.specialist-strip__track,
	.hanging-gallery-card {
		animation: none;
		transform: none;
	}
}
</style>
