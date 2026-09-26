<script setup lang="ts">
/**
 * Shared loading / error / empty / success chrome for data UIs.
 * Keep Query/Axios payloads out of this component — only presentation.
 */
import { computed } from 'vue';

type Tone = 'neutral' | 'danger' | 'success' | 'info';

const props = withDefaults(
  defineProps<{
    tone?: Tone;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    busy?: boolean;
    class?: string;
  }>(),
  {
    tone: 'neutral',
    description: '',
    busy: false,
    class: '',
  },
);

const toneClass = computed(
  () =>
    ({
      neutral: 'border-line bg-mist/50 text-ink',
      danger: 'border-accent/35 bg-accent/8 text-ink',
      success: 'border-sea/35 bg-sea/8 text-ink',
      info: 'border-sea/25 bg-foam/70 text-ink',
    })[props.tone],
);
</script>

<template>
  <div
    :class="`grid gap-2 rounded-lg border px-3.5 py-3 ${toneClass} ${props.class}`"
    role="status"
    aria-live="polite"
    :aria-busy="busy || undefined"
  >
    <p class="m-0 text-sm font-semibold tracking-[-0.01em]">{{ title }}</p>
    <p v-if="description" class="m-0 text-sm text-ink-soft">{{ description }}</p>
    <button
      v-if="actionLabel && onAction"
      type="button"
      class="mt-1 justify-self-start rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="busy"
      @click="onAction"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
