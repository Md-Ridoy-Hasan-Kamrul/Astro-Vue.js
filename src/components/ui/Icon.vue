<script setup lang="ts">
export type IconName =
  | 'layers'
  | 'menu'
  | 'close'
  | 'info'
  | 'book'
  | 'code'
  | 'database'
  | 'cloud'
  | 'spinner'
  | 'warning'
  | 'mail';

withDefaults(
  defineProps<{
    name: IconName;
    class?: string;
  }>(),
  {
    class: 'size-5 shrink-0',
  },
);
</script>

<template>
  <svg
    :class="$props.class"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'layers'">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </template>
    <path v-else-if="name === 'menu'" d="M4 6h16M4 12h16M4 18h16" />
    <path v-else-if="name === 'close'" d="M18 6 6 18M6 6l12 12" />
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </template>
    <path v-else-if="name === 'code'" d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    <template v-else-if="name === 'database'">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </template>
    <path
      v-else-if="name === 'cloud'"
      d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
    />
    <path v-else-if="name === 'spinner'" d="M21 12a9 9 0 1 1-6.219-8.56" />
    <template v-else-if="name === 'mail'">
      <path d="M4 6h16v12H4Z" />
      <path d="m4 7 8 6 8-6" />
    </template>
    <template v-else-if="name === 'warning'">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </template>
  </svg>
</template>
