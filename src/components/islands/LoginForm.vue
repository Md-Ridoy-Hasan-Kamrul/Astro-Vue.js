<script setup lang="ts">
/**
 * Sign in + Sign up — same-width NeuroField stack
 * https://framer.com/m/NeuroField-VOsoq7.js@CwCJKv0L7J7qifRS563C
 */
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import {
  type LoginFieldErrors,
  type SignupFieldErrors,
  validateLogin,
  validateSignup,
} from '../../lib/auth/validateLogin';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DASHBOARD_PATH,
  isAdminCredentials,
} from '../../lib/auth/adminCredentials';
import { saveAdminSession } from '../../lib/auth/session';
import { getMutationViewState } from '../../lib/query/queryUi';
import AsyncStatus from '../ui/AsyncStatus.vue';
import NeuroField from '../ui/NeuroField.vue';

const SUBMIT_DELAY_MS = 450;
const FIELD_GAP_PX = 20;
const FORM_WIDTH_PX = 294;

type Mode = 'signin' | 'signup';

const mode = ref<Mode>('signin');
const name = ref('');
/** Permanent admin credentials — always prefilled for one-click dashboard login. */
const email = ref(ADMIN_EMAIL);
const password = ref(ADMIN_PASSWORD);
const confirmPassword = ref('');
const fieldErrors = ref<SignupFieldErrors>({});
const pending = ref(false);
const formError = ref<string | null>(null);
const success = ref(false);

const view = computed(() =>
  getMutationViewState({
    isPending: pending.value,
    isError: Boolean(formError.value),
    isSuccess: success.value,
  }),
);

const title = computed(() => (mode.value === 'signin' ? 'Sign in' : 'Sign up'));
const actionLabel = computed(() => (mode.value === 'signin' ? 'SIGN IN' : 'SIGN UP'));
const successTitle = computed(() => (mode.value === 'signin' ? 'Signed in' : 'Account created'));

function setMode(next: Mode) {
  mode.value = next;
  fieldErrors.value = {};
  formError.value = null;
  success.value = false;
  if (next === 'signin') {
    email.value = ADMIN_EMAIL;
    password.value = ADMIN_PASSWORD;
    confirmPassword.value = '';
    name.value = '';
  } else {
    password.value = '';
    confirmPassword.value = '';
  }
}

async function onSubmit(event: Event) {
  event.preventDefault();
  success.value = false;
  formError.value = null;

  if (mode.value === 'signin') {
    const parsed = validateLogin({ email: email.value, password: password.value });
    if (!parsed.ok) {
      fieldErrors.value = parsed.errors;
      formError.value = 'Please fix the highlighted fields.';
      toast.error('Please fix the form');
      return;
    }

    if (!isAdminCredentials(parsed.data.email, parsed.data.password)) {
      fieldErrors.value = { email: 'Use the prefilled admin account' };
      formError.value = 'Demo admin only — keep the prefilled credentials.';
      toast.error('Admin login required', {
        description: `${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`,
      });
      return;
    }

    fieldErrors.value = {};
    pending.value = true;
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
    saveAdminSession();
    toast.success('Signed in', { description: 'Opening Crextio dashboard…' });
    window.location.assign(DASHBOARD_PATH);
    return;
  }

  const parsed = validateSignup({
    name: name.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });
  if (!parsed.ok) {
    fieldErrors.value = parsed.errors;
    formError.value = 'Please fix the highlighted fields.';
    toast.error('Please fix the form');
    return;
  }

  fieldErrors.value = {};
  pending.value = true;
  await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));
  pending.value = false;
  success.value = true;
  toast.success('Account created', { description: `Welcome, ${parsed.data.name}` });
}

function resetStatus() {
  success.value = false;
  formError.value = null;
  fieldErrors.value = {};
}
</script>

<template>
  <form
    class="mx-auto grid w-full justify-items-center"
    :style="`max-width: ${FORM_WIDTH_PX}px; gap: ${FIELD_GAP_PX}px;`"
    aria-labelledby="login-title"
    :aria-busy="pending || undefined"
    @submit="onSubmit"
    novalidate
  >
    <div class="grid w-full gap-3 text-center">
      <p class="m-0 font-mono text-[0.65rem] font-normal uppercase tracking-[0.18em] text-[rgb(0,153,255)]">
        Access
      </p>
      <h1
        id="login-title"
        class="m-0 font-display text-[clamp(1.5rem,4vw,2rem)] font-bold tracking-tight text-white"
      >
        {{ title }}
      </h1>

      <div
        class="mx-auto flex w-full border border-white/25 font-mono text-[12px] uppercase tracking-[0.12em]"
        role="tablist"
        aria-label="Auth mode"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'signin'"
          :class="`flex-1 border-0 px-3 py-2 transition ${mode === 'signin' ? 'bg-[rgb(16,16,16)] text-white' : 'bg-transparent text-white/45 hover:text-white/75'}`"
          @click="setMode('signin')"
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'signup'"
          :class="`flex-1 border-0 border-l border-white/25 px-3 py-2 transition ${mode === 'signup' ? 'bg-[rgb(16,16,16)] text-white' : 'bg-transparent text-white/45 hover:text-white/75'}`"
          @click="setMode('signup')"
        >
          Sign up
        </button>
      </div>
      <p v-if="mode === 'signin'" class="m-0 font-mono text-[0.65rem] leading-relaxed text-white/45">
        Admin prefilled — click SIGN IN for the dashboard.
      </p>
    </div>

    <AsyncStatus
      v-if="view === 'loading'"
      tone="info"
      :title="mode === 'signin' ? 'Signing in…' : 'Creating account…'"
      :busy="true"
      class="w-full border-white/20 bg-white/5 text-white"
    />
    <AsyncStatus
      v-else-if="view === 'error' && formError"
      tone="danger"
      title="Could not continue"
      :description="formError"
      action-label="Dismiss"
      :on-action="resetStatus"
      class="w-full border-white/20 bg-white/5 text-white"
    />
    <AsyncStatus
      v-else-if="view === 'success'"
      tone="success"
      :title="successTitle"
      description="Demo only — nothing is stored yet."
      action-label="Continue"
      :on-action="resetStatus"
      class="w-full border-white/20 bg-white/5 text-white"
    />

    <div v-if="mode === 'signup'" class="grid w-full gap-1 justify-items-center">
      <NeuroField
        id="auth-name"
        name="name"
        type="text"
        placeholder="ENTER YOUR NAME"
        v-model="name"
        :disabled="pending"
        :invalid="Boolean(fieldErrors.name)"
        :described-by="fieldErrors.name ? 'auth-name-error' : undefined"
      />
      <p
        v-if="fieldErrors.name"
        id="auth-name-error"
        class="m-0 w-full font-mono text-[0.7rem] text-[#f07c00]"
        role="alert"
      >{{ fieldErrors.name }}</p>
    </div>

    <div class="grid w-full gap-1 justify-items-center">
      <NeuroField
        id="auth-email"
        name="email"
        type="email"
        placeholder="ENTER YOUR EMAIL"
        v-model="email"
        :disabled="pending"
        :invalid="Boolean(fieldErrors.email)"
        :described-by="fieldErrors.email ? 'auth-email-error' : undefined"
      />
      <p
        v-if="fieldErrors.email"
        id="auth-email-error"
        class="m-0 w-full font-mono text-[0.7rem] text-[#f07c00]"
        role="alert"
      >{{ fieldErrors.email }}</p>
    </div>

    <div class="grid w-full gap-1 justify-items-center">
      <NeuroField
        id="auth-password"
        name="password"
        type="password"
        placeholder="ENTER YOUR PASSWORD"
        v-model="password"
        :disabled="pending"
        :invalid="Boolean(fieldErrors.password)"
        :described-by="fieldErrors.password ? 'auth-password-error' : undefined"
      />
      <p
        v-if="fieldErrors.password"
        id="auth-password-error"
        class="m-0 w-full font-mono text-[0.7rem] text-[#f07c00]"
        role="alert"
      >{{ fieldErrors.password }}</p>
    </div>

    <div v-if="mode === 'signup'" class="grid w-full gap-1 justify-items-center">
      <NeuroField
        id="auth-confirm"
        name="confirmPassword"
        type="password"
        placeholder="CONFIRM PASSWORD"
        v-model="confirmPassword"
        :disabled="pending"
        :invalid="Boolean(fieldErrors.confirmPassword)"
        :described-by="fieldErrors.confirmPassword ? 'auth-confirm-error' : undefined"
      />
      <p
        v-if="fieldErrors.confirmPassword"
        id="auth-confirm-error"
        class="m-0 w-full font-mono text-[0.7rem] text-[#f07c00]"
        role="alert"
      >{{ fieldErrors.confirmPassword }}</p>
    </div>

    <!-- Same shell as fields — SIGN IN / SIGN UP centered full width -->
    <NeuroField
      id="auth-submit"
      name="auth-submit"
      type="text"
      :action-label="pending ? '…' : actionLabel"
      action-type="submit"
      :action-only="true"
      :disabled="pending"
      :busy="pending"
    />
  </form>
</template>
