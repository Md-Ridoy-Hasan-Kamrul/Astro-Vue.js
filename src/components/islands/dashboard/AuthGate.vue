<script setup lang="ts">
/** Redirects to /login when the admin demo session is missing. */
import { onMounted } from 'vue';
import { readAdminSession } from '../../../lib/auth/session';

onMounted(() => {
  if (!readAdminSession()) {
    window.location.replace('/login');
  }
});
</script>

<template>
  <!-- No visible output — auth guard only -->
</template>
