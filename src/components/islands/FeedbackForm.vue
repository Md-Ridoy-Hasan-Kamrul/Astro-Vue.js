<script setup lang="ts">
/**
 * Query client comes from VueQueryPlugin via Astro `appEntrypoint` (`src/pages/_app.ts`).
 * Children share one client for this island app instance.
 */
import FeedbackFormPanel from './FeedbackFormPanel.vue';
import RepoStatusCard from './RepoStatusCard.vue';
</script>

<template>
  <div class="grid gap-6">
    <RepoStatusCard />
    <hr class="m-0 border-0 border-t border-line" />
    <FeedbackFormPanel />
  </div>
</template>
