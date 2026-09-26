<script setup lang="ts">
/** Circular work-time tracker — play / pause. */
import { ref, computed, watchEffect, onUnmounted } from 'vue';

const RING = 2 * Math.PI * 54;

const running = ref(false);
const seconds = ref(2 * 60 + 35);
let frameId = 0;
let last = 0;

const label = computed(() => formatTime(seconds.value));
const progress = computed(() => Math.min(1, (seconds.value % 3600) / 3600));

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tick(now: number) {
  if (!running.value) return;
  if (!last) last = now;
  if (now - last >= 1000) {
    seconds.value += 1;
    last = now;
  }
  frameId = requestAnimationFrame(tick);
}

function play() {
  if (running.value) return;
  running.value = true;
  last = 0;
  frameId = requestAnimationFrame(tick);
}

function pause() {
  running.value = false;
  cancelAnimationFrame(frameId);
}

onUnmounted(() => {
  cancelAnimationFrame(frameId);
});
</script>

<template>
  <div class="flex h-full min-h-64 flex-col justify-between rounded-[1.75rem] bg-white p-5 shadow-[0_18px_40px_rgb(28_28_28_/0.06)]">
    <div class="mb-1 flex items-center justify-between">
      <p class="m-0 text-sm font-medium text-[#6b6b6b]">Time tracker</p>
      <button
        type="button"
        class="grid size-8 place-items-center rounded-full border border-[#e8e4dc] bg-white text-[#1c1c1c]"
        aria-label="Open time tracker"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 17L17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="relative mx-auto grid size-38 place-items-center">
      <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#f0eee8" stroke-width="10"></circle>
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#ffd74b"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="RING"
          :stroke-dashoffset="RING * (1 - progress)"
        ></circle>
      </svg>
      <div class="relative text-center">
        <p class="m-0 text-[1.65rem] font-semibold tracking-tight text-[#1c1c1c]">{{ label }}</p>
        <p class="m-0 text-xs text-[#6b6b6b]">Work Time</p>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full border-0 bg-[#1c1c1c] text-white"
        aria-label="Play"
        @click="play"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full border border-[#e8e4dc] bg-white text-[#1c1c1c]"
        aria-label="Pause"
        @click="pause"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
        </svg>
      </button>
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full border-0 bg-[#1c1c1c] text-white"
        aria-label="Timer"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="13" r="7" />
          <path d="M12 10v3l2 1M9 3h6" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>
