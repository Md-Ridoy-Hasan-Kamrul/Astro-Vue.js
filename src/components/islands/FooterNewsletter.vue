<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import AsyncStatus from '../ui/AsyncStatus.vue';
import LiquidGlassButton from '../ui/LiquidGlassButton.vue';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBMIT_DELAY_MS = 450;

const email = ref('');
const pending = ref(false);
const fieldError = ref<string | null>(null);
const sent = ref(false);

async function onSubmit(event: Event) {
  event.preventDefault();
  const value = email.value.trim();
  fieldError.value = null;
  sent.value = false;

  if (!value) {
    fieldError.value = 'Email is required';
    return;
  }

  if (!EMAIL_PATTERN.test(value)) {
    fieldError.value = 'Enter a valid email';
    toast.error('Enter a valid email');
    return;
  }

  pending.value = true;
  await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
  pending.value = false;
  sent.value = true;
  email.value = '';
  toast.success('Subscribed', {
    description: 'Thanks — we will keep you posted.',
  });
}

function clearSuccess() {
  sent.value = false;
}
</script>

<template>
  <div class="grid w-full max-w-74 gap-2">
    <AsyncStatus
      v-if="sent"
      tone="success"
      title="Subscribed"
      description="We will keep you posted."
      action-label="Dismiss"
      :on-action="clearSuccess"
      class="text-[#ece9df]"
    />

    <form
      class="flex w-full flex-wrap items-center gap-2 min-[480px]:flex-nowrap"
      :aria-busy="pending || undefined"
      @submit="onSubmit"
      novalidate
    >
      <label class="sr-only" for="footer-email">Email</label>
      <input
        id="footer-email"
        name="email"
        type="email"
        autocomplete="email"
        placeholder="Your email"
        required
        :disabled="pending"
        v-model="email"
        :aria-invalid="fieldError ? 'true' : undefined"
        :aria-describedby="fieldError ? 'footer-email-error' : undefined"
        class="min-h-9 min-w-0 flex-1 rounded-full border border-[#ece9df]/25 bg-transparent px-4 text-[0.8125rem] text-[#ece9df] outline-none placeholder:text-[#aab5af] focus:border-[#ece9df]/50 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <LiquidGlassButton
        type="submit"
        :label="pending ? '…' : 'Subscribe'"
        size="sm"
        :disabled="pending"
      />
    </form>

    <p
      v-if="fieldError"
      id="footer-email-error"
      class="m-0 text-xs text-[#8b2e2e]"
      role="alert"
    >{{ fieldError }}</p>
  </div>
</template>
