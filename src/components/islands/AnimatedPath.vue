<script setup lang="ts">
/**
 * Animated Path — Vue port of
 * https://framer.com/m/AnimatedPath-zpq9rv.js@POpugJ0TBxWL4GA458rY
 * Exact Framer viewBox / PROCESS_PATH / trail mask behavior.
 */
import { ref, computed, watchEffect, onUnmounted } from 'vue';
import {
  FRAMER_POINTS,
  FRAMER_PROCESS_PATH,
  FRAMER_VIEW_HEIGHT,
  FRAMER_VIEW_WIDTH,
  type PathPoint,
} from '../../lib/animatedPath';

const props = withDefaults(
  defineProps<{
    path?: string;
    points?: PathPoint[];
    viewWidth?: number;
    viewHeight?: number;
    lineColor?: string;
    dotColor?: string;
    strokeWidth?: number;
    dashLength?: number;
    gapLength?: number;
    dotSize?: number;
    speed?: number;
    trailLength?: number;
    startDelay?: number;
    startOnView?: boolean;
    showBase?: boolean;
    baseOpacity?: number;
    class?: string;
  }>(),
  {
    path: FRAMER_PROCESS_PATH,
    points: () => FRAMER_POINTS,
    viewWidth: FRAMER_VIEW_WIDTH,
    viewHeight: FRAMER_VIEW_HEIGHT,
    lineColor: '#111111',
    dotColor: '#111111',
    strokeWidth: 1,
    dashLength: 7,
    gapLength: 7,
    dotSize: 11,
    speed: 130,
    trailLength: 0.3,
    startDelay: 0,
    startOnView: true,
    showBase: true,
    baseOpacity: 0.16,
    class: '',
  },
);

const containerEl = ref<HTMLDivElement>();
const measurementPath = ref<SVGPathElement>();
const started = ref(!props.startOnView);
const pathLength = ref(800);
const uid = `ap-${Math.random().toString(36).slice(2, 9)}`;

const animationName = `smooth-process-flow-${uid}`;
const animationClass = `smooth-process-path-${uid}`;

const animationDuration = computed(() =>
  Math.max(pathLength.value / Math.max(props.speed, 1), 0.4),
);
const normalizedTrail = computed(() =>
  Math.max(0.01, Math.min(props.trailLength, 0.9999)),
);
const normalizedGap = computed(() => 1 - normalizedTrail.value);

let styleEl: HTMLStyleElement | null = null;

function syncStyles() {
  if (typeof document === 'undefined') return;
  const css = `
@keyframes ${animationName} {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -1; }
}
.${animationClass} {
  animation-name: ${animationName};
  animation-duration: ${animationDuration.value}s;
  animation-delay: ${Math.max(props.startDelay, 0)}s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  will-change: stroke-dashoffset;
}
@media (prefers-reduced-motion: reduce) {
  .${animationClass} {
    animation: none !important;
    stroke-dashoffset: 0 !important;
  }
}`;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.animatedPath = uid;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

// Re-sync styles when animation duration or delay changes
watchEffect(() => {
  void animationDuration.value;
  void props.startDelay;
  syncStyles();
});

// Measure path length and set up intersection observer after mount
watchEffect((onCleanup) => {
  const el = containerEl.value;
  const mp = measurementPath.value;
  if (!el || !mp) return;

  const measured = mp.getTotalLength();
  if (measured > 0) pathLength.value = measured;
  syncStyles();

  if (!props.startOnView) {
    started.value = true;
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => { started.value = entry.isIntersecting; },
    { threshold: 0.15 },
  );
  observer.observe(el);
  onCleanup(() => observer.disconnect());
});

onUnmounted(() => {
  styleEl?.remove();
  styleEl = null;
});
</script>

<template>
  <div
    ref="containerEl"
    :class="`pointer-events-none relative h-full w-full overflow-visible ${props.class}`"
    aria-hidden="true"
  >
    <svg
      width="100%"
      height="100%"
      :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
      preserveAspectRatio="none"
      class="absolute inset-0 block overflow-visible"
    >
      <path
        ref="measurementPath"
        :d="path"
        fill="none"
        stroke="transparent"
        stroke-width="1"
      />

      <defs>
        <mask
          :id="`moving-trail-mask-${uid}`"
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="-100"
          y="-100"
          :width="viewWidth + 200"
          :height="viewHeight + 200"
        >
          <path
            :d="path"
            pathLength="1"
            fill="none"
            stroke="white"
            :stroke-width="Math.max(strokeWidth + 14, 18)"
            stroke-linecap="round"
            :stroke-dasharray="`${normalizedTrail} ${normalizedGap}`"
            stroke-dashoffset="0"
            :class="started ? animationClass : undefined"
          />
        </mask>
      </defs>

      <path
        v-if="showBase"
        :d="path"
        fill="none"
        :stroke="lineColor"
        :stroke-width="strokeWidth"
        :stroke-dasharray="`${dashLength} ${gapLength}`"
        stroke-linecap="round"
        :opacity="baseOpacity"
        vector-effect="non-scaling-stroke"
      />

      <path
        :d="path"
        fill="none"
        :stroke="lineColor"
        :stroke-width="strokeWidth"
        :stroke-dasharray="`${dashLength} ${gapLength}`"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
        :mask="started ? `url(#moving-trail-mask-${uid})` : undefined"
      />

      <circle
        v-for="(point, i) in points"
        :key="i"
        :cx="point.x"
        :cy="point.y"
        :r="dotSize / 2"
        :fill="dotColor"
      />
    </svg>
  </div>
</template>
