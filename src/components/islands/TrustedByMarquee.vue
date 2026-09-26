<script setup lang="ts">
/**
 * Trusted By logos — infinite multi-row marquee with edge fade.
 */
import { computed } from 'vue';

type LogoItem = {
  name: string;
  accent?: string;
  mark?: 'squares' | 'dot' | 'wave' | 'bolt' | 'ring';
};

const props = withDefaults(
  defineProps<{
    title?: string;
    class?: string;
  }>(),
  {
    title: 'Trusted By 350+ Global Brands',
    class: '',
  },
);

const rows: LogoItem[][] = [
  [
    { name: 'VISA', accent: '#1A1F71' },
    { name: 'On Deck', mark: 'ring', accent: '#111' },
    { name: 'Peel', accent: '#111' },
    { name: 'Microsoft', mark: 'squares' },
    { name: 'The Motley Fool', mark: 'dot', accent: '#8B5CF6' },
    { name: 'daXtra', accent: '#111' },
    { name: 'ARRIVE', accent: '#E11D48' },
  ],
  [
    { name: 'DOCSHIPPER', accent: '#0F766E' },
    { name: 'On Deck', mark: 'ring', accent: '#111' },
    { name: 'The Motley Fool', mark: 'dot', accent: '#8B5CF6' },
    { name: 'Microsoft', mark: 'squares' },
    { name: 'Packt', accent: '#F97316' },
    { name: 'CIS', accent: '#2563EB' },
    { name: 'eAssist', accent: '#111' },
  ],
  [
    { name: 'GoWish', accent: '#DB2777' },
    { name: 'Wokelo.ai', accent: '#4F46E5' },
    { name: 'pathrise', accent: '#111' },
    { name: 'RECHARGE', accent: '#111' },
    { name: 'telenor', mark: 'wave', accent: '#00A0E4' },
    { name: 'PRIME', accent: '#111' },
    { name: 'CYBER AUTO', mark: 'bolt', accent: '#111' },
  ],
];

const rootClass = computed(() =>
  ['trusted-by w-full', props.class].filter(Boolean).join(' '),
);

function loopItems(items: LogoItem[]) {
  return [...items, ...items];
}
</script>

<template>
  <div :class="rootClass">
    <p class="mb-8 text-center text-sm font-medium tracking-wide text-ink-soft sm:text-[0.95rem]">
      {{ title }}
    </p>

    <div
      class="trusted-by__mask relative flex flex-col gap-5 overflow-hidden py-1"
      role="presentation"
    >
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        class="trusted-by__track"
        :data-reverse="rowIndex % 2 === 1 ? 'true' : undefined"
        :style="{ '--marquee-duration': `${28 + rowIndex * 4}s` }"
      >
        <div class="trusted-by__group">
          <span
            v-for="(logo, i) in loopItems(row)"
            :key="`${rowIndex}-${logo.name}-${i}`"
            class="trusted-by__logo"
            :style="{ color: logo.accent || '#1a1a1a' }"
          >
            <span v-if="logo.mark === 'squares'" class="trusted-by__ms" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <span
              v-else-if="logo.mark"
              class="trusted-by__mark"
              :data-mark="logo.mark"
              aria-hidden="true"
            />
            <span class="trusted-by__name">{{ logo.name }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trusted-by__mask {
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.trusted-by__track {
  display: flex;
  width: max-content;
  animation: trusted-marquee var(--marquee-duration, 30s) linear infinite;
}

.trusted-by__track[data-reverse='true'] {
  animation-name: trusted-marquee-reverse;
}

.trusted-by__group {
  display: flex;
  align-items: center;
  gap: clamp(2.5rem, 5vw, 4.5rem);
  padding-inline: clamp(1.25rem, 2.5vw, 2.25rem);
  flex-shrink: 0;
}

.trusted-by__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  opacity: 0.88;
  user-select: none;
}

.trusted-by__name {
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 1.4vw, 1.15rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}

.trusted-by__mark {
  display: inline-block;
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: currentColor;
}

.trusted-by__mark[data-mark='ring'] {
  background: transparent;
  border: 2px solid currentColor;
}

.trusted-by__mark[data-mark='wave'] {
  border-radius: 0;
  clip-path: polygon(0 60%, 25% 30%, 50% 60%, 75% 30%, 100% 60%, 100% 80%, 75% 50%, 50% 80%, 25% 50%, 0 80%);
}

.trusted-by__mark[data-mark='bolt'] {
  border-radius: 0;
  clip-path: polygon(55% 0, 20% 55%, 45% 55%, 40% 100%, 80% 40%, 52% 40%);
}

.trusted-by__ms {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  width: 0.9rem;
  height: 0.9rem;
}

.trusted-by__ms i {
  display: block;
  width: 100%;
  height: 100%;
}

.trusted-by__ms i:nth-child(1) {
  background: #f25022;
}
.trusted-by__ms i:nth-child(2) {
  background: #7fba00;
}
.trusted-by__ms i:nth-child(3) {
  background: #00a4ef;
}
.trusted-by__ms i:nth-child(4) {
  background: #ffb900;
}

@keyframes trusted-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@keyframes trusted-marquee-reverse {
  from {
    transform: translateX(-50%);
  }
  to {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .trusted-by__track {
    animation: none;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .trusted-by__group:last-child {
    display: none;
  }

  .trusted-by__group {
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 1rem;
  }

  .trusted-by__mask {
    mask-image: none;
    -webkit-mask-image: none;
  }
}
</style>
