<script setup lang="ts">
/**
 * NeuroField — Vue port of
 * https://framer.com/m/NeuroField-VOsoq7.js@CwCJKv0L7J7qifRS563C
 * Pixel match: Side_Loader fins, Space Mono, corner crosses, docked action.
 */
import { ref, computed } from 'vue';

type FieldType = 'text' | 'email' | 'password';

const FIELD_WIDTH_PX = 294;
const SHELL_PAD_PX = 5;
const LOADER_W = 8;
const LOADER_H = 30;
const ACTION_W = 100;
const SIGNAL = 'rgb(240, 124, 0)';
const SIGNAL_DARK = 'rgb(66, 34, 0)';
const LOADER_BG = 'rgb(51, 26, 0)';
const ACTION_BG = 'rgb(16, 16, 16)';

const LOADER_MASK = `M 0.6 0.515 L 7.4 0.515 C 7.731 0.515 8 0.783 8 1.115 L 8 0 L 0 0 L 0 1.115 C 0 0.783 0.269 0.515 0.6 0.515 Z M 7.4 3.375 L 0.6 3.375 C 0.269 3.375 0 3.107 0 2.775 L 0 5.471 C 0 5.14 0.269 4.871 0.6 4.871 L 7.4 4.871 C 7.731 4.871 8 5.14 8 5.471 L 8 2.775 C 8 3.107 7.731 3.375 7.4 3.375 Z M 7.4 7.732 L 0.6 7.732 C 0.269 7.732 0 7.463 0 7.132 L 0 9.828 C 0 9.497 0.269 9.228 0.6 9.228 L 7.4 9.228 C 7.731 9.228 8 9.497 8 9.828 L 8 7.132 C 8 7.463 7.731 7.732 7.4 7.732 Z M 7.4 12.088 L 0.6 12.088 C 0.269 12.088 0 11.82 0 11.488 L 0 14.185 C 0 13.853 0.269 13.585 0.6 13.585 L 7.4 13.585 C 7.731 13.585 8 13.853 8 14.185 L 8 11.488 C 8 11.82 7.731 12.088 7.4 12.088 Z M 7.4 16.445 L 0.6 16.445 C 0.269 16.445 0 16.176 0 15.845 L 0 18.541 C 0 18.21 0.269 17.941 0.6 17.941 L 7.4 17.941 C 7.731 17.941 8 18.21 8 18.541 L 8 15.845 C 8 16.176 7.731 16.445 7.4 16.445 Z M 7.4 20.802 L 0.6 20.802 C 0.269 20.802 0 20.533 0 20.202 L 0 22.898 C 0 22.566 0.269 22.298 0.6 22.298 L 7.4 22.298 C 7.731 22.298 8 22.566 8 22.898 L 8 20.202 C 8 20.533 7.731 20.802 7.4 20.802 Z M 7.4 25.158 L 0.6 25.158 C 0.269 25.158 0 24.89 0 24.558 L 0 27.254 C 0 26.923 0.269 26.654 0.6 26.654 L 7.4 26.654 C 7.731 26.654 8 26.923 8 27.254 L 8 24.558 C 8 24.89 7.731 25.158 7.4 25.158 Z M 7.4 29.515 L 0.6 29.515 C 0.269 29.515 0 29.246 0 28.915 L 0 30 L 8 30 L 8 28.915 C 8 29.246 7.731 29.515 7.4 29.515 Z`;

const EYE_W = 32;

const props = withDefaults(
  defineProps<{
    id: string;
    name: string;
    placeholder?: string;
    type?: FieldType;
    actionLabel?: string;
    actionType?: 'button' | 'submit';
    /** Full-width centered CTA (SIGN IN) instead of docked Framer SUBSCRIBE. */
    actionOnly?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    busy?: boolean;
    readOnly?: boolean;
    describedBy?: string;
    class?: string;
  }>(),
  {
    placeholder: 'ENTER YOUR EMAIL',
    type: 'text',
    actionLabel: '',
    actionType: 'button',
    actionOnly: false,
    disabled: false,
    invalid: false,
    busy: false,
    readOnly: false,
    class: '',
  },
);

const value = defineModel<string>({ default: '' });

const revealed = ref(false);

const hasAction = computed(() => Boolean(props.actionLabel) && !props.actionOnly);
const isPassword = computed(() => props.type === 'password');
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type));
const inputPadRight = computed(() =>
  hasAction.value ? ACTION_W + 4 : isPassword.value ? EYE_W + 4 : 4,
);

function toggleReveal() {
  revealed.value = !revealed.value;
}
</script>

<template>
  <div
    :class="`neuro-field relative mx-auto w-full ${props.class}`"
    :style="`padding: ${SHELL_PAD_PX}px; width: min(100%, ${FIELD_WIDTH_PX}px); max-width: ${FIELD_WIDTH_PX}px;`"
    :data-invalid="invalid ? 'true' : undefined"
  >
    <span class="neuro-field__cross neuro-field__cross--tl" aria-hidden="true">+</span>
    <span class="neuro-field__cross neuro-field__cross--tr" aria-hidden="true">+</span>
    <span class="neuro-field__cross neuro-field__cross--bl" aria-hidden="true">+</span>
    <span class="neuro-field__cross neuro-field__cross--br" aria-hidden="true">+</span>

    <span class="neuro-field__bracket neuro-field__bracket--tl" aria-hidden="true"></span>
    <span class="neuro-field__bracket neuro-field__bracket--tr" aria-hidden="true"></span>
    <span class="neuro-field__bracket neuro-field__bracket--bl" aria-hidden="true"></span>
    <span class="neuro-field__bracket neuro-field__bracket--br" aria-hidden="true"></span>

    <div
      class="neuro-field__shell relative flex items-center gap-1 border border-[rgba(255,255,255,0.25)] bg-black"
      :style="`min-height: ${LOADER_H + 2}px;`"
    >
      <div
        class="neuro-field__loader relative shrink-0 overflow-hidden"
        :style="`width: ${LOADER_W}px; height: ${LOADER_H}px; background: ${LOADER_BG};`"
        aria-hidden="true"
      >
        <span
          class="neuro-field__scan"
          :style="`background: linear-gradient(180deg, ${SIGNAL_DARK} 0%, ${SIGNAL} 50%, ${SIGNAL_DARK} 100%);`"
        ></span>
        <svg class="absolute inset-0 size-full" style="z-index: 1;" viewBox="0 0 8 30" xmlns="http://www.w3.org/2000/svg">
          <path :d="LOADER_MASK" fill="#000"></path>
        </svg>
      </div>

      <div class="relative min-w-0 flex-1 self-stretch">
        <button
          v-if="actionOnly && actionLabel"
          :type="actionType"
          class="grid size-full place-items-center border-0 bg-transparent text-[14px] font-normal uppercase leading-none tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50"
          :style="`font-family: 'Space Mono', ui-monospace, monospace; background: ${ACTION_BG};`"
          :disabled="disabled || busy"
        >
          {{ busy ? '…' : actionLabel }}
        </button>
        <template v-else>
          <input
            :id="id"
            :name="name"
            :type="inputType"
            :disabled="disabled"
            :readonly="readOnly || undefined"
            :placeholder="placeholder"
            v-model="value"
            :aria-invalid="invalid ? 'true' : undefined"
            :aria-describedby="describedBy"
            :autocomplete="isPassword ? 'current-password' : type === 'email' ? 'email' : 'off'"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            class="size-full appearance-none border-0 bg-transparent text-[14px] font-normal leading-none text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :style="`padding: 4px ${inputPadRight}px 4px 4px; font-family: 'Space Mono', ui-monospace, monospace; caret-color: #fff;`"
            data-neuro-input
          />

          <button
            v-if="isPassword && !hasAction"
            type="button"
            class="neuro-field__eye absolute inset-y-0 right-0 grid place-items-center border-0 bg-transparent text-white/55 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            :style="`width: ${EYE_W}px;`"
            :aria-label="revealed ? 'Hide password' : 'Show password'"
            :aria-pressed="revealed"
            :disabled="disabled || busy"
            @click="toggleReveal"
          >
            <svg v-if="revealed" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path
                d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.3 2.3-2.3 3.2M6.1 6.1C4.2 7.4 2.7 9.1 2 12c1.7 3.9 6 7 10 7 1.4 0 2.7-.3 3.9-.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          <button
            v-if="hasAction"
            :type="actionType"
            class="absolute inset-y-0 right-0 border-0 text-[14px] font-normal uppercase leading-none text-white disabled:cursor-not-allowed disabled:opacity-50"
            :style="`width: ${ACTION_W}px; background: ${ACTION_BG}; font-family: 'Space Mono', ui-monospace, monospace;`"
            :disabled="disabled || busy"
          >
            {{ busy ? '…' : actionLabel }}
          </button>
        </template>
      </div>

      <div
        class="neuro-field__loader relative shrink-0 overflow-hidden"
        :style="`width: ${LOADER_W}px; height: ${LOADER_H}px; background: ${LOADER_BG};`"
        aria-hidden="true"
      >
        <span
          class="neuro-field__scan neuro-field__scan--alt"
          :style="`background: linear-gradient(180deg, ${SIGNAL_DARK} 0%, ${SIGNAL} 50%, ${SIGNAL_DARK} 100%);`"
        ></span>
        <svg class="absolute inset-0 size-full" style="z-index: 1;" viewBox="0 0 8 30" xmlns="http://www.w3.org/2000/svg">
          <path :d="LOADER_MASK" fill="#000"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.neuro-field__cross {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 10px;
  height: 10px;
  place-items: center;
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 10px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.85);
  pointer-events: none;
  user-select: none;
}

.neuro-field__cross--tl { top: -2px; left: -2px; }
.neuro-field__cross--tr { top: -2px; right: -2px; }
.neuro-field__cross--bl { bottom: -2px; left: -2px; }
.neuro-field__cross--br { bottom: -2px; right: -2px; }

.neuro-field__bracket {
  position: absolute;
  z-index: 2;
  width: 12px;
  height: 12px;
  pointer-events: none;
  border-color: rgba(255, 255, 255, 0.55);
  border-style: solid;
}

.neuro-field__bracket--tl { top: 2px; left: 2px; border-width: 1px 0 0 1px; }
.neuro-field__bracket--tr { top: 2px; right: 2px; border-width: 1px 1px 0 0; }
.neuro-field__bracket--bl { bottom: 2px; left: 2px; border-width: 0 0 1px 1px; }
.neuro-field__bracket--br { bottom: 2px; right: 2px; border-width: 0 1px 1px 0; }

.neuro-field__scan {
  position: absolute;
  left: 0;
  width: 8px;
  height: 11px;
  filter: drop-shadow(0 0 4px rgb(240 124 0 / 0.9));
  animation: neuro-scan 1.6s linear infinite;
}

.neuro-field__scan--alt {
  animation-delay: -0.8s;
}

@keyframes neuro-scan {
  0% { top: -12px; }
  100% { top: calc(100% + 1px); }
}

.neuro-field[data-invalid='true'] .neuro-field__shell {
  border-color: rgb(240 124 0 / 0.85);
}

:deep([data-neuro-input]::placeholder) {
  color: rgba(255, 255, 255, 0.3) !important;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .neuro-field__scan {
    top: 50%;
    transform: translateY(-50%);
    animation: none;
  }
}
</style>
