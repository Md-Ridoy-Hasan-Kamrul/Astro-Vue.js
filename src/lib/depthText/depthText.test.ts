import { describe, expect, it } from 'vitest';
import {
	DEPTH_TEXT_DEFAULTS,
	MAX_LAYERS,
	depthLayers,
	depthShadow,
	getLayerColor,
	getTransform,
	resolveDepthText,
} from './depthText';

describe('resolveDepthText', () => {
	it('uses the React Bits defaults', () => {
		const resolved = resolveDepthText({});
		expect(resolved.layers).toBe(DEPTH_TEXT_DEFAULTS.layers);
		expect(resolved.depth).toBe(DEPTH_TEXT_DEFAULTS.depth);
		expect(resolved.tilt).toBe(DEPTH_TEXT_DEFAULTS.tilt);
		expect(resolved.smoothing).toBe(DEPTH_TEXT_DEFAULTS.smoothing);
		expect(resolved.perspective).toBe(DEPTH_TEXT_DEFAULTS.perspective);
		expect(resolved.orbitSpeed).toBe(DEPTH_TEXT_DEFAULTS.orbitSpeed);
		expect(resolved.baseRotation).toEqual({ x: -7.5 * 0.32, y: 7.5 * 0.42 });
	});

	it('clamps layer count, depth, tilt, and perspective', () => {
		expect(resolveDepthText({ layers: 1 }).layers).toBe(2);
		expect(resolveDepthText({ layers: 200 }).layers).toBe(MAX_LAYERS);
		expect(resolveDepthText({ depth: 40 }).depth).toBe(12);
		expect(resolveDepthText({ tilt: 30 }).tilt).toBe(12);
		expect(resolveDepthText({ perspective: 10 }).perspective).toBe(300);
		expect(resolveDepthText({ smoothing: 0 }).smoothing).toBe(DEPTH_TEXT_DEFAULTS.smoothing);
		expect(resolveDepthText({ orbitSpeed: 9 }).orbitSpeed).toBe(2);
	});
});

describe('depth layers', () => {
	it('stacks copies from the back toward the face', () => {
		const layers = depthLayers(3, 2, '#111111', '#888888');
		expect(layers.map((layer) => layer.index)).toEqual([3, 2, 1]);
		expect(layers[0]?.transform).toBe('translateZ(-6px)');
		expect(layers[2]?.transform).toBe('translateZ(-2px)');
	});

	it('mixes the face into the depth color, less so toward the back', () => {
		expect(getLayerColor('#ffffff', '#000000', 0, 4)).toBe('color-mix(in srgb, #ffffff 76%, #000000)');
		expect(getLayerColor('#ffffff', '#000000', 4, 4)).toBe('color-mix(in srgb, #ffffff 4%, #000000)');
	});
});

describe('depth motion helpers', () => {
	it('formats the stage rotation', () => {
		expect(getTransform(1.2, -3.4567)).toBe('rotateX(1.200deg) rotateY(-3.457deg)');
	});

	it('builds the front-face shadow from the depth color', () => {
		expect(depthShadow('#888888', false)).toBe('none');
		expect(depthShadow('#888888', true)).toContain('color-mix(in srgb, #888888 36%, transparent)');
	});
});
