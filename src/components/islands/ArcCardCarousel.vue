<script setup lang="ts">
/**
 * Arc Card Carousel — Vue port of
 * https://framer.com/m/ArcCardCarousel-1dvmlj.js@v1upKuQR8rveRRgNjnpY
 * (RAF drag + snap + 3D tilt — no React / GSAP.)
 */
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue';

export type ArcCard = {
  title: string;
  image: string;
  alt?: string;
  href?: string;
};

const props = withDefaults(
  defineProps<{
    items: ArcCard[];
    radius?: number;
    spacing?: number;
    cardWidth?: number;
    cardHeight?: number;
    arcOffset?: number;
    sensitivity?: number;
    tiltAmount?: number;
    eyebrow?: string;
    heading?: string;
    textColor?: string;
    mutedColor?: string;
    background?: string;
    class?: string;
  }>(),
  {
    radius: 1450,
    spacing: 10,
    cardWidth: 250,
    cardHeight: 372,
    arcOffset: 230,
    sensitivity: 1,
    tiltAmount: 20,
    eyebrow: 'FEATURES / DRAG TO EXPLORE',
    heading: 'What this stack is for',
    textColor: '#14212b',
    mutedColor: '#3a4a56',
    background: 'transparent',
    class: '',
  },
);

const list = computed(() => props.items);
const count = computed(() => list.value.length);
const period = computed(() => count.value * props.spacing);
const half = computed(() => period.value / 2);
const fadeEnd = computed(() => Math.min(88, half.value - 3));
const fadeStart = computed(() => Math.max(10, fadeEnd.value - 16));
const centerTop = computed(() => props.arcOffset + props.radius);

function wrapAngle(deg: number, periodDeg: number) {
  const h = periodDeg / 2;
  let a = deg % periodDeg;
  if (a < -h) a += periodDeg;
  if (a >= h) a -= periodDeg;
  return a;
}

function pad3(n: number) {
  return String(n).padStart(3, '0');
}

function cardTransform(theta: number, tilt: number, r: number) {
  const rad = (theta * Math.PI) / 180;
  const x = r * Math.sin(rad);
  const y = -r * Math.cos(rad);
  return `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) rotateZ(${theta}deg) rotateY(${tilt}deg)`;
}

function cardOpacity(theta: number, start: number, end: number) {
  const t = Math.abs(theta);
  if (t <= start) return 1;
  if (t >= end) return 0;
  return 1 - (t - start) / (end - start);
}

const containerEl = ref<HTMLDivElement>();
const cardEls: (HTMLDivElement | undefined)[] = [];

let rot = 0;
let tilt = 0;
let rotTween: { from: number; to: number; start: number; dur: number } | null = null;
let tiltTween: { from: number; to: number; start: number; dur: number } | null = null;
let raf: number | null = null;
let dragging = false;
let lastX = 0;
let lastT = 0;
let downX = 0;
let dragMoved = false;
let velocity = 0;
let dir = 0;
let target = 0;

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

function render() {
  for (let i = 0; i < count.value; i++) {
    const el = cardEls[i];
    if (!el) continue;
    const theta = wrapAngle(i * props.spacing - rot, period.value);
    el.style.transform = cardTransform(theta, tilt, props.radius);
    el.style.opacity = String(cardOpacity(theta, fadeStart.value, fadeEnd.value));
    el.style.zIndex = String(Math.round(1000 - Math.abs(theta)));
  }
}

function ensureFrame() {
  if (raf == null) raf = requestAnimationFrame(frame);
}

function frame(now: number) {
  raf = null;
  let active = false;
  if (rotTween) {
    const p = Math.min(1, (now - rotTween.start) / rotTween.dur);
    rot = rotTween.from + (rotTween.to - rotTween.from) * easeOutCubic(p);
    if (p >= 1) rotTween = null;
    else active = true;
  }
  if (tiltTween) {
    const p = Math.min(1, (now - tiltTween.start) / tiltTween.dur);
    tilt = tiltTween.from + (tiltTween.to - tiltTween.from) * easeOutCubic(p);
    if (p >= 1) tiltTween = null;
    else active = true;
  }
  render();
  if (active) raf = requestAnimationFrame(frame);
}

function setTilt(value: number) {
  tiltTween = { from: tilt, to: value, start: performance.now(), dur: 550 };
  ensureFrame();
}

function onDown(e: PointerEvent) {
  dragging = true;
  lastX = e.clientX;
  downX = e.clientX;
  dragMoved = false;
  lastT = performance.now();
  velocity = 0;
  dir = 0;
  rotTween = null;
  target = rot;
  if (containerEl.value) containerEl.value.style.cursor = 'grabbing';
}

function onMove(e: PointerEvent) {
  if (!dragging) return;
  const now = performance.now();
  const dx = e.clientX - lastX;
  const dt = Math.max(now - lastT, 1);
  if (Math.abs(e.clientX - downX) > 6) dragMoved = true;
  if (Math.abs(dx) > 1.5) {
    const newDir = dx > 0 ? 1 : -1;
    if (newDir !== dir) {
      dir = newDir;
      setTilt(dir * props.tiltAmount);
    }
  }
  const dDeg = -((dx / props.radius) * (180 / Math.PI) * props.sensitivity);
  target += dDeg;
  const instV = dDeg / (dt / 1000);
  velocity = velocity * 0.6 + instV * 0.4;
  rot = target;
  render();
  lastX = e.clientX;
  lastT = now;
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  dir = 0;
  if (containerEl.value) containerEl.value.style.cursor = 'grab';
  setTilt(0);
  const bias = Math.max(-props.spacing, Math.min(props.spacing, velocity * 0.08));
  const snapped = Math.round((target + bias) / props.spacing) * props.spacing;
  target = snapped;
  rotTween = { from: rot, to: snapped, start: performance.now(), dur: 600 };
  ensureFrame();
}

function onClickCapture(e: MouseEvent) {
  if (dragMoved) {
    e.preventDefault();
    e.stopPropagation();
  }
}

let eventsCleanup: (() => void) | null = null;

onMounted(() => {
  const container = containerEl.value;
  if (!container || count.value === 0) return;

  render();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    container.style.cursor = 'default';
    return;
  }

  container.style.cursor = 'grab';
  container.addEventListener('pointerdown', onDown);
  container.addEventListener('click', onClickCapture, true);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  eventsCleanup = () => {
    container.removeEventListener('pointerdown', onDown);
    container.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (raf != null) cancelAnimationFrame(raf);
  };
});

onUnmounted(() => {
  eventsCleanup?.();
  if (raf != null) cancelAnimationFrame(raf);
});

// Re-render when geometry changes
watchEffect(() => {
  void count.value;
  void props.spacing;
  void period.value;
  void props.radius;
  void fadeStart.value;
  void fadeEnd.value;
  render();
});

function setCardEl(i: number, el: Element | null) {
  cardEls[i] = (el as HTMLDivElement) ?? undefined;
}
</script>

<template>
  <div
    ref="containerEl"
    :class="`relative min-h-112 min-w-[20rem] overflow-hidden touch-pan-y ${props.class}`"
    :style="`height: 100%; background: ${background}; perspective: 1400px;`"
    role="region"
    aria-roledescription="carousel"
    :aria-label="heading"
  >
    <div
      class="absolute left-1/2 transform-3d"
      :style="`top: ${centerTop}px; width: 0; height: 0;`"
    >
      <div
        v-for="(item, i) in list"
        :key="i"
        :ref="(el) => setCardEl(i, el as Element)"
        class="absolute left-0 top-0 transform-3d will-change-[transform,opacity] backface-hidden"
        :style="`width: ${cardWidth}px; height: ${cardHeight}px; transform: ${cardTransform(wrapAngle(i * spacing, period), 0, radius)}; opacity: ${cardOpacity(wrapAngle(i * spacing, period), fadeStart, fadeEnd)}; z-index: ${Math.round(1000 - Math.abs(wrapAngle(i * spacing, period)))};`"
      >
        <a
          v-if="item.href"
          :href="item.href"
          class="block cursor-inherit no-underline"
          style="color: inherit;"
          draggable="false"
          :aria-label="item.title"
        >
          <!-- cardBody inline -->
          <div
            class="overflow-hidden rounded-sm bg-[#eee] shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
            :style="`height: ${cardHeight - 34}px;`"
          >
            <img
              :src="item.image"
              :alt="item.alt ?? item.title"
              draggable="false"
              loading="lazy"
              decoding="async"
              class="pointer-events-none block size-full select-none object-cover"
            />
          </div>
          <div class="mt-3 flex items-baseline justify-between gap-2">
            <span class="truncate text-sm font-medium tracking-tight" :style="`color: ${textColor}`">
              {{ item.title }}
            </span>
            <span class="shrink-0 text-[0.8125rem]" :style="`color: ${mutedColor}`">{{ pad3(i + 1) }}</span>
          </div>
        </a>
        <div v-else class="block">
          <!-- cardBody inline -->
          <div
            class="overflow-hidden rounded-sm bg-[#eee] shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
            :style="`height: ${cardHeight - 34}px;`"
          >
            <img
              :src="item.image"
              :alt="item.alt ?? item.title"
              draggable="false"
              loading="lazy"
              decoding="async"
              class="pointer-events-none block size-full select-none object-cover"
            />
          </div>
          <div class="mt-3 flex items-baseline justify-between gap-2">
            <span class="truncate text-sm font-medium tracking-tight" :style="`color: ${textColor}`">
              {{ item.title }}
            </span>
            <span class="shrink-0 text-[0.8125rem]" :style="`color: ${mutedColor}`">{{ pad3(i + 1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2.5 text-center min-[640px]:bottom-10">
      <span class="text-xs font-semibold uppercase tracking-[0.08em]" :style="`color: ${mutedColor}`">
        {{ eyebrow }}
      </span>
      <span
        class="font-display text-[clamp(1.25rem,3vw,1.625rem)] font-semibold tracking-tight"
        :style="`color: ${textColor}`"
      >
        {{ heading }}
      </span>
    </div>
  </div>
</template>
