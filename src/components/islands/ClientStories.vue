<script setup lang="ts">
/**
 * Client stories — horizontal snap carousel.
 * Cards are in the first paint; the arrows only scroll them.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import type { ClientStory } from '../../lib/clientStories/clientStories';

defineProps<{
	titleLead: string;
	titleTail: string;
	stories: ClientStory[];
}>();

const scroller = ref<HTMLElement | null>(null);
const canPrev = ref(false);
const canNext = ref(true);

function updateEnds() {
	const el = scroller.value;
	if (!el) return;
	const max = el.scrollWidth - el.clientWidth;
	canPrev.value = el.scrollLeft > 4;
	canNext.value = el.scrollLeft < max - 4;
}

function step(direction: number) {
	const el = scroller.value;
	if (!el) return;
	if (direction < 0 && !canPrev.value) return;
	if (direction > 0 && !canNext.value) return;
	const card = el.querySelector<HTMLElement>('[data-client-story]');
	const styles = getComputedStyle(el);
	const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
	const delta = (card?.offsetWidth ?? el.clientWidth) + gap;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	el.scrollBy({ left: direction * delta, behavior: reduce ? 'auto' : 'smooth' });
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowRight') {
		event.preventDefault();
		step(1);
	} else if (event.key === 'ArrowLeft') {
		event.preventDefault();
		step(-1);
	}
}

onMounted(() => {
	updateEnds();
	scroller.value?.addEventListener('scroll', updateEnds, { passive: true });
	window.addEventListener('resize', updateEnds);
});

onUnmounted(() => {
	scroller.value?.removeEventListener('scroll', updateEnds);
	window.removeEventListener('resize', updateEnds);
});
</script>

<template>
	<div class="w-full">
		<div class="mx-auto flex w-[min(100%-2rem,72rem)] flex-col items-stretch gap-4 min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between min-[720px]:gap-6">
			<h2
				id="client-stories-title"
				class="m-0 min-w-0 flex-1 font-display text-[clamp(1.65rem,3.1vw,2.7rem)] leading-[1.08] font-extrabold tracking-tight text-ink"
			>
				{{ titleLead }}<br />{{ titleTail }}
			</h2>
			<div class="flex shrink-0 justify-end gap-2">
				<button
					type="button"
					class="inline-flex size-11 items-center justify-center rounded-full border border-line bg-paper text-ink transition hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea disabled:opacity-40"
					aria-label="Previous client story"
					:disabled="!canPrev"
					@click="step(-1)"
				>
					<svg viewBox="0 0 20 20" class="size-4" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M12.5 4.5 7 10l5.5 5.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
				<button
					type="button"
					class="inline-flex size-11 items-center justify-center rounded-full border border-line bg-paper text-ink transition hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea disabled:opacity-40"
					aria-label="Next client story"
					:disabled="!canNext"
					@click="step(1)"
				>
					<svg viewBox="0 0 20 20" class="size-4" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M7.5 4.5 13 10l-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
		</div>

		<ul
			ref="scroller"
			class="m-0 mt-8 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-[max(1rem,calc((100%-72rem)/2))] px-[max(1rem,calc((100%-72rem)/2))] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			aria-label="Client stories"
			tabindex="0"
			@keydown="onKeydown"
		>
			<li
				v-for="story in stories"
				:key="story.id"
				data-client-story
				class="w-[min(100%,38rem)] shrink-0 snap-start"
			>
				<article class="client-story-card grid h-full overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_18px_40px_rgb(20_33_43/0.06)] sm:grid-cols-[1.12fr_0.88fr]">
					<div class="flex flex-col justify-between gap-5 p-5 sm:p-6">
						<div>
							<p
								v-if="story.mark === 'display'"
								class="m-0 font-display text-[1.7rem] leading-none font-extrabold tracking-tight text-sea italic"
							>
								{{ story.brandMark }}
							</p>
							<p
								v-else
								class="m-0 flex items-center gap-2 font-mono text-[0.72rem] font-bold tracking-[0.22em] text-ink-soft uppercase"
							>
								<span class="inline-block size-2.5 rounded-[3px] bg-sea" aria-hidden="true"></span>
								{{ story.brandMark }}
							</p>
							<blockquote class="m-0 mt-6 text-[1.02rem] leading-relaxed text-ink">
								“{{ story.quote }}”
							</blockquote>
						</div>
						<footer>
							<p class="m-0 text-[0.98rem] font-semibold text-ink">{{ story.name }}</p>
							<p class="m-0 mt-1 text-sm leading-snug text-ink-soft">{{ story.role }}</p>
							<p class="m-0 text-sm leading-snug text-ink-soft">{{ story.location }}</p>
						</footer>
					</div>
					<div class="relative h-44 sm:h-auto sm:min-h-full">
						<img
							:src="story.image"
							:alt="story.imageAlt"
							class="absolute inset-0 size-full object-cover"
							width="640"
							height="800"
						/>
						<span
							class="pointer-events-none absolute top-1/2 left-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sea text-paper shadow-[0_10px_24px_rgb(15_69_76/0.28)]"
							aria-hidden="true"
						>
							<svg viewBox="0 0 20 20" class="ml-0.5 size-6" fill="currentColor">
								<path d="M6.5 4.2v11.6L16 10 6.5 4.2Z" />
							</svg>
						</span>
					</div>
				</article>
			</li>
		</ul>
	</div>
</template>

<style scoped>
@media (min-width: 640px) {
	.client-story-card {
		height: min(22rem, calc(100svh - 14.5rem));
	}
}
</style>
