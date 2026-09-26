<script setup lang="ts">
/**
 * Service Accordion — Vue port of
 * https://framer.com/m/Service-Accordion-9AKRk0.js@5705lIQS0zFn3fQ1EDtH
 * Numbered rows expand one-at-a-time to reveal tags + image (no React).
 */
import { ref, computed } from 'vue';
import { getListViewState } from '../../lib/query/queryUi';
import AsyncStatus from '../ui/AsyncStatus.vue';

export type ServiceItem = {
  title: string;
  tags: string[];
  image: string;
  imageAlt?: string;
};

const OPEN_MS = 420;
const IMAGE_ASPECT = '3.26 / 1';
const IMAGE_MAX_H = '22rem';

const props = withDefaults(
  defineProps<{
    items: ServiceItem[];
    class?: string;
  }>(),
  { class: '' },
);

const openIndex = ref<number | null>(0);
const listState = computed(() => getListViewState(props.items));

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index;
}

function onKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggle(index);
  }
}

function padIndex(index: number) {
  return String(index + 1).padStart(2, '0');
}
</script>

<template>
  <AsyncStatus
    v-if="listState === 'empty'"
    tone="neutral"
    title="No services listed"
    description="Add service rows to expand tags and images."
    :class="props.class"
  />
  <div
    v-else
    :class="`flex w-full flex-col gap-8 min-[720px]:gap-12 ${props.class}`"
    role="list"
    aria-label="Services"
  >
    <article
      v-for="(item, index) in items"
      :key="index"
      class="overflow-hidden border-b border-line pb-6 last:border-b-0 last:pb-0 min-[720px]:pb-8"
      role="listitem"
    >
      <button
        type="button"
        class="flex w-full cursor-pointer items-start justify-between gap-4 border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
        :aria-expanded="openIndex === index"
        :aria-controls="`service-panel-${index}`"
        :id="`service-trigger-${index}`"
        @click="toggle(index)"
        @keydown="onKeydown($event, index)"
      >
        <div class="min-w-0 flex-1">
          <p class="mb-1 font-mono text-[0.75rem] font-semibold tracking-wider text-sea tabular-nums">
            {{ padIndex(index) }}
          </p>
          <h3 class="font-display text-[clamp(1.35rem,4.5vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-ink">
            {{ item.title }}
          </h3>
        </div>

        <span
          class="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink transition duration-300 min-[720px]:mt-2 min-[720px]:size-15"
          aria-hidden="true"
        >
          <svg
            :class="`size-5 transition duration-300 min-[720px]:size-6 ${openIndex === index ? 'rotate-45' : ''}`"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </span>
      </button>

      <div
        :id="`service-panel-${index}`"
        role="region"
        :aria-labelledby="`service-trigger-${index}`"
        class="grid ease-in-out transition-[grid-template-rows]"
        :style="`grid-template-rows: ${openIndex === index ? '1fr' : '0fr'}; transition-duration: ${OPEN_MS}ms;`"
      >
        <div class="min-h-0 overflow-hidden">
          <div
            :class="`flex flex-col gap-6 pt-5 transition-opacity duration-300 min-[720px]:gap-8 min-[720px]:pt-7 ${openIndex === index ? 'opacity-100' : 'opacity-0'}`"
          >
            <ul v-if="item.tags.length" class="m-0 flex list-none flex-wrap gap-2 p-0 min-[720px]:gap-3">
              <li
                v-for="tag in item.tags"
                :key="tag"
                class="rounded-full border border-line bg-mist/80 px-3 py-1.5 text-[0.8rem] font-medium text-ink-soft min-[720px]:px-3.5 min-[720px]:text-[0.9rem]"
              >
                {{ tag }}
              </li>
            </ul>
            <p v-else class="m-0 text-sm text-ink-soft">No tags for this service yet.</p>

            <div
              class="w-full overflow-hidden rounded-2xl border border-line bg-mist min-[720px]:rounded-3xl"
              :style="`aspect-ratio: ${IMAGE_ASPECT}; max-height: ${IMAGE_MAX_H};`"
            >
              <img
                :src="item.image"
                :alt="item.imageAlt ?? item.title"
                class="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
