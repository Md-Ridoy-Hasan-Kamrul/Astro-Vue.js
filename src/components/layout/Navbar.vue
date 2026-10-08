<script setup lang="ts">
/**
 * Shared site navbar (Layout).
 * Desktop, Laptop L, and Laptop (≥1020px): Liquid Glass Navbar, animated.
 * Below 1020px: fullscreen menu, no entrance motion.
 *
 * Active route/section is driven from the live URL + scroll spy.
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue';
import LiquidGlassButton from '../ui/LiquidGlassButton.vue';
import { ParticleEngine, type ParticleNavOptions } from '../../lib/particleNav';
import {
  getLenis,
  glideToElement,
  pauseSmoothScroll,
  resumeSmoothScroll,
} from '../../lib/smoothScroll';

const props = withDefaults(
  defineProps<{
    surface?: 'dark' | 'light';
    /** Astro pathname for first paint; client sync overrides after mount. */
    currentPath?: string;
  }>(),
  { surface: 'light', currentPath: '/' },
);

const SECTION_IDS = [
  'partner',
  'showcase',
  'orbit-projects',
  'capabilities',
  'specialists',
  'client-stories',
  'faq',
] as const;
type SectionId = (typeof SECTION_IDS)[number];
type LinkMatch = SectionId;

const open = ref(false);
const path = ref(normalizePath(props.currentPath));
const hash = ref('');
const scrolledSection = ref<SectionId | ''>('');
const liveSurface = ref(props.surface);

const isDark = computed(() => liveSurface.value === 'dark');

function normalizePath(value: string) {
  if (!value || value === '') return '/';
  if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1);
  return value;
}

function surfaceForPath(pathname: string): 'dark' | 'light' {
  const normalized = normalizePath(pathname);
  return normalized === '/login' ? 'dark' : 'light';
}

function syncFromLocation() {
  if (typeof window === 'undefined') return;
  path.value = normalizePath(window.location.pathname);
  hash.value = window.location.hash;
  liveSurface.value = surfaceForPath(path.value);
  if (path.value !== '/') scrolledSection.value = '';
}

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

// Sync body overflow & smooth scroll with open state
watch(
  open,
  (isOpen) => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) pauseSmoothScroll();
    else resumeSmoothScroll();
  },
  { flush: 'sync' },
);

// Escape key to close menu
watchEffect((onCleanup) => {
  if (!open.value || typeof document === 'undefined') return;
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  onCleanup(() => document.removeEventListener('keydown', onKey));
});

let navCleanup: (() => void) | null = null;

function navOffset() {
  const header = document.querySelector('header');
  const height = header?.getBoundingClientRect().height ?? 88;
  // The open mobile menu is fixed inside the header. Don't let that
  // stretch the spy line down the page and mark FAQ while Hero is on screen.
  return Math.min(height, 120) + 8;
}

function sectionInView(): SectionId | '' {
  // A little below the bar, so a section parked under the navbar still counts.
  const line = navOffset() + 48;
  let best: SectionId | '' = '';
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line) best = id;
  }
  return best;
}

function writeHash(next: string) {
  const current = window.location.hash;
  if (current === next) {
    hash.value = next;
    return;
  }
  const url = next
    ? `${window.location.pathname}${window.location.search}${next}`
    : `${window.location.pathname}${window.location.search}`;
  history.replaceState(null, '', url);
  hash.value = next;
}

function updateActiveSection() {
  if (normalizePath(window.location.pathname) !== '/') {
    scrolledSection.value = '';
    return;
  }

  const best = sectionInView();
  scrolledSection.value = best;
  if (!best && window.scrollY < navOffset()) {
    writeHash('');
    return;
  }
  if (best) writeHash(`#${best}`);
}

function goToSection(event: MouseEvent, match: LinkMatch) {
  // Off the home page, let the real /#section link load the landing page.
  if (normalizePath(window.location.pathname) !== '/') {
    close();
    return;
  }
  // Lenis also listens for anchor clicks and would start a second, lerp-based
  // scroll. That second scroll is what launches like a rocket and fights the way back.
  event.preventDefault();
  event.stopPropagation();
  // Blur before the menu unmounts. A focused link inside the fixed menu
  // otherwise makes the browser jump the page on its own.
  (event.currentTarget as HTMLElement | null)?.blur();
  const menuOpen = open.value;
  // Keep focus on the menu button. Blurring a link inside the fixed
  // menu makes the browser jump the document on its own.
  const menuButton = document.querySelector(
    'header button[aria-controls="fullscreen-menu"]',
  );
  if (menuButton instanceof HTMLElement) menuButton.focus({ preventScroll: true });
  close();

  const beginGlide = () => {
    const target = document.getElementById(match);
    if (!target) return;
    // Measure after the menu is gone. While it is open the page can still
    // be laid out at the previous width, and that stale distance misses FAQ.
    glideToElement(target, updateActiveSection);
  };

  // The menu close clears an overflow clip that would swallow the jump.
  if (menuOpen) window.setTimeout(beginGlide, 80);
  else beginGlide();
}

onMounted(() => {
  function onHashChange() {
    hash.value = window.location.hash;
    updateActiveSection();
  }

  function onPageLoad() {
    close();
    syncFromLocation();
    onHashChange();
    updateActiveSection();
  }

  syncFromLocation();
  onHashChange();
  updateActiveSection();
  nextTick(movePill);
  startParticles();
  if (desktopNav.value && typeof ResizeObserver !== 'undefined') {
    pillObserver = new ResizeObserver(() => movePill());
    pillObserver.observe(desktopNav.value);
  }
  document.fonts?.ready.then(() => movePill()).catch(() => {});

  let detachLenis: (() => void) | null = null;
  function attachLenis() {
    if (detachLenis) return;
    const lenis = getLenis();
    if (!lenis) return;
    lenis.on('scroll', updateActiveSection);
    detachLenis = () => lenis.off('scroll', updateActiveSection);
  }
  attachLenis();
  const lenisTimer = window.setInterval(() => {
    attachLenis();
    if (detachLenis) window.clearInterval(lenisTimer);
  }, 250);
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('popstate', syncFromLocation);
  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:after-swap', onPageLoad);

  navCleanup = () => {
    window.clearInterval(lenisTimer);
    detachLenis?.();
    window.removeEventListener('scroll', updateActiveSection);
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('popstate', syncFromLocation);
    document.removeEventListener('astro:page-load', onPageLoad);
    document.removeEventListener('astro:after-swap', onPageLoad);
  };
});

watch([scrolledSection, path], () => nextTick(movePill));

onUnmounted(() => {
  stopParticles();
  pillObserver?.disconnect();
  navCleanup?.();
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

const links = [
  { href: '/#partner', label: 'Partner', match: 'partner' as const },
  { href: '/#showcase', label: 'Showcase', match: 'showcase' as const },
  { href: '/#orbit-projects', label: 'Motion', match: 'orbit-projects' as const },
  { href: '/#capabilities', label: 'Capabilities', match: 'capabilities' as const },
  { href: '/#specialists', label: 'Specialists', match: 'specialists' as const },
  { href: '/#client-stories', label: 'Clients', match: 'client-stories' as const },
  { href: '/#faq', label: 'FAQ', match: 'faq' as const },
] as const;

const socials = [
  { href: 'https://docs.astro.build', label: 'Astro' },
  { href: 'https://vuejs.org/guide/introduction.html', label: 'Vue' },
  { href: 'https://github.com/withastro/astro', label: 'GitHub' },
] as const;

function isActive(match: LinkMatch) {
  if (path.value !== '/') return false;
  return scrolledSection.value === match;
}

// The hover highlight is the particle capsule (src/lib/particleNav.ts), which marks the
// hovered link with `.is-hot`.
function linkClass(match: LinkMatch) {
  const base =
    'pn-link relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-2 text-[0.8125rem] font-semibold tracking-[-0.01em] no-underline transition-colors duration-[420ms] ease-[cubic-bezier(.2,.8,.2,1)]';
  if (isActive(match)) return `${base} text-[#0a0a0c]`;
  return `${base} text-[#0a0a0c]/80 hover:text-[#0a0a0c] [&.is-hot]:text-[#0a0a0c]`;
}

const desktopNav = ref<HTMLElement | null>(null);
const linkEls = new Map<LinkMatch, HTMLElement>();
const pillReady = ref(false);
const pill = ref({ x: 0, y: 0, width: 0, height: 0, on: false });

const pillStyle = computed(() => ({
  transform: `translate(${pill.value.x}px, ${pill.value.y}px)`,
  width: `${pill.value.width}px`,
  height: `${pill.value.height}px`,
  opacity: pill.value.on ? '1' : '0',
}));

function registerLink(match: LinkMatch, el: unknown) {
  if (el instanceof HTMLElement) linkEls.set(match, el);
  else linkEls.delete(match);
}

function movePill() {
  const nav = desktopNav.value;
  const match = path.value === '/' ? scrolledSection.value : '';
  const link = match ? linkEls.get(match) : undefined;
  if (!nav || !link) {
    pill.value = { ...pill.value, on: false };
    return;
  }
  const navBox = nav.getBoundingClientRect();
  const box = link.getBoundingClientRect();
  if (box.width < 1 || navBox.width < 1) {
    pill.value = { ...pill.value, on: false };
    return;
  }
  const next = {
    x: box.left - navBox.left,
    y: box.top - navBox.top,
    width: box.width,
    height: box.height,
    on: true,
  };
  pill.value = next;
  if (!pillReady.value) requestAnimationFrame(() => {
    pillReady.value = true;
  });
}

let pillObserver: ResizeObserver | null = null;

// Particle Navbar defaults; only the colours follow this navbar's ink.
const particleRoot = ref<HTMLElement | null>(null);
const particleCanvas = ref<HTMLCanvasElement | null>(null);
let particles: ParticleEngine | null = null;
let stopParticles = () => {};

function particleOptions(reduced: boolean): ParticleNavOptions {
  return {
    color: '#0a0a0c',
    hoverColor: '#0a0a0c',
    density: 1,
    size: 1.2,
    glow: 0.6,
    twinkle: 0.5,
    gather: 0.45,
    speed: 1,
    drift: 0.5,
    cursor: 0.5,
    assemble: true,
    hasButton: true,
    radius: 999,
    reduced,
  };
}

function startParticles() {
  const root = particleRoot.value;
  const canvas = particleCanvas.value;
  if (!root || !canvas) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  particles = new ParticleEngine(root, canvas, particleOptions(motion.matches));
  const onMotion = () => particles?.setOptions(particleOptions(motion.matches));
  motion.addEventListener('change', onMotion);
  stopParticles = () => {
    motion.removeEventListener('change', onMotion);
    particles?.destroy();
    particles = null;
  };
}

const cream = '#f5f3ee';
const ink = '#111111';
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-40 w-full max-w-[100vw] overflow-x-clip bg-transparent"
  >
    <!-- Desktop: Liquid Glass -->
    <div class="nav-shell hidden px-[clamp(0.75rem,3vw,1.25rem)] pb-2 pt-3 min-[1020px]:block">
      <div
        ref="particleRoot"
        class="relative isolate mx-auto w-[min(100%,76rem)] rounded-full p-0.75 [background:linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(244,245,247,0.55)_40%,rgba(255,255,255,0.7)_100%)] [box-shadow:0.29px_4.36px_2.18px_rgba(0,0,0,0.01),0.48px_7.24px_3.63px_rgba(0,0,0,0.01),0.78px_11.7px_5.86px_rgba(0,0,0,0.015),1.28px_19.15px_9.6px_rgba(0,0,0,0.02),2.2px_32.97px_16.52px_rgba(0,0,0,0.025),4px_60px_30.07px_rgba(0,0,0,0.04)]"
      >
        <!-- Glass sits on its own layer so the particles can run between it and the labels. -->
        <div
          class="pointer-events-none absolute inset-0.75 rounded-full bg-[#f4f5f7]/55 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),inset_0_-1px_1.5px_rgba(20,33,43,0.04)] backdrop-blur-xl"
          aria-hidden="true"
        ></div>
        <canvas
          ref="particleCanvas"
          class="pointer-events-none absolute -top-11 -left-11 z-1 block w-[calc(100%+88px)]"
          aria-hidden="true"
        ></canvas>
        <div
          class="pn-bar relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-full px-2 py-2 pl-3"
        >
          <a href="/" class="relative z-10 inline-flex shrink-0 items-center gap-1.5 no-underline" data-astro-prefetch>
            <span
              class="grid size-7.5 place-items-center rounded-[0.2rem] [background:linear-gradient(135deg,#f4f5f8_0%,#c4c8d0_55%,#9ea2ac_100%)] [box-shadow:inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_7px_-1px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              <span class="size-2 rotate-45 rounded-xs bg-[#0e0e12]"></span>
            </span>
            <span class="font-display text-[0.9375rem] font-extrabold tracking-[-0.01em] text-[#0a0a0c]">
              Astro Vue
            </span>
          </a>

          <nav
            ref="desktopNav"
            class="pn-links relative flex min-w-0 flex-1 items-center justify-center gap-0.5"
            aria-label="Primary"
          >
            <span
              class="pointer-events-none absolute top-0 left-0 z-0 rounded-full bg-[#f7f7f8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(0,0,0,0.08)]"
              :class="pillReady ? 'nav-pill' : ''"
              :style="pillStyle"
              aria-hidden="true"
            />
            <a
              v-for="link in links"
              :key="link.href"
              :ref="(el) => registerLink(link.match, el)"
              :href="link.href"
              :class="linkClass(link.match)"
              :aria-current="isActive(link.match) ? 'page' : undefined"
              @click="goToSection($event, link.match)"
            >
              {{ link.label }}
            </a>
          </nav>

          <LiquidGlassButton href="/contact" label="Contact Us" size="sm" class="pn-cta z-10 shrink-0 overflow-hidden" />
        </div>
      </div>
    </div>

    <!-- Below 1020px: fullscreen menu, no entrance motion -->
    <div class="min-[1020px]:hidden">
      <div
        class="flex h-16 items-center justify-between gap-2 px-[clamp(0.5rem,3vw,1.75rem)] min-[375px]:gap-3 min-[768px]:h-20"
      >
        <a href="/" class="inline-flex min-w-0 items-center gap-1 no-underline" @click="close">
          <span
            class="truncate font-display text-xl font-normal italic leading-none tracking-tight min-[375px]:text-2xl"
            :style="`color: ${isDark ? cream : ink}`"
          >
            Astro Vue
          </span>
        </a>

        <button
          type="button"
          class="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2.5 transition hover:scale-110 min-[375px]:w-32 min-[375px]:gap-3 min-[375px]:px-5"
          :style="`border-color: ${isDark ? 'rgba(245, 243, 238, 0.25)' : 'rgba(10, 10, 10, 0.3)'}; color: ${isDark ? cream : ink}`"
          :aria-expanded="open"
          aria-controls="fullscreen-menu"
          :aria-label="open ? 'Close' : 'Menu'"
          @click="toggle"
        >
          <span
            class="relative hidden h-3.5 w-12.5 overflow-hidden text-[0.8125rem] font-medium uppercase tracking-[0.14em] min-[375px]:block"
            aria-hidden="true"
          >
            <span
              :class="`absolute left-0 top-0 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? '-translate-y-2.5 opacity-0' : 'translate-y-0 opacity-100'}`"
            >Menu</span>
            <span
              :class="`absolute left-0 top-0 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'}`"
            >Close</span>
          </span>
          <span class="relative block size-5" aria-hidden="true">
            <span
              :class="`absolute left-px top-1.5 block h-0.5 w-4.5 rounded-xs transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'top-2.25 rotate-45' : ''}`"
              :style="`background-color: ${isDark ? cream : ink}`"
            ></span>
            <span
              :class="`absolute left-px top-3 block h-0.5 w-4.5 rounded-xs transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'top-2.25 -rotate-45' : ''}`"
              :style="`background-color: ${isDark ? cream : ink}`"
            ></span>
          </span>
        </button>
      </div>

      <div
        v-if="open"
        id="fullscreen-menu"
        :class="`fixed inset-0 z-50 flex flex-col overflow-auto overscroll-contain ${isDark ? 'bg-[#0a0a0a] text-[#f5f3ee]' : 'bg-[#f5f3ee] text-[#111]'}`"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div
          class="flex h-16 shrink-0 items-center justify-between gap-3 px-[clamp(0.5rem,3vw,1.75rem)] min-[768px]:h-20"
        >
          <a href="/" class="inline-flex items-center no-underline" @click="close">
            <span
              class="font-display text-2xl font-normal italic leading-none tracking-tight"
              :style="`color: ${isDark ? cream : ink}`"
            >Astro Vue</span>
          </a>
          <button
            type="button"
            class="inline-flex w-32 cursor-pointer items-center justify-center gap-3 rounded-full border px-5 py-2.5 transition hover:scale-110"
            :style="`border-color: ${isDark ? 'rgba(245, 243, 238, 0.25)' : 'rgba(10, 10, 10, 0.3)'}; color: ${isDark ? cream : ink}`"
            @click="close"
          >
            <span class="text-[0.8125rem] font-medium uppercase tracking-[0.14em]">Close</span>
            <span class="relative block size-5" aria-hidden="true">
              <span
                class="absolute left-px top-2.25 block h-0.5 w-4.5 rotate-45 rounded-xs"
                :style="`background-color: ${isDark ? cream : ink}`"
              ></span>
              <span
                class="absolute left-px top-2.25 block h-0.5 w-4.5 -rotate-45 rounded-xs"
                :style="`background-color: ${isDark ? cream : ink}`"
              ></span>
            </span>
          </button>
        </div>

        <nav
          class="flex flex-1 flex-col justify-center gap-0 px-[clamp(0.75rem,4vw,2.5rem)] py-6"
          aria-label="Primary"
        >
          <a
            v-for="(link, index) in links"
            :key="link.href"
            :href="link.href"
            :class="`group flex items-baseline gap-4 border-b py-[clamp(0.85rem,2.8vw,1.35rem)] no-underline ${isDark ? 'border-white/10' : 'border-black/10'}`"
            @click="goToSection($event, link.match)"
            :aria-current="isActive(link.match) ? 'page' : undefined"
          >
            <span
              :class="`font-mono text-[0.75rem] font-semibold tracking-wider tabular-nums ${isDark ? 'text-[#8a8782]' : 'text-sea'}`"
            >{{ String(index + 1).padStart(2, '0') }}</span>
            <span
              :class="`font-display text-[clamp(2rem,9vw,4.5rem)] font-normal italic leading-none tracking-tight transition group-hover:opacity-70 ${isActive(link.match) ? 'underline decoration-2 underline-offset-8' : ''}`"
              :style="`color: ${isDark ? cream : ink}`"
            >{{ link.label }}</span>
          </a>
        </nav>

        <div
          :class="`mt-auto flex flex-col gap-4 px-[clamp(0.75rem,4vw,2.5rem)] py-5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between ${isDark ? '' : 'border-t border-black/14'}`"
        >
          <div class="flex flex-col gap-2 text-sm">
            <a
              href="mailto:hello@astrovue.dev"
              class="font-medium no-underline hover:opacity-70"
              :style="`color: ${isDark ? cream : ink}`"
            >hello@astrovue.dev</a>
            <div class="flex flex-wrap gap-4">
              <a
                v-for="item in socials"
                :key="item.href"
                :href="item.href"
                :class="`font-medium no-underline hover:opacity-70 ${isDark ? 'text-[#8a8782]' : 'text-ink-soft'}`"
                target="_blank"
                rel="noopener noreferrer"
                @click="close"
              >{{ item.label }}</a>
            </div>
          </div>
          <LiquidGlassButton
            href="/contact"
            label="Contact Us"
            :surface="isDark ? 'dark' : 'light'"
            :on-click="close"
            class="self-start min-[768px]:self-auto"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<style>
@keyframes nav-in {
  from {
    opacity: 0;
    transform: translateY(-0.75rem);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (min-width: 1020px) {
  .nav-shell {
    animation: nav-in 640ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .nav-pill {
    transition:
      transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
      width 520ms cubic-bezier(0.22, 1, 0.36, 1),
      height 520ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 240ms ease;
  }
}

@media (max-width: 1019px), (prefers-reduced-motion: reduce) {
  .nav-shell {
    animation: none;
  }

  .nav-pill {
    transition: none;
  }
}
</style>
