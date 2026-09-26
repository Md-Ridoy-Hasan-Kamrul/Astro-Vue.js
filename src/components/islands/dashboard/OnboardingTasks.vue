<script setup lang="ts">
/** Onboarding checklist with toggleable completion. */
import { ref, computed } from 'vue';

type Task = {
  id: string;
  title: string;
  time: string;
  icon: 'interview' | 'team' | 'project' | 'goals' | 'hr';
  done: boolean;
};

const props = defineProps<{ tasks: Task[] }>();

const overrides = ref<Record<string, boolean>>({});
const list = computed(() =>
  props.tasks.map((task) => ({
    ...task,
    done: task.id in overrides.value ? overrides.value[task.id]! : task.done,
  })),
);
const doneCount = computed(() => list.value.filter((task) => task.done).length);

function toggle(id: string) {
  const current = list.value.find((task) => task.id === id);
  if (!current) return;
  overrides.value = { ...overrides.value, [id]: !current.done };
}
</script>

<template>
  <section
    class="flex h-full min-h-88 flex-col rounded-[1.75rem] bg-[#1c1c1c] p-5 text-white shadow-[0_18px_40px_rgb(28_28_28_/0.12)]"
    aria-labelledby="onboarding-task-title"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 id="onboarding-task-title" class="m-0 text-lg font-semibold">Onboarding Task</h2>
      <p class="m-0 text-sm text-white/55">{{ doneCount }}/8</p>
    </div>

    <ul class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="task in list" :key="task.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-2xl border-0 bg-transparent px-1 py-3 text-left text-white"
          @click="toggle(task.id)"
        >
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm" aria-hidden="true">
            <svg v-if="task.icon === 'interview'" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" stroke-linecap="round" />
            </svg>
            <svg v-else-if="task.icon === 'team'" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" />
            </svg>
            <svg v-else-if="task.icon === 'project'" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <svg v-else-if="task.icon === 'goals'" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
            <svg v-else class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h5" stroke-linecap="round" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ task.title }}</span>
            <span class="block text-xs text-white/45">{{ task.time }}</span>
          </span>
          <span
            :class="`grid size-6 shrink-0 place-items-center rounded-full ${task.done ? 'bg-[#ffd74b] text-[#1c1c1c]' : 'border border-white/25 bg-transparent'}`"
            aria-hidden="true"
          >
            <svg v-if="task.done" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
