<script setup lang="ts">
/**
 * Liquid Glass Button — Vue port of
 * https://framer.com/m/LiquidGlassButtons-Cm3c86.js@y7tM3V9YGLt9tBHu2Y4O
 * (CSS glass layers only — no React / canvas refraction.)
 */
import { computed } from 'vue';

type Surface = 'light' | 'dark';
type Size = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    label: string;
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    surface?: Surface;
    size?: Size;
    external?: boolean;
    class?: string;
    onClick?: (event: MouseEvent) => void;
  }>(),
  {
    type: 'button',
    disabled: false,
    surface: 'light',
    size: 'md',
    external: false,
    class: '',
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const rootClass = computed(() =>
  ['liquid-glass-btn', props.size === 'sm' ? 'liquid-glass-btn--sm' : '', props.class]
    .filter(Boolean)
    .join(' '),
);

function handleClick(event: MouseEvent) {
  props.onClick?.(event);
  emit('click', event);
}
</script>

<template>
  <a
    v-if="href"
    :href="href"
    :class="rootClass"
    :data-surface="surface"
    :data-disabled="disabled ? 'true' : undefined"
    :aria-disabled="disabled || undefined"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    @click="handleClick"
  >
    <span class="liquid-glass-btn__face">
      <span class="liquid-glass-btn__body" aria-hidden="true"></span>
      <span class="liquid-glass-btn__surface" aria-hidden="true"></span>
      <span class="liquid-glass-btn__tint" aria-hidden="true"></span>
      <span class="liquid-glass-btn__shoulder" aria-hidden="true"></span>
      <span class="liquid-glass-btn__rim" aria-hidden="true"></span>
      <span class="liquid-glass-btn__reflection" aria-hidden="true"></span>
      <span class="liquid-glass-btn__caustic" aria-hidden="true"></span>
      <span class="liquid-glass-btn__bottom" aria-hidden="true"></span>
      <span class="liquid-glass-btn__label">{{ label }}</span>
    </span>
  </a>
  <button
    v-else
    :type="type"
    :class="rootClass"
    :data-surface="surface"
    :data-disabled="disabled ? 'true' : undefined"
    :disabled="disabled"
    @click="handleClick"
  >
    <span class="liquid-glass-btn__face">
      <span class="liquid-glass-btn__body" aria-hidden="true"></span>
      <span class="liquid-glass-btn__surface" aria-hidden="true"></span>
      <span class="liquid-glass-btn__tint" aria-hidden="true"></span>
      <span class="liquid-glass-btn__shoulder" aria-hidden="true"></span>
      <span class="liquid-glass-btn__rim" aria-hidden="true"></span>
      <span class="liquid-glass-btn__reflection" aria-hidden="true"></span>
      <span class="liquid-glass-btn__caustic" aria-hidden="true"></span>
      <span class="liquid-glass-btn__bottom" aria-hidden="true"></span>
      <span class="liquid-glass-btn__label">{{ label }}</span>
    </span>
  </button>
</template>
