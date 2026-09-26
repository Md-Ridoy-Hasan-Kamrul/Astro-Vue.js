<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <Toaster
    theme="light"
    position="bottom-right"
    rich-colors
    close-button
    :toast-options="{ duration: 3500 }"
  />
</template>
