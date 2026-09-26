<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_NAME_MAX,
  type FeedbackFieldErrors,
  type FeedbackInput,
  validateFeedback,
} from '../../lib/feedback/validateFeedback';
import { submitFeedback } from '../../lib/feedback/submitFeedback';
import { getAxiosErrorMessage } from '../../lib/api/axios';
import { getMutationViewState } from '../../lib/query/queryUi';
import AsyncStatus from '../ui/AsyncStatus.vue';
import LiquidGlassButton from '../ui/LiquidGlassButton.vue';

const name = ref('');
const email = ref('');
const message = ref('');
const fieldErrors = ref<FeedbackFieldErrors>({});
const formError = ref<string | null>(null);
const justSent = ref(false);

const feedbackMutation = useMutation({
  mutationFn: (input: FeedbackInput) => submitFeedback(input),
  onSuccess: (result) => {
    if (!result.ok) {
      fieldErrors.value = result.errors ?? {};
      formError.value = result.message ?? 'Check the highlighted fields.';
      justSent.value = false;
      toast.error('Please fix the form', { description: formError.value });
      return;
    }
    fieldErrors.value = {};
    formError.value = null;
    name.value = '';
    email.value = '';
    message.value = '';
    justSent.value = true;
    toast.success('Feedback sent', { description: 'Thanks — we saved your message.' });
  },
  onError: (error) => {
    justSent.value = false;
    formError.value = getAxiosErrorMessage(error);
    toast.error('Could not send feedback', { description: formError.value });
  },
});

const mutationView = computed(() =>
  getMutationViewState({
    isPending: feedbackMutation.isPending,
    isError: Boolean(formError.value) || feedbackMutation.isError,
    isSuccess: justSent.value && !feedbackMutation.isPending,
  }),
);

const isBusy = computed(() => feedbackMutation.isPending);

function onSubmit(event: Event) {
  event.preventDefault();
  justSent.value = false;
  formError.value = null;

  const parsed = validateFeedback({
    name: name.value,
    email: email.value,
    message: message.value,
  });
  if (!parsed.ok) {
    fieldErrors.value = parsed.errors;
    formError.value = 'Please fix the highlighted fields.';
    toast.error('Please fix the form');
    return;
  }

  fieldErrors.value = {};
  feedbackMutation.mutate(parsed.data);
}

function clearStatus() {
  formError.value = null;
  justSent.value = false;
  feedbackMutation.reset();
}
</script>

<template>
  <form
    class="grid gap-4"
    aria-labelledby="feedback-title"
    :aria-busy="isBusy || undefined"
    @submit="onSubmit"
    novalidate
  >
    <AsyncStatus v-if="mutationView === 'loading'" tone="info" title="Sending feedback…" :busy="true" />
    <AsyncStatus
      v-else-if="mutationView === 'error' && formError"
      tone="danger"
      title="Could not send feedback"
      :description="formError"
      action-label="Dismiss"
      :on-action="clearStatus"
    />
    <AsyncStatus
      v-else-if="mutationView === 'success'"
      tone="success"
      title="Feedback sent"
      description="Thanks — your message was saved."
      action-label="Send another"
      :on-action="clearStatus"
    />

    <div class="grid gap-1.5">
      <label class="text-sm font-semibold text-ink" for="feedback-name">Name</label>
      <input
        id="feedback-name"
        name="name"
        type="text"
        autocomplete="name"
        :maxlength="FEEDBACK_NAME_MAX"
        :disabled="isBusy"
        class="min-h-11 rounded-[0.35rem] border border-line bg-paper px-3 text-ink outline-none focus:border-sea disabled:cursor-not-allowed disabled:opacity-60"
        v-model="name"
        :aria-invalid="fieldErrors.name ? 'true' : undefined"
        :aria-describedby="fieldErrors.name ? 'feedback-name-error' : undefined"
      />
      <p
        v-if="fieldErrors.name"
        id="feedback-name-error"
        class="m-0 text-sm text-accent"
        role="alert"
      >{{ fieldErrors.name }}</p>
    </div>

    <div class="grid gap-1.5">
      <label class="text-sm font-semibold text-ink" for="feedback-email">Email</label>
      <input
        id="feedback-email"
        name="email"
        type="email"
        autocomplete="email"
        :disabled="isBusy"
        class="min-h-11 rounded-[0.35rem] border border-line bg-paper px-3 text-ink outline-none focus:border-sea disabled:cursor-not-allowed disabled:opacity-60"
        v-model="email"
        :aria-invalid="fieldErrors.email ? 'true' : undefined"
        :aria-describedby="fieldErrors.email ? 'feedback-email-error' : undefined"
      />
      <p
        v-if="fieldErrors.email"
        id="feedback-email-error"
        class="m-0 text-sm text-accent"
        role="alert"
      >{{ fieldErrors.email }}</p>
    </div>

    <div class="grid gap-1.5">
      <label class="text-sm font-semibold text-ink" for="feedback-message">Message</label>
      <textarea
        id="feedback-message"
        name="message"
        rows="4"
        :maxlength="FEEDBACK_MESSAGE_MAX"
        :disabled="isBusy"
        class="rounded-[0.35rem] border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-sea disabled:cursor-not-allowed disabled:opacity-60"
        v-model="message"
        :aria-invalid="fieldErrors.message ? 'true' : undefined"
        :aria-describedby="fieldErrors.message ? 'feedback-message-error' : undefined"
      ></textarea>
      <p
        v-if="fieldErrors.message"
        id="feedback-message-error"
        class="m-0 text-sm text-accent"
        role="alert"
      >{{ fieldErrors.message }}</p>
      <p v-else-if="!message.trim()" class="m-0 text-sm text-ink-soft">
        Share what worked, what broke, or what to try next.
      </p>
    </div>

    <LiquidGlassButton
      type="submit"
      :label="isBusy ? 'Sending…' : 'Send feedback'"
      :disabled="isBusy"
      class="justify-self-start"
    />
  </form>
</template>
