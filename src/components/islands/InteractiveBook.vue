<script setup lang="ts">
/**
 * Interactive Book — Vue port of
 * https://framer.com/m/InteractiveBook-xGXc.js@uLOYl8huI2w4XDdONaRK
 * Leaf pairing, open-shift, z-offset, and rotateY timings match Framer.
 */
import { ref, computed, watch, watchEffect, onUnmounted } from 'vue';

export type BookPage = {
  title: string;
  items: string[];
  eyebrow?: string;
};

/** Framer default page size (2:3). */
const DEFAULT_BOOK_WIDTH = 400;
const DEFAULT_BOOK_HEIGHT = 600;
const MIN_BOOK_WIDTH = 168;
const PERSPECTIVE_PX = 2500;
const OPEN_SHIFT_S = 0.6;
const CLOSE_SHIFT_S = 0.8;
const FLIP_OPEN_MS = 700;
const FLIP_CLOSE_S = 0.5;
const FLIP_OPEN_EASE = '0.7s cubic-bezier(0.4, 0, 0.2, 1)';
const CLOSE_STAGGER_MS = 80;
const FLIPPING_Z_INDEX = 100;
const LEAF_Z_STEP_PX = 0.4;
const SPINE_GRADIENT_WIDTH = '12%';

const props = withDefaults(
  defineProps<{
    pages: BookPage[];
    coverTitle?: string;
    coverSubtitle?: string;
    backTitle?: string;
    backSubtitle?: string;
    width?: number;
    height?: number;
    borderRadius?: number;
    shadowColor?: string;
    shadowOpacity?: number;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowSpread?: number;
    class?: string;
  }>(),
  {
    coverTitle: 'Skills',
    coverSubtitle: 'Click to open',
    backTitle: 'Thanks',
    backSubtitle: 'Click to close',
    width: DEFAULT_BOOK_WIDTH,
    height: DEFAULT_BOOK_HEIGHT,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowBlur: 10,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    shadowSpread: 0,
    class: '',
  },
);

type Face =
  | { kind: 'cover' }
  | { kind: 'back' }
  | { kind: 'blank' }
  | { kind: 'page'; page: BookPage; index: number };

const faces = computed<Face[]>(() => {
  const list: Face[] = [{ kind: 'cover' }];
  for (let i = 0; i < props.pages.length; i++) {
    list.push({ kind: 'page', page: props.pages[i], index: i });
  }
  list.push({ kind: 'back' });
  if (list.length % 2 !== 0) list.push({ kind: 'blank' });
  return list;
});

const leafPairs = computed<[Face, Face][]>(() => {
  const pairs: [Face, Face][] = [];
  for (let i = 0; i < faces.value.length; i += 2) {
    pairs.push([faces.value[i], faces.value[i + 1] ?? { kind: 'blank' }]);
  }
  return pairs;
});

const totalLeaves = computed(() => leafPairs.value.length);
const aspectRatio = computed(() => props.height / props.width);

const stageEl = ref<HTMLDivElement | null>(null);
const containerWidth = ref(DEFAULT_BOOK_WIDTH);
const flippedCount = ref(0);
const isBookClosed = ref(true);
const bookX = ref(0);
const rotates = ref<number[]>([]);
const leafEase = ref<'open' | 'close'>('open');
const bookShiftDuration = ref(OPEN_SHIFT_S);

const bookW = computed(() =>
  Math.min(props.width, Math.max(MIN_BOOK_WIDTH, Math.floor(containerWidth.value || props.width))),
);
const bookH = computed(() => Math.round(bookW.value * aspectRatio.value));
const spreadScale = computed(() =>
  isBookClosed.value ? 1 : Math.min(1, containerWidth.value / Math.max(bookW.value * 2, 1)),
);
const stageMinHeight = computed(() => Math.ceil(bookH.value * spreadScale.value));

// ResizeObserver for stage element
let roCleanup: (() => void) | null = null;
watchEffect(() => {
  const el = stageEl.value;
  if (!el || typeof ResizeObserver === 'undefined') return;
  // Clean up previous observer
  roCleanup?.();
  const observer = new ResizeObserver((entries) => {
    const next = entries[0]?.contentRect.width;
    if (typeof next === 'number' && next > 0) containerWidth.value = next;
  });
  observer.observe(el);
  containerWidth.value = el.clientWidth || props.width;
  roCleanup = () => observer.disconnect();
});

onUnmounted(() => roCleanup?.());

// Sync rotates array length with totalLeaves
watch(
  totalLeaves,
  (n) => {
    if (rotates.value.length !== n) {
      rotates.value = Array.from({ length: n }, (_, i) =>
        i < flippedCount.value ? -180 : 0,
      );
    }
  },
  { immediate: true },
);

// Keep open shift in sync when book resizes mid-session
watch([isBookClosed, flippedCount, bookW], () => {
  if (!isBookClosed.value && flippedCount.value > 0) {
    bookX.value = bookW.value / 2;
  }
});

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw.split('').map((c) => c + c).join('')
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const closedShadow = computed(() =>
  `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowSpread}px ${hexToRgba(props.shadowColor, props.shadowOpacity)}`,
);

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function setRotate(index: number, value: number) {
  rotates.value = rotates.value.map((v, i) => (i === index ? value : v));
}

async function handleClick() {
  if (totalLeaves.value === 0) return;

  if (flippedCount.value === 0) {
    isBookClosed.value = false;
    bookShiftDuration.value = OPEN_SHIFT_S;
    bookX.value = bookW.value / 2;
  }

  if (flippedCount.value < totalLeaves.value) {
    leafEase.value = 'open';
    const indexToFlip = flippedCount.value;
    flippedCount.value += 1;
    setRotate(indexToFlip, -180);
    await wait(FLIP_OPEN_MS);
  } else {
    leafEase.value = 'close';
    bookShiftDuration.value = CLOSE_SHIFT_S;
    bookX.value = 0;
    for (let i = totalLeaves.value - 1; i >= 0; i--) {
      setRotate(i, 0);
      await wait(CLOSE_STAGGER_MS);
    }
    flippedCount.value = 0;
    isBookClosed.value = true;
  }
}

function leafZIndex(index: number) {
  const isFlipped = index < flippedCount.value;
  const isFlipping = index === flippedCount.value - 1 && flippedCount.value > 0;
  if (isFlipping) return FLIPPING_Z_INDEX;
  return isFlipped ? index : totalLeaves.value - index;
}

function leafZOffset(index: number) {
  const isFlipped = index < flippedCount.value;
  return (isFlipped ? index : totalLeaves.value - index) * LEAF_Z_STEP_PX;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void handleClick();
  }
}

const facePad = computed(() =>
  bookW.value < 280 ? 'p-4' : bookW.value < 340 ? 'p-5' : 'p-7',
);
const coverPad = computed(() => (bookW.value < 280 ? 'p-5' : 'p-8'));
const coverTitleClass = computed(() =>
  bookW.value < 280
    ? 'font-display text-[1.45rem] font-extrabold leading-none tracking-tight'
    : 'font-display text-[2.1rem] font-extrabold leading-none tracking-tight',
);
const pageTitleClass = computed(() =>
  bookW.value < 280
    ? 'mb-3 font-display text-[1rem] font-bold leading-snug tracking-tight'
    : 'mb-4 font-display text-[1.2rem] font-bold leading-snug tracking-tight',
);
const itemClass = computed(() =>
  bookW.value < 280
    ? 'rounded-[6px] border border-[rgb(20_33_43/0.12)] bg-[#eef3f5]/80 px-2 py-1 text-[0.68rem] font-medium leading-snug text-[#3a4a56]'
    : 'rounded-[6px] border border-[rgb(20_33_43/0.12)] bg-[#eef3f5]/80 px-2.5 py-1.5 text-[0.78rem] font-medium leading-snug text-[#3a4a56]',
);

const hasPages = computed(() => props.pages.length > 0);
</script>

<template>
  <div v-if="!hasPages" :class="`mx-auto w-full max-w-md ${props.class}`">
    <p
      class="m-0 rounded-xl border border-line bg-mist/50 px-4 py-6 text-center text-sm text-ink-soft"
      role="status"
    >
      No skill pages yet — add pages to open the book.
    </p>
  </div>
  <div
    v-else
    ref="stageEl"
    :class="`relative mx-auto w-full max-w-full overflow-x-clip overflow-y-visible ${props.class}`"
    :style="`min-height: ${stageMinHeight}px;`"
  >
    <div
      class="relative mx-auto flex w-full items-center justify-center"
      :style="`min-height: ${stageMinHeight}px; perspective: ${PERSPECTIVE_PX}px; transform: scale(${spreadScale}); transform-origin: center center; cursor: pointer;`"
      role="button"
      tabindex="0"
      :aria-label="isBookClosed ? 'Open skills book' : flippedCount >= totalLeaves ? 'Close skills book' : 'Turn page'"
      @click="handleClick"
      @keydown="onKeydown"
    >
      <div
        class="relative outline-none"
        :style="`width: ${bookW}px; height: ${bookH}px; position: relative; transform-style: preserve-3d; transform: translateX(${bookX}px); transition: transform ${bookShiftDuration}s ease-in-out, box-shadow 0.35s ease; box-shadow: ${isBookClosed ? closedShadow : '0px 0px 0px transparent'};`"
      >
        <div
          v-for="([front, back], index) in leafPairs"
          :key="index"
          class="absolute inset-0"
          :style="`transform-style: preserve-3d; transform-origin: left center; z-index: ${leafZIndex(index)}; transform: translateZ(${leafZOffset(index)}px); will-change: transform;`"
        >
          <div
            class="absolute inset-0"
            :style="`transform-style: preserve-3d; transform-origin: left center; transform: rotateY(${rotates[index] ?? 0}deg); transition: transform ${leafEase === 'close' ? `${FLIP_CLOSE_S}s ease-in-out` : FLIP_OPEN_EASE}; will-change: transform;`"
          >
            <!-- Front face -->
            <div
              class="absolute inset-0 overflow-hidden"
              :style="`backface-visibility: hidden; -webkit-backface-visibility: hidden; background-color: transparent; border-radius: 0px ${borderRadius}px ${borderRadius}px 0px;`"
            >
              <!-- cover -->
              <div
                v-if="front.kind === 'cover'"
                :class="`flex size-full flex-col justify-between text-hero ${coverPad}`"
                style="background: linear-gradient(145deg, #0f454c 0%, #1a6b73 48%, #14212b 100%);"
              >
                <p class="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foam/85">Stack</p>
                <div>
                  <p :class="coverTitleClass">{{ coverTitle }}</p>
                  <p class="mt-3 max-w-[16rem] text-[0.85rem] leading-snug text-hero/75">{{ coverSubtitle }}</p>
                </div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foam/70">Click to open →</p>
              </div>
              <!-- back -->
              <div
                v-else-if="front.kind === 'back'"
                :class="`flex size-full flex-col justify-between text-hero ${coverPad}`"
                style="background: linear-gradient(145deg, #14212b 0%, #0f454c 100%);"
              >
                <p class="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foam/85">End</p>
                <div>
                  <p class="font-display text-[1.5rem] font-extrabold tracking-tight min-[360px]:text-[1.75rem]">{{ backTitle }}</p>
                  <p class="mt-2 text-[0.85rem] text-hero/75">{{ backSubtitle }}</p>
                </div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foam/70">Click to close</p>
              </div>
              <!-- blank -->
              <div v-else-if="front.kind === 'blank'" class="size-full bg-paper"></div>
              <!-- page -->
              <div v-else :class="`flex size-full flex-col bg-paper text-ink ${facePad}`">
                <p class="mb-1 font-mono text-[0.68rem] font-semibold tracking-wider text-sea tabular-nums">
                  {{ String(front.index + 1).padStart(2, '0') }} / {{ String(pages.length).padStart(2, '0') }}
                </p>
                <p v-if="front.page.eyebrow" class="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sea">
                  {{ front.page.eyebrow }}
                </p>
                <h3 :class="pageTitleClass">{{ front.page.title }}</h3>
                <ul class="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-auto p-0">
                  <li v-for="(item, ii) in front.page.items" :key="ii" :class="itemClass">{{ item }}</li>
                </ul>
              </div>
              <span
                class="pointer-events-none absolute inset-y-0 left-0"
                :style="`width: ${SPINE_GRADIENT_WIDTH}; background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);`"
                aria-hidden="true"
              ></span>
            </div>

            <!-- Back face -->
            <div
              class="absolute inset-0 overflow-hidden"
              :style="`backface-visibility: hidden; -webkit-backface-visibility: hidden; background-color: transparent; transform: rotateY(180deg) translateZ(0.01px); border-radius: ${borderRadius}px 0px 0px ${borderRadius}px;`"
            >
              <!-- cover -->
              <div
                v-if="back.kind === 'cover'"
                :class="`flex size-full flex-col justify-between text-hero ${coverPad}`"
                style="background: linear-gradient(145deg, #0f454c 0%, #1a6b73 48%, #14212b 100%);"
              >
                <p class="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foam/85">Stack</p>
                <div>
                  <p :class="coverTitleClass">{{ coverTitle }}</p>
                  <p class="mt-3 max-w-[16rem] text-[0.85rem] leading-snug text-hero/75">{{ coverSubtitle }}</p>
                </div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foam/70">Click to open →</p>
              </div>
              <!-- back -->
              <div
                v-else-if="back.kind === 'back'"
                :class="`flex size-full flex-col justify-between text-hero ${coverPad}`"
                style="background: linear-gradient(145deg, #14212b 0%, #0f454c 100%);"
              >
                <p class="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-foam/85">End</p>
                <div>
                  <p class="font-display text-[1.5rem] font-extrabold tracking-tight min-[360px]:text-[1.75rem]">{{ backTitle }}</p>
                  <p class="mt-2 text-[0.85rem] text-hero/75">{{ backSubtitle }}</p>
                </div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foam/70">Click to close</p>
              </div>
              <!-- blank -->
              <div v-else-if="back.kind === 'blank'" class="size-full bg-paper"></div>
              <!-- page -->
              <div v-else :class="`flex size-full flex-col bg-paper text-ink ${facePad}`">
                <p class="mb-1 font-mono text-[0.68rem] font-semibold tracking-wider text-sea tabular-nums">
                  {{ String(back.index + 1).padStart(2, '0') }} / {{ String(pages.length).padStart(2, '0') }}
                </p>
                <p v-if="back.page.eyebrow" class="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sea">
                  {{ back.page.eyebrow }}
                </p>
                <h3 :class="pageTitleClass">{{ back.page.title }}</h3>
                <ul class="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-auto p-0">
                  <li v-for="(item, ii) in back.page.items" :key="ii" :class="itemClass">{{ item }}</li>
                </ul>
              </div>
              <span
                class="pointer-events-none absolute inset-y-0 right-0"
                :style="`width: ${SPINE_GRADIENT_WIDTH}; background: linear-gradient(to right, rgba(0,0,0,0.1), transparent); transform: scaleX(-1);`"
                aria-hidden="true"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
