import { shallowRef, onScopeDispose } from 'vue';
import type { StoreApi } from 'zustand/vanilla';

/**
 * Subscribe a Zustand vanilla store to Vue 3 reactivity.
 * Returns `{ state: ShallowRef<T>, setState, getState }`.
 *
 * In <script setup>: `state.value.field`
 * In template (auto-unwrap of top-level ref): `state.field`
 */
export function useZustandStore<T>(store: StoreApi<T>) {
  const state = shallowRef<T>(store.getState());

  const unsub = store.subscribe((next) => {
    state.value = next;
  });

  onScopeDispose(unsub);

  return {
    state,
    setState: store.setState.bind(store),
    getState: store.getState.bind(store),
  };
}
