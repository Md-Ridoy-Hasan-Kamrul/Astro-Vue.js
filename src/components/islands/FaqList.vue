<script setup lang="ts">
/**
 * FAQ accordion — Framer row motion (search, numbered question, arrow turn, panel open)
 * on this site's type, ink, and paper.
 */
import { computed, ref, watch } from 'vue';
import type { FaqItem } from '../../lib/faq/faq';

const props = defineProps<{
	title: string;
	searchPlaceholder: string;
	emptyTitle: string;
	emptyDescription: string;
	items: FaqItem[];
}>();

const OPEN_MS = 420;

const query = ref('');
const openId = ref<string | null>(null);

const visible = computed(() => {
	const needle = query.value.trim().toLowerCase();
	if (!needle) return props.items;
	return props.items.filter((item) => {
		if (item.question.toLowerCase().includes(needle)) return true;
		return item.answer.some((paragraph) => paragraph.toLowerCase().includes(needle));
	});
});

watch(visible, (items) => {
	if (openId.value && !items.some((item) => item.id === openId.value)) {
		openId.value = null;
	}
});

function padIndex(index: number) {
	return String(index + 1).padStart(2, '0');
}

function toggle(id: string) {
	openId.value = openId.value === id ? null : id;
}

function onSearchKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape') return;
	query.value = '';
}
</script>

<template>
	<div class="mx-auto w-[min(100%-2rem,72rem)]">
		<h2
			id="faq-title"
			class="m-0 font-display text-[clamp(1.85rem,4.2vw,3.15rem)] leading-[1.05] font-extrabold tracking-tight text-ink"
		>
			{{ title }}
		</h2>

		<label class="relative mt-8 block">
			<span class="sr-only">{{ searchPlaceholder }}</span>
			<span class="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-soft" aria-hidden="true">
				<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" stroke-linecap="round" />
				</svg>
			</span>
			<input
				v-model="query"
				type="search"
				:placeholder="searchPlaceholder"
				class="w-full rounded-2xl border border-line bg-paper py-4 pr-5 pl-14 text-base text-ink outline-none transition-[border-color] duration-200 placeholder:text-ink-soft/70 focus:border-sea"
				@keydown="onSearchKeydown"
			/>
		</label>

		<p
			v-if="visible.length === 0"
			class="m-0 mt-8 rounded-2xl border border-line bg-paper px-6 py-8 text-ink-soft"
			role="status"
		>
			<span class="block font-display text-lg font-bold text-ink">{{ emptyTitle }}</span>
			<span class="mt-1 block">{{ emptyDescription }}</span>
		</p>

		<div v-else class="mt-4" role="list">
			<article
				v-for="(item, index) in visible"
				:key="item.id"
				class="border-b border-line"
				role="listitem"
				data-faq-item
			>
				<button
					type="button"
					class="flex w-full items-start justify-between gap-4 bg-transparent py-7 text-left transition-colors duration-300 hover:bg-mist/60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-sea sm:gap-8 sm:py-9 sm:pr-2 sm:pl-2"
					:aria-expanded="openId === item.id"
					:aria-controls="`faq-panel-${item.id}`"
					:id="`faq-trigger-${item.id}`"
					@click="toggle(item.id)"
				>
					<span class="flex min-w-0 flex-1 items-start gap-5 sm:gap-10">
						<span class="mt-1 font-mono text-base font-medium text-sea tabular-nums sm:text-xl">{{ padIndex(index) }}</span>
						<span class="font-display text-[clamp(1.2rem,2.4vw,2rem)] leading-[1.2] font-bold tracking-tight text-ink">
							{{ item.question }}
						</span>
					</span>
					<span
						class="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink text-ink transition-[border-color,color,transform] duration-300 sm:size-12"
						:class="openId === item.id ? 'border-sea text-sea' : ''"
						aria-hidden="true"
					>
						<svg
							viewBox="0 0 24 24"
							class="size-5 transition-transform duration-300 ease-in-out"
							:class="openId === item.id ? 'rotate-90' : ''"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M5 12h14" stroke-linecap="round" />
							<path d="m12 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</span>
				</button>

				<div
					:id="`faq-panel-${item.id}`"
					role="region"
					:aria-labelledby="`faq-trigger-${item.id}`"
					class="grid ease-in-out transition-[grid-template-rows]"
					:style="`grid-template-rows: ${openId === item.id ? '1fr' : '0fr'}; transition-duration: ${OPEN_MS}ms;`"
				>
					<div class="min-h-0 overflow-hidden">
						<div
							class="max-w-3xl pr-16 pb-8 pl-[3.4rem] transition-opacity duration-300 sm:pb-10 sm:pl-22"
							:class="openId === item.id ? 'opacity-100' : 'opacity-0'"
						>
							<p
								v-for="(paragraph, paragraphIndex) in item.answer"
								:key="paragraphIndex"
								class="m-0 text-[1.02rem] leading-relaxed text-ink-soft"
								:class="paragraphIndex > 0 ? 'mt-4' : ''"
							>
								{{ paragraph }}
							</p>
						</div>
					</div>
				</div>
			</article>
		</div>
	</div>
</template>
