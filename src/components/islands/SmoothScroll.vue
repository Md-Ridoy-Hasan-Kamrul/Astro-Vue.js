<script setup lang="ts">
/**
 * Site-wide Lenis smooth scroll.
 * Mount once from Layout + DashboardLayout with transition:persist.
 */
import { onMounted, onUnmounted } from 'vue';
import 'lenis/dist/lenis.css';
import {
  destroySmoothScroll,
  glideToElement,
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
    const id = hash.length > 1 ? decodeURIComponent(hash.slice(1)) : '';
    const target = id ? document.getElementById(id) : null;
    if (target) {
      requestAnimationFrame(() => glideToElement(target));
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
