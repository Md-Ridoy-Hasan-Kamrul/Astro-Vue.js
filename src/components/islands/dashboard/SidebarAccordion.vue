<script setup lang="ts">
/** Crextio left sidebar accordion — Devices expanded by default. */
import { ref, computed } from 'vue';

type Row = {
  id: string;
  label: string;
  detail?: { image: string; title: string; subtitle: string };
};

const props = defineProps<{ rows: Row[] }>();

/** `undefined` = default open (Devices); `''` = all collapsed. */
const openId = ref<string | undefined>(undefined);
const activeId = computed(() =>
  openId.value === undefined
    ? (props.rows.find((row) => row.detail)?.id ?? props.rows[0]?.id ?? '')
    : openId.value,
);

function toggle(id: string) {
  openId.value = activeId.value === id ? '' : id;
}
</script>

<template>
  <div class="flex flex-col">
    <div
      v-for="(row, index) in rows"
      :key="row.id"
      :class="`border-b border-dashed border-[#d9d4cb] ${index === 0 ? 'border-t' : ''}`"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 bg-transparent px-1 py-4 text-left text-[0.95rem] font-medium text-[#1c1c1c]"
        :aria-expanded="activeId === row.id"
        @click="toggle(row.id)"
      >
        <span>{{ row.label }}</span>
        <svg
          :class="`size-4 shrink-0 transition ${activeId === row.id ? 'rotate-180' : ''}`"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div v-if="activeId === row.id && row.detail" class="flex items-center gap-3 pb-4 pl-1 pr-1">
        <img
          :src="row.detail.image"
          alt=""
          class="size-12 rounded-xl object-cover"
          width="48"
          height="48"
        />
        <div class="min-w-0 flex-1">
          <p class="m-0 text-sm font-semibold text-[#1c1c1c]">{{ row.detail.title }}</p>
          <p class="m-0 text-xs text-[#6b6b6b]">{{ row.detail.subtitle }}</p>
        </div>
        <button
          type="button"
          class="grid size-8 place-items-center rounded-full border-0 bg-transparent text-[#6b6b6b]"
          aria-label="Device menu"
        >
          <span class="text-lg leading-none">⋮</span>
        </button>
      </div>
    </div>
  </div>
</template>
