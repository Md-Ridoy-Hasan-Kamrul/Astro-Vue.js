<script setup lang="ts">
/**
 * Liquid Glass Carousel — Vue port of
 * https://framer.com/m/liquid-glass-carousel-SkrkTr.js@kpCFFax8ciLkuLf0kMrs
 * (Three.js glass lens + horizontal panels — no React / Framer.)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  createLiquidGlassCarousel,
  DEFAULT_CONFIG,
  type LiquidGlassCarouselConfig,
  type LiquidGlassCarouselHandle,
  type LiquidGlassProject,
} from '../../lib/carousel/liquidGlassEngine';
import { getListViewState } from '../../lib/query/queryUi';
import AsyncStatus from '../ui/AsyncStatus.vue';

const props = withDefaults(
  defineProps<{
    projects: LiquidGlassProject[];
    config?: Partial<LiquidGlassCarouselConfig>;
    showLabels?: boolean;
    showCursor?: boolean;
    class?: string;
  }>(),
  {
    config: () => ({}),
    showLabels: true,
    showCursor: true,
    class: '',
  },
);

const mountEl = ref<HTMLDivElement>();
const cursorEl = ref<HTMLDivElement>();
const active = ref(0);
const focused = ref(false);
const entryDone = ref(true);
const initError = ref<string | null>(null);
const booting = ref(true);
const canHover = ref(true);

const listState = computed(() => getListViewState(props.projects));
const merged = computed(() => ({ ...DEFAULT_CONFIG, ...props.config }));
const current = computed(
  () => props.projects[active.value] ?? { brand: `Project ${active.value + 1}`, description: '' },
);
const total = computed(() => Math.max(props.projects.length, 1));

let handle: LiquidGlassCarouselHandle | null = null;
let mediaCleanup: (() => void) | null = null;

function closeFocus() {
  handle?.closeFocus();
}

function bindHoverMedia() {
  mediaCleanup?.();
  mediaCleanup = null;
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const media = window.matchMedia('(hover: hover) and (pointer: fine)');
  const update = () => { canHover.value = media.matches; };
  update();
  media.addEventListener?.('change', update);
  mediaCleanup = () => media.removeEventListener?.('change', update);
}

function destroyHandle() {
  try {
    handle?.destroy();
  } catch (error) {
    console.error('LiquidGlassCarousel destroy failed', error);
  }
  handle = null;
}

function startEngine() {
  if (!mountEl.value || listState.value === 'empty') {
    booting.value = listState.value !== 'empty';
    return;
  }

  destroyHandle();
  booting.value = true;
  initError.value = null;
  entryDone.value = !(props.config.entryAnimation ?? DEFAULT_CONFIG.entryAnimation);
  bindHoverMedia();

  try {
    handle = createLiquidGlassCarousel(mountEl.value, {
      projects: props.projects,
      getConfig: () => ({ ...DEFAULT_CONFIG, ...props.config }),
      cursorElement: props.showCursor && canHover.value ? cursorEl.value : null,
      onActiveChange: (i) => { active.value = i; },
      onFocusChange: (v) => { focused.value = v; },
      onEntryDone: (done) => { entryDone.value = done; },
    });
    booting.value = false;
  } catch (error) {
    console.error('LiquidGlassCarousel failed to initialize', error);
    initError.value = 'The carousel could not initialize its graphics engine.';
    entryDone.value = true;
    booting.value = false;
  }
}

function retryInit() {
  initError.value = null;
  booting.value = true;
  queueMicrotask(startEngine);
}

onMounted(() => {
  if (listState.value === 'empty') {
    booting.value = false;
    return;
  }

  let cancelled = false;
  let tries = 0;

  const waitForMount = () => {
    if (cancelled) return;
    if (!mountEl.value) {
      tries += 1;
      if (tries < 120) requestAnimationFrame(waitForMount);
      else {
        initError.value = 'The carousel mount node never became ready.';
        booting.value = false;
      }
      return;
    }
    startEngine();
  };

  requestAnimationFrame(waitForMount);
});

onUnmounted(() => {
  mediaCleanup?.();
  mediaCleanup = null;
  destroyHandle();
});
</script>

<template>
  <div
    :class="`relative h-full w-full overflow-hidden touch-none ${props.class}`"
    :style="`background: ${merged.background}; color: ${merged.foreground};`"
    role="region"
    aria-roledescription="carousel"
    aria-label="Features carousel"
    :aria-busy="booting || undefined"
  >
    <div v-if="listState === 'empty'" class="grid size-full place-items-center p-6">
      <AsyncStatus
        tone="neutral"
        title="No projects yet"
        description="Add feature cards to populate the glass carousel."
      />
    </div>
    <div v-else-if="initError" class="grid size-full place-items-center p-6">
      <AsyncStatus
        tone="danger"
        title="Carousel unavailable"
        :description="initError"
        action-label="Try again"
        :on-action="retryInit"
      />
    </div>
    <template v-else>
      <div v-if="booting" class="pointer-events-none absolute inset-0 z-2 grid place-items-center p-6">
        <AsyncStatus tone="info" title="Loading carousel…" :busy="true" />
      </div>

      <div ref="mountEl" class="absolute inset-0 touch-none"></div>

      <template v-if="showLabels">
        <div
          class="pointer-events-none absolute left-1/2 top-[10%] w-[min(92vw,32.5rem)] -translate-x-1/2 px-3 text-center transition duration-500"
          :class="entryDone ? 'opacity-100' : 'opacity-0'"
          :style="`transform: translate(-50%, ${focused ? '-4vh' : '0'}); mix-blend-mode: exclusion; color: #fff;`"
        >
          <p class="m-0 font-display text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-tight">
            {{ current.brand }}
          </p>
          <p v-if="current.description" class="mt-1 m-0 text-sm opacity-90">
            {{ current.description }}
          </p>
        </div>

        <div
          class="pointer-events-none absolute bottom-[10%] left-1/2 -translate-x-1/2 font-mono text-sm tabular-nums transition-opacity duration-500"
          :class="entryDone && !focused ? 'opacity-100' : 'opacity-0'"
          style="mix-blend-mode: exclusion; color: #fff;"
        >
          {{ String(active + 1).padStart(2, '0') }}/{{ String(total).padStart(2, '0') }}
        </div>
      </template>

      <div
        v-if="showCursor && canHover"
        ref="cursorEl"
        class="pointer-events-none absolute left-0 top-0 z-4 whitespace-nowrap"
        style="mix-blend-mode: exclusion; color: #fff; will-change: transform;"
        aria-hidden="true"
      >
        View
      </div>

      <button
        type="button"
        aria-label="Close focused project"
        class="absolute right-[4vw] top-[2vh] z-5 border-0 bg-transparent p-0 font-semibold transition-opacity duration-300"
        :style="`mix-blend-mode: exclusion; color: #fff; opacity: ${focused ? 1 : 0}; pointer-events: ${focused ? 'auto' : 'none'};`"
        @click="closeFocus"
      >
        Close
      </button>
    </template>
  </div>
</template>
