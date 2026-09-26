<script setup lang="ts">
/**
 * Compact TanStack Query demo: loading / error / empty / success + cache refresh.
 * Axios fetches; Query owns cache; Zustand only tracks HTTP pending/lastError.
 */
import { computed } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { fetchAstroRepo } from '../../lib/api/github';
import { getAxiosErrorMessage } from '../../lib/api/axios';
import { getCacheLabel, getQueryViewState } from '../../lib/query/queryUi';
import { queryKeys } from '../../lib/query/queryClient';
import { httpStore } from '../../stores/httpStore';
import { useZustandStore } from '../../lib/utils/useZustandStore';
import AsyncStatus from '../ui/AsyncStatus.vue';

const queryClient = useQueryClient();

const repoQuery = useQuery({
  queryKey: queryKeys.astroRepo,
  queryFn: ({ signal }) => fetchAstroRepo(signal),
});

const { state: httpState } = useZustandStore(httpStore);

const view = computed(() =>
  getQueryViewState({
    isPending: repoQuery.isPending,
    isError: repoQuery.isError,
    isFetching: repoQuery.isFetching,
    isStale: repoQuery.isStale,
    data: repoQuery.data,
    dataUpdatedAt: repoQuery.dataUpdatedAt,
  }),
);

const cacheLabel = computed(() =>
  getCacheLabel({
    dataUpdatedAt: repoQuery.dataUpdatedAt,
    isStale: repoQuery.isStale,
  }),
);

const errorMessage = computed(() =>
  repoQuery.error
    ? getAxiosErrorMessage(repoQuery.error)
    : (httpState.value.lastError ?? 'Request failed'),
);

function retry() {
  void repoQuery.refetch();
}

function refreshCache() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.astroRepo });
}
</script>

<template>
  <section class="grid gap-3" aria-labelledby="repo-status-title">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 id="repo-status-title" class="m-0 text-sm font-semibold text-ink">
        Live repo status
      </h3>
      <p class="m-0 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
        cache {{ cacheLabel }}
        <template v-if="httpState.pendingRequests > 0"> · http…</template>
      </p>
    </div>

    <AsyncStatus v-if="view === 'loading'" tone="info" title="Loading repository…" :busy="true" />
    <AsyncStatus
      v-else-if="view === 'error'"
      tone="danger"
      title="Could not load repository"
      :description="errorMessage"
      action-label="Try again"
      :on-action="retry"
      :busy="repoQuery.isFetching"
    />
    <AsyncStatus
      v-else-if="!repoQuery.data"
      tone="neutral"
      title="No repository data"
      description="The query finished without a payload."
      action-label="Try again"
      :on-action="retry"
    />
    <template v-else>
      <AsyncStatus
        v-if="view === 'refetching'"
        tone="info"
        title="Updating…"
        description="Showing cached data."
        :busy="true"
      />
      <article class="grid gap-1.5 rounded-lg border border-line bg-paper px-3.5 py-3">
        <a
          :href="repoQuery.data.html_url"
          class="font-semibold text-ink no-underline hover:text-sea"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ repoQuery.data.full_name }}
        </a>
        <p class="m-0 text-sm text-ink-soft">
          {{ repoQuery.data.description ?? 'No description yet.' }}
        </p>
        <p class="m-0 text-xs text-ink-soft">
          ★ {{ repoQuery.data.stargazers_count.toLocaleString() }}
          <template v-if="repoQuery.data.language"> · {{ repoQuery.data.language }}</template>
        </p>
        <button
          type="button"
          class="mt-1 justify-self-start rounded-full border border-line bg-mist/60 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist disabled:opacity-60"
          :disabled="repoQuery.isFetching"
          @click="refreshCache"
        >
          Refresh cache
        </button>
      </article>
    </template>
  </section>
</template>
