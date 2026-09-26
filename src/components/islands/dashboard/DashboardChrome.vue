<script setup lang="ts">
/**
 * Crextio top chrome — persists across dashboard soft navigations.
 * ≥1021px: desktop pill nav.
 * ≤1020px: Clean Navbar / fullscreen menu pattern.
 */
import { ref, watch, watchEffect, onMounted, onUnmounted } from 'vue';
import { DASHBOARD_NAV, type DashboardNavId } from '../../../lib/dashboard/nav';
import { pauseSmoothScroll, resumeSmoothScroll } from '../../../lib/smoothScroll';

const active = ref<DashboardNavId>('dashboard');
const open = ref(false);

function pathToActive(pathname: string): DashboardNavId {
  const path = pathname.replace(/\/$/, '') || '/';
  const match = DASHBOARD_NAV.find(
    (item) => item.href !== '/dashboard' && (path === item.href || path.startsWith(`${item.href}/`)),
  );
  return match?.id ?? 'dashboard';
}

function syncActive() {
  active.value = pathToActive(window.location.pathname);
}

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

watch(open, (isOpen) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) pauseSmoothScroll();
  else resumeSmoothScroll();
});

watchEffect((onCleanup) => {
  if (!open.value || typeof document === 'undefined') return;
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  onCleanup(() => document.removeEventListener('keydown', onKey));
});

let chromeCleanup: (() => void) | null = null;

onMounted(() => {
  syncActive();
  document.addEventListener('astro:page-load', syncActive);
  window.addEventListener('popstate', syncActive);
  chromeCleanup = () => {
    document.removeEventListener('astro:page-load', syncActive);
    window.removeEventListener('popstate', syncActive);
    document.body.style.overflow = '';
  };
});

onUnmounted(() => {
  chromeCleanup?.();
});
</script>

<template>
  <!-- Desktop ≥1021px — unchanged composition -->
  <header class="cx-chrome hidden w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 min-[1021px]:grid">
    <a
      href="/dashboard"
      data-astro-prefetch
      class="inline-flex h-9 shrink-0 items-center rounded-full border border-[#1c1c1c] px-4 text-sm font-medium tracking-tight text-[#1c1c1c] no-underline"
    >
      Crextio
    </a>

    <nav
      class="cx-chrome__nav mx-auto flex h-11 max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-full bg-white/70 p-1 shadow-[0_10px_30px_rgb(28_28_28_/0.05)] backdrop-blur [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
      aria-label="Dashboard"
    >
      <a
        v-for="item in DASHBOARD_NAV"
        :key="item.id"
        :href="item.href"
        data-astro-prefetch
        :aria-current="item.id === active ? 'page' : undefined"
        :class="`inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-[0.8rem] font-medium whitespace-nowrap no-underline transition-colors ${item.id === active ? 'bg-[#1c1c1c] text-white' : 'text-[#1c1c1c]/75 hover:text-[#1c1c1c]'}`"
      >
        {{ item.label }}
      </a>
    </nav>

    <div class="flex h-11 shrink-0 items-center justify-end gap-2">
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-full border border-[#1c1c1c]/20 bg-white/80 px-3 text-sm font-medium text-[#1c1c1c]"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z
            M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Setting
      </button>
      <button
        type="button"
        class="grid size-9 place-items-center rounded-full border border-[#1c1c1c]/15 bg-white/80"
        aria-label="Notifications"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path
            d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm6 13a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Z"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <a
        href="/login"
        class="size-9 overflow-hidden rounded-full border border-[#1c1c1c]/15 no-underline"
        title="Sign out"
      >
        <img src="/dashboard/lora.jpg" alt="Admin" class="size-full object-cover" width="36" height="36" />
      </a>
    </div>
  </header>

  <!-- ≤1020px — Laptop / Tablet / Mobile -->
  <div class="min-[1021px]:hidden">
    <header class="flex h-14 items-center justify-between gap-2 min-[375px]:h-16 min-[768px]:h-18">
      <a
        href="/dashboard"
        data-astro-prefetch
        class="inline-flex h-9 shrink-0 items-center rounded-full border border-[#1c1c1c] px-3 text-sm font-medium tracking-tight text-[#1c1c1c] no-underline min-[375px]:px-4"
        @click="close"
      >
        Crextio
      </a>

      <div class="flex items-center gap-1.5 min-[375px]:gap-2">
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full border border-[#1c1c1c]/15 bg-white/80 min-[768px]:size-10"
          aria-label="Notifications"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm6 13a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Z"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <a
          href="/login"
          class="size-9 overflow-hidden rounded-full border border-[#1c1c1c]/15 no-underline min-[768px]:size-10"
          title="Sign out"
        >
          <img src="/dashboard/lora.jpg" alt="Admin" class="size-full object-cover" width="40" height="40" />
        </a>
        <button
          type="button"
          class="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#1c1c1c]/25 bg-white/80 px-3 text-[#1c1c1c] transition hover:bg-white min-[375px]:w-30 min-[375px]:px-4 min-[768px]:h-10"
          :aria-expanded="open"
          aria-controls="cx-fullscreen-menu"
          :aria-label="open ? 'Close' : 'Menu'"
          @click="toggle"
        >
          <span
            class="relative hidden h-3.5 w-12 overflow-hidden text-[0.75rem] font-medium uppercase tracking-[0.14em] min-[375px]:block"
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
              :class="`absolute left-px top-1.5 block h-0.5 w-4.5 rounded-xs bg-[#1c1c1c] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'top-2.25 rotate-45' : ''}`"
            ></span>
            <span
              :class="`absolute left-px top-3 block h-0.5 w-4.5 rounded-xs bg-[#1c1c1c] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'top-2.25 -rotate-45' : ''}`"
            ></span>
          </span>
        </button>
      </div>
    </header>

    <div
      v-if="open"
      id="cx-fullscreen-menu"
      class="fixed inset-0 z-50 flex flex-col overflow-auto overscroll-contain bg-[#f7f5ef] text-[#1c1c1c] motion-safe:animate-[rise_400ms_ease_both]"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard menu"
    >
      <div class="mx-auto flex h-14 w-[min(100%-1.25rem,78rem)] shrink-0 items-center justify-between gap-3 min-[375px]:h-16 min-[768px]:h-18">
        <a
          href="/dashboard"
          data-astro-prefetch
          class="inline-flex h-9 items-center rounded-full border border-[#1c1c1c] px-4 text-sm font-medium no-underline"
          @click="close"
        >
          Crextio
        </a>
        <button
          type="button"
          class="inline-flex h-9 w-30 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#1c1c1c]/25 bg-white px-4 text-[#1c1c1c] min-[768px]:h-10"
          @click="close"
        >
          <span class="text-[0.75rem] font-medium uppercase tracking-[0.14em]">Close</span>
          <span class="relative block size-5" aria-hidden="true">
            <span class="absolute left-px top-2.25 block h-0.5 w-4.5 rotate-45 rounded-xs bg-[#1c1c1c]"></span>
            <span class="absolute left-px top-2.25 block h-0.5 w-4.5 -rotate-45 rounded-xs bg-[#1c1c1c]"></span>
          </span>
        </button>
      </div>

      <nav
        class="mx-auto flex w-[min(100%-1.25rem,78rem)] flex-1 flex-col gap-1 px-0 pb-10 pt-4"
        aria-label="Dashboard"
      >
        <a
          v-for="item in DASHBOARD_NAV"
          :key="item.id"
          :href="item.href"
          data-astro-prefetch
          :aria-current="item.id === active ? 'page' : undefined"
          :class="`flex items-center justify-between gap-3 border-b border-[#1c1c1c]/10 py-4 no-underline min-[375px]:py-5 min-[768px]:py-6 ${item.id === active ? 'text-[#1c1c1c]' : 'text-[#1c1c1c]/55'}`"
          @click="close"
        >
          <span class="font-display text-[clamp(1.75rem,8vw,3.25rem)] font-semibold tracking-tight">
            {{ item.label }}
          </span>
          <span
            v-if="item.id === active"
            class="rounded-full bg-[#ffd74b] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#1c1c1c]"
          >
            Active
          </span>
        </a>
      </nav>
    </div>
  </div>
</template>
