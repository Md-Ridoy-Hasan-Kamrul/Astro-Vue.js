import { createStore } from 'zustand/vanilla';

export type AppState = {
	visits: number;
	lastAction: string;
	incrementVisits: () => void;
	setLastAction: (action: string) => void;
};

export const appStore = createStore<AppState>((set) => ({
	visits: 0,
	lastAction: 'idle',
	incrementVisits: () =>
		set((state) => ({
			visits: state.visits + 1,
			lastAction: 'visit counted',
		})),
	setLastAction: (action) => set({ lastAction: action }),
}));
