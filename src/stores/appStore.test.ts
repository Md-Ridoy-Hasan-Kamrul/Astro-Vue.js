import { beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '../stores/appStore';

describe('appStore (Zustand)', () => {
	beforeEach(() => {
		appStore.setState({
			visits: 0,
			lastAction: 'idle',
		});
	});

	it('starts idle with zero visits', () => {
		const state = appStore.getState();
		expect(state.visits).toBe(0);
		expect(state.lastAction).toBe('idle');
	});

	it('increments visits and updates lastAction', () => {
		appStore.getState().incrementVisits();
		const state = appStore.getState();
		expect(state.visits).toBe(1);
		expect(state.lastAction).toBe('visit counted');
	});

	it('sets lastAction independently', () => {
		appStore.getState().setLastAction('opened github');
		expect(appStore.getState().lastAction).toBe('opened github');
		expect(appStore.getState().visits).toBe(0);
	});
});
