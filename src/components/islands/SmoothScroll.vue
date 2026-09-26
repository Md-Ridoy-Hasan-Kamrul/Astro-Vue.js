<script setup lang="ts">
/**
 * Site-wide Lenis smooth scroll.
 * Mount once from Layout + DashboardLayout with transition:persist.
 */
import { onMounted, onUnmounted } from 'vue';
import 'lenis/dist/lenis.css';
import {
  destroySmoothScroll,
  initSmoothScroll,
  resumeSmoothScroll,
  scrollSmoothTo,
} from '../../lib/smoothScroll';

let cleanupFns: Array<() => void> = [];

onMounted(() => {
  initSmoothScroll();

  function onPageLoad() {
    initSmoothScroll();
    resumeSmoothScroll();
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      requestAnimationFrame(() => scrollSmoothTo(hash, { offset: -12 }));
    } else {
      scrollSmoothTo(0, { immediate: true });
    }
  }

  document.addEventListener('astro:page-load', onPageLoad);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onReduce = () => {
    if (reduce.matches) destroySmoothScroll();
    else initSmoothScroll();
  };
  reduce.addEventListener?.('change', onReduce);

  cleanupFns = [
    () => document.removeEventListener('astro:page-load', onPageLoad),
    () => reduce.removeEventListener?.('change', onReduce),
    () => destroySmoothScroll(),
  ];
});

onUnmounted(() => {
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
});
</script>

<template>
  <!-- No visible output — side effects only -->
</template>
