import { describe, expect, it } from 'vitest';
import {
	FRAGMENT_SHADER,
	SHADER_PRESETS,
	encodeSvgDataUrl,
	makeTextMaskSVG,
	measureWrappedLines,
	resolveShaderMotion,
	shaderPresetIndex,
} from './shaderText';

describe('resolveShaderMotion', () => {
	it('uses the Shader Text defaults', () => {
		expect(resolveShaderMotion({})).toEqual({
			speed: 1,
			scale: 3,
			softness: 0.35,
			resolutionScale: 0.75,
		});
	});

	it('clamps speed, scale, softness, and resolution', () => {
		expect(resolveShaderMotion({ speed: -2, scale: 40, softness: 3, resolutionScale: 0 }).speed).toBe(0);
		expect(resolveShaderMotion({ scale: 40 }).scale).toBe(12);
		expect(resolveShaderMotion({ scale: 0 }).scale).toBe(0.2);
		expect(resolveShaderMotion({ softness: 3 }).softness).toBe(1);
		expect(resolveShaderMotion({ resolutionScale: 0 }).resolutionScale).toBe(0.25);
		expect(resolveShaderMotion({ speed: Number.NaN }).speed).toBe(1);
	});
});

describe('shader presets', () => {
	it('maps Plasma to the first palette and unknown names back to it', () => {
		expect(shaderPresetIndex('Plasma')).toBe(0);
		expect(shaderPresetIndex('Tide')).toBe(SHADER_PRESETS.indexOf('Tide'));
		expect(shaderPresetIndex('Missing')).toBe(0);
		expect(FRAGMENT_SHADER).toContain('uPreset');
	});
});

describe('text mask', () => {
	it('returns no lines when the host has no text node', () => {
		const host = { firstChild: null } as unknown as HTMLElement;
		expect(measureWrappedLines(host)).toEqual([]);
	});

	it('builds an SVG luminance mask and a data URL', () => {
		const svg = makeTextMaskSVG({
			width: 320.4,
			height: 80.2,
			fontFamily: '"Syne", system-ui',
			fontSizePx: 48,
			fontWeight: '800',
			letterSpacing: 'normal',
			lines: [{ text: 'A & B', top: 2, height: 40 }],
		});

		expect(svg).toContain('width="320"');
		expect(svg).toContain('height="80"');
		expect(svg).toContain('A &amp; B');
		expect(svg).toContain('letter-spacing="0"');
		expect(svg).toContain('font-family="&quot;Syne&quot;, system-ui"');
		expect(encodeSvgDataUrl(svg)).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
	});
});
