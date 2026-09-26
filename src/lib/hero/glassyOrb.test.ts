import { describe, expect, it } from 'vitest';
import {
	ORB_BLEND_MODE,
	ORB_COLOR_GRADE,
	ORB_SCALE,
	ORB_SOURCE_PATH,
} from './glassyOrb';

describe('glassyOrb tokens', () => {
	it('uses the local purple orb video', () => {
		expect(ORB_SOURCE_PATH).toBe('/hero/orb-purple.webm');
	});

	it('uses the electric-blue CSS filter from the liquid-glass hero spec', () => {
		expect(ORB_COLOR_GRADE).toBe(
			'hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1)',
		);
	});

	it('uses the massive bleed scale from the liquid-glass hero spec', () => {
		expect(ORB_SCALE).toBe(1.25);
	});

	it('uses mix-blend-screen to clear the black plate', () => {
		expect(ORB_BLEND_MODE).toBe('screen');
	});
});
