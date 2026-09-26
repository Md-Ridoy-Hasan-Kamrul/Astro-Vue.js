/**
 * Liquid Glass Carousel engine — TypeScript port of the Framer LiquidGlassCarousel
 * WebGL path (three.js). No React / Framer / GSAP; entry & focus use RAF lerp/easings.
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LiquidGlassProject = {
	brand: string;
	description: string;
	/** Plain image URL (not a Framer ResponsiveImage). */
	image?: string;
};

export type LiquidGlassCarouselConfig = {
	panelHeight: number;
	gap: number;
	glide: number;
	wheelSensitivity: number;
	snap: boolean;
	snapDistance: number;
	snapDelay: number;
	speedShrink: number;
	lensShape: 'circle' | 'square';
	lensRotation: number;
	lensWidth: number;
	lensHeight: number;
	lensX: number;
	lensY: number;
	dispersion: number;
	zoom: number;
	blur: number;
	glow: number;
	blueRing: number;
	blueColor: string;
	shimmer: boolean;
	rimWave: number;
	entryAnimation: boolean;
	focusScale: number;
	background: string;
	/** Caller-facing text color (not used by WebGL). */
	foreground: string;
	pixelRatio: number;
};

export type CreateLiquidGlassCarouselOptions = {
	projects: LiquidGlassProject[];
	getConfig: () => LiquidGlassCarouselConfig;
	cursorElement?: HTMLElement | null;
	onActiveChange?: (i: number) => void;
	onFocusChange?: (focused: boolean) => void;
	onEntryDone?: (done: boolean) => void;
};

export type LiquidGlassCarouselHandle = {
	closeFocus: () => void;
	destroy: () => void;
};

// ---------------------------------------------------------------------------
// Defaults (Framer defaultProps, adapted for a light / paper site)
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: LiquidGlassCarouselConfig = {
	panelHeight: 450,
	gap: 12,
	glide: 0.075,
	wheelSensitivity: 1,
	snap: true,
	snapDistance: 60,
	snapDelay: 120,
	speedShrink: 60,
	lensShape: 'circle',
	lensRotation: 65,
	lensWidth: 0.565,
	lensHeight: 1,
	lensX: 0.5,
	lensY: 0.5,
	dispersion: 11,
	zoom: 0,
	blur: 0,
	glow: 4.2,
	blueRing: 6,
	blueColor: '#009dff',
	shimmer: true,
	rimWave: 0.6,
	entryAnimation: true,
	focusScale: 1.18,
	background: '#f7fafb',
	foreground: '#14212b',
	pixelRatio: 2,
};

// ---------------------------------------------------------------------------
// Fragment shader (faithful port from Framer source)
// ---------------------------------------------------------------------------

const fragmentShader = `
    #define PI 3.14159265
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2  uRes;
    uniform vec2  uCenter;
    uniform float uSizeX;
    uniform float uSizeY;
    uniform float uAspect;
    uniform float uZoom;
    uniform float uDispersion;
    uniform float uBlur;
    uniform float uGlow;
    uniform float uWhiteGlow;
    uniform float uNovaSize;
    uniform float uBlueRing;
    uniform float uRingRadius;
    uniform float uRingWidth;
    uniform float uShimmer;
    uniform float uShimmerFreq;
    uniform float uShimmerSpeed;
    uniform float uShimmerDepth;
    uniform float uTime;
    uniform float uRimStart;
    uniform float uRimTangential;
    uniform float uRimInward;
    uniform float uRimFreq1;
    uniform float uRimFreq2;
    uniform vec3  uBlueColor;
    uniform float uRimLine;
    uniform float uRimLinePos;
    uniform float uRimLineWidth;
    uniform float uShape;
    uniform float uSquareRound;
    uniform float uRotation;
    uniform int   uSamples;

    const int MAX_SAMPLES = 16;

    float sdRoundBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }

    vec3 glassLens(vec2 center, float aspectCorrect, out float outA) {
        vec2 p = vUv - center;
        p.x *= aspectCorrect;
        float ca = cos(uRotation), sa = sin(uRotation);
        p = mat2(ca, -sa, sa, ca) * p;
        vec2 halfSize = vec2(uSizeX, uSizeY);
        float dist = length(p / halfSize);
        outA = 0.0;

        float maskND;
        if (uShape > 0.5) {
            float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
            float sd = sdRoundBox(p, halfSize, corner);
            maskND = 1.0 + sd / min(uSizeX, uSizeY);
        } else {
            maskND = dist;
        }

        if (maskND > 1.0) return vec3(0.0);

        float shapeND = clamp(maskND, 0.0, 1.0);
        float nd = clamp(dist, 0.0, 1.0);
        vec2 offset = vUv - center;
        vec2 radialDir = normalize(offset + 1e-6);
        vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
        float angle = atan(p.y, p.x);

        float pull = uZoom * 0.30 * nd * nd;
        float rimStrength = smoothstep(uRimStart, 1.0, nd);
        float fluidWave = sin(angle * uRimFreq1) * 0.55 +
                          sin(angle * uRimFreq2) * 0.25;
        float rScreen = (uSizeX + uSizeY) * 0.5;

        vec2 rimOff = tangentDir * fluidWave * rimStrength *
                      rScreen * uRimTangential;
        vec2 rimPull = -radialDir * rimStrength * rScreen * uRimInward;
        vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;

        float rimMask = smoothstep(0.55, 1.0, nd);
        vec2 dispDir = offset * uDispersion * 0.004 * rimMask;

        int count = uSamples;
        if (count < 2) count = 2;
        if (count > MAX_SAMPLES) count = MAX_SAMPLES;

        vec3 col = vec3(0.0);
        vec3 caW = vec3(0.0);

        for (int i = 0; i < MAX_SAMPLES; i++) {
            if (i >= count) break;

            float t = float(i) / float(count - 1);
            vec2 sUV = baseUV + dispDir * (t - 0.5);
            vec3 sampleColor = texture2D(uTex, sUV).rgb;

            vec3 weight = vec3(
                exp(-pow((t - 0.00) / 0.38, 2.0)),
                exp(-pow((t - 0.50) / 0.38, 2.0)),
                exp(-pow((t - 1.00) / 0.38, 2.0))
            );

            col += sampleColor * weight;
            caW += weight;
        }

        col /= max(caW, vec3(0.001));

        float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);

        if (uBlur > 0.01 && blurFade > 0.01) {
            vec2 blurRad = vec2(uBlur) / uRes * blurFade;
            vec3 bcol = vec3(0.0);
            float totalWeight = 0.0;

            for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
                for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
                    vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
                    float weight = 1.0 - rr * 0.38;
                    bcol += texture2D(uTex, baseUV + o).rgb * weight;
                    totalWeight += weight;
                }
            }

            col = mix(bcol / totalWeight, col, rimMask);
        }

        col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

        float r2 = shapeND * shapeND * 0.25;
        float gs = max(uNovaSize * uGlow * 0.003, 0.004);
        float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;

        nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
        col += vec3(nova);

        float dC = shapeND * 0.5;
        float tR = clamp(uRingRadius, 0.1, 0.49);
        float rW = max(uRingWidth, 0.003);

        float ring = exp(-pow((dC - tR) / rW, 2.0));
        ring *= uBlueRing * (uGlow / 17.0) * 1.8;

        if (uShimmer > 0.5) {
            ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) *
                    uShimmerDepth + (1.0 - uShimmerDepth);
        }

        float aura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) *
                     0.28 * uBlueRing * (uGlow / 17.0);

        col += uBlueColor * (ring + aura);

        col += vec3(
            exp(
                -pow(
                    (dC - uRimLinePos) /
                    max(uRimLineWidth, 0.0001),
                    2.0
                )
            ) * uRimLine
        );

        outA = smoothstep(1.0, 0.93, maskND);

        return col;
    }

    void main() {
        vec3 outputColor = texture2D(uTex, vUv).rgb;
        float alpha = 0.0;
        vec3 lensColor = glassLens(uCenter, uAspect, alpha);
        outputColor = mix(outputColor, lensColor, alpha);
        gl_FragColor = vec4(outputColor, 1.0);
    }
`;

const vertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

// ---------------------------------------------------------------------------
// Lightweight RAF tween / timeline (replaces GSAP)
// ---------------------------------------------------------------------------

type EaseFn = (t: number) => number;

const ease = {
	power2InOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
	power3Out: (t: number) => 1 - Math.pow(1 - t, 3),
	power3InOut: (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	power4Out: (t: number) => 1 - Math.pow(1 - t, 4),
	expoInOut: (t: number) => {
		if (t === 0 || t === 1) return t;
		return t < 0.5
			? Math.pow(2, 20 * t - 10) / 2
			: (2 - Math.pow(2, -20 * t + 10)) / 2;
	},
} as const;

type TweenTarget = Record<string | number, number>;

type TweenItem = {
	id: number;
	target: TweenTarget;
	key: string | number;
	from: number;
	to: number;
	duration: number;
	delay: number;
	ease: EaseFn;
	onUpdate?: () => void;
	done: boolean;
};

type PendingCall = {
	id: number;
	at: number;
	fn: () => void;
	fired: boolean;
};

type TimelineHandle = {
	id: number;
	/** Absolute end time (seconds) of this timeline's scheduled work. */
	endAt: number;
	killed: boolean;
	onComplete?: () => void;
	completed: boolean;
};

function createTweenClock() {
	const tweens: TweenItem[] = [];
	const pendingCalls: PendingCall[] = [];
	const timelines: TimelineHandle[] = [];
	let clock = 0;
	let nextId = 1;

	function pushTween(
		id: number,
		target: TweenTarget,
		vars: Record<string | number, number | EaseFn | (() => void) | undefined> & {
			duration: number;
			delay?: number;
			ease?: EaseFn;
			onUpdate?: () => void;
		},
		at: number,
	) {
		const { duration, delay = 0, ease: easeFn = ease.power3Out, onUpdate, ...keys } =
			vars;
		for (const [key, value] of Object.entries(keys)) {
			if (typeof value !== 'number') continue;
			const k = key as string | number;
			tweens.push({
				id,
				target,
				key: k,
				from: Number(target[k] ?? 0),
				to: value,
				duration: Math.max(0.001, duration),
				delay: at + delay,
				ease: easeFn,
				onUpdate,
				done: false,
			});
		}
	}

	function timeline(opts?: { delay?: number; onComplete?: () => void }) {
		/** Absolute clock time when this timeline's t=0 fires (GSAP-style delay). */
		const origin = clock + (opts?.delay ?? 0);
		const id = nextId++;
		const handle: TimelineHandle = {
			id,
			endAt: origin,
			killed: false,
			onComplete: opts?.onComplete,
			completed: false,
		};
		timelines.push(handle);

		const api = {
			to(
				target: TweenTarget,
				vars: {
					duration: number;
					delay?: number;
					ease?: EaseFn;
					onUpdate?: () => void;
					[key: string | number]: number | EaseFn | (() => void) | undefined;
				},
				position = 0,
			) {
				if (handle.killed) return api;
				const at = origin + position;
				pushTween(id, target, vars, at);
				handle.endAt = Math.max(
					handle.endAt,
					at + vars.duration + (vars.delay ?? 0),
				);
				return api;
			},
			call(fn: () => void, _unused: undefined, position: number) {
				if (handle.killed) return api;
				const at = origin + position;
				pendingCalls.push({ id, at, fn, fired: false });
				handle.endAt = Math.max(handle.endAt, at);
				return api;
			},
			kill() {
				handle.killed = true;
				for (const tw of tweens) {
					if (tw.id === id) tw.done = true;
				}
				for (const c of pendingCalls) {
					if (c.id === id) c.fired = true;
				}
			},
		};
		return api;
	}

	function update(dt: number) {
		clock += dt;

		for (const tw of tweens) {
			if (tw.done) continue;
			if (clock < tw.delay) continue;
			const local = Math.min(1, (clock - tw.delay) / tw.duration);
			const v = tw.from + (tw.to - tw.from) * tw.ease(local);
			tw.target[tw.key] = v;
			tw.onUpdate?.();
			if (local >= 1) tw.done = true;
		}

		for (const c of pendingCalls) {
			if (!c.fired && clock >= c.at) {
				c.fired = true;
				c.fn();
			}
		}

		for (const tl of timelines) {
			if (tl.killed || tl.completed || !tl.onComplete) continue;
			if (clock >= tl.endAt) {
				tl.completed = true;
				tl.onComplete();
			}
		}

		if (tweens.length > 64) {
			for (let i = tweens.length - 1; i >= 0; i--) {
				if (tweens[i].done) tweens.splice(i, 1);
			}
		}
	}

	function killAll() {
		tweens.length = 0;
		pendingCalls.length = 0;
		for (const tl of timelines) tl.killed = true;
		timelines.length = 0;
	}

	return { timeline, update, killAll };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPlainText(value: unknown): string {
	if (value == null) return '';
	return String(value)
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

function makePlaceholderTexture(index: number, label: string): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 1200;
	canvas.height = 800;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		const fallback = new THREE.CanvasTexture(canvas);
		fallback.colorSpace = THREE.SRGBColorSpace;
		return fallback;
	}
	const hue = (index * 47 + 210) % 360;
	const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
	gradient.addColorStop(0, `hsl(${hue}, 72%, 58%)`);
	gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 70%, 22%)`);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'rgba(255,255,255,.92)';
	ctx.font = '600 66px Arial, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(toPlainText(label) || `Project ${index + 1}`, 600, 400);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.needsUpdate = true;
	return texture;
}

type ImageSource = {
	texture: THREE.Texture | null;
	aspect: number;
	bound: boolean;
};

type PoolItem = {
	mesh: THREE.Mesh;
	material: THREE.MeshBasicMaterial;
	sourceIndex: number;
	bound: boolean;
};

type PanelRect = {
	left: number;
	right: number;
	top: number;
	bottom: number;
	poolIndex: number;
	sourceIndex: number;
	centerX: number;
};

// ---------------------------------------------------------------------------
// createLiquidGlassCarousel
// ---------------------------------------------------------------------------

export function createLiquidGlassCarousel(
	mount: HTMLElement,
	options: CreateLiquidGlassCarouselOptions,
): LiquidGlassCarouselHandle {
	const {
		projects,
		getConfig,
		cursorElement = null,
		onActiveChange = () => {},
		onFocusChange = () => {},
		onEntryDone = () => {},
	} = options;

	const cfg = getConfig;
	const tweens = createTweenClock();

	const sourceProjects =
		projects.length > 0
			? projects
			: [
					{ brand: 'Project One', description: 'Add your own image' },
					{ brand: 'Project Two', description: 'Add your own image' },
					{ brand: 'Project Three', description: 'Add your own image' },
				];

	let W = Math.max(1, mount.clientWidth);
	let H = Math.max(1, mount.clientHeight);

	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	} catch (err) {
		throw new Error(
			`LiquidGlassCarousel: WebGL renderer failed to initialize${
				err instanceof Error ? `: ${err.message}` : ''
			}`,
		);
	}

	const dpr = Math.min(window.devicePixelRatio || 1, cfg().pixelRatio);
	renderer.setPixelRatio(dpr);
	renderer.setSize(W, H);
	renderer.setClearColor(new THREE.Color(cfg().background), 1);
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	renderer.domElement.style.display = 'block';
	renderer.domElement.style.touchAction = 'none';
	mount.style.touchAction = 'none';
	mount.appendChild(renderer.domElement);

	/** Fit panel size to the current container (mobile + desktop). */
	const panelHeightPx = () => {
		const base = cfg().panelHeight;
		const byHeight = H * 0.48;
		const byWidth = W * 0.78;
		return Math.max(110, Math.min(base, byHeight, byWidth));
	};

	const gapPx = () => {
		const scale = panelHeightPx() / Math.max(1, cfg().panelHeight);
		return Math.max(6, cfg().gap * Math.min(1, scale));
	};

	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
	camera.position.z = 10;

	const textureLoader = new THREE.TextureLoader();
	textureLoader.setCrossOrigin('anonymous');

	let userInteracted = false;
	let destroyed = false;

	const sources: ImageSource[] = sourceProjects.map((project, index) => {
		const source: ImageSource = { texture: null, aspect: 1.5, bound: false };
		const imageUrl = project.image;
		if (imageUrl) {
			textureLoader.load(
				imageUrl,
				(texture) => {
					if (destroyed) {
						texture.dispose();
						return;
					}
					texture.minFilter = THREE.LinearMipmapLinearFilter;
					texture.generateMipmaps = true;
					texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
					texture.colorSpace = THREE.SRGBColorSpace;
					source.aspect = texture.image.width / texture.image.height;
					source.texture = texture;
					recomputeTotal();
					if (!userInteracted) {
						scroll = centerForIndex(0);
						target = scroll;
					}
				},
				undefined,
				() => {
					if (destroyed) return;
					source.texture = makePlaceholderTexture(index, project.brand);
				},
			);
		} else {
			source.texture = makePlaceholderTexture(index, project.brand);
		}
		return source;
	});

	const slotWidth = (i: number) => sources[i].aspect * panelHeightPx() + gapPx();

	let offsets: number[] = [];
	let totalWidth = 0;

	function recomputeTotal() {
		offsets = [];
		let sum = 0;
		sources.forEach((_, index) => {
			offsets.push(sum);
			sum += slotWidth(index);
		});
		totalWidth = Math.max(sum, 1);
	}
	recomputeTotal();

	function centerForIndex(index: number) {
		const count = sources.length;
		const loop = Math.floor(index / count);
		const sourceIndex = ((index % count) + count) % count;
		return (
			offsets[sourceIndex] +
			slotWidth(sourceIndex) / 2 -
			gapPx() / 2 +
			loop * totalWidth
		);
	}

	function nearestIndex(value: number) {
		let best = 0;
		let bestDistance = Infinity;
		for (let i = 0; i < sources.length; i++) {
			const center = offsets[i] + slotWidth(i) / 2 - gapPx() / 2;
			const loop = Math.round((value - center) / totalWidth);
			const distance = Math.abs(center + loop * totalWidth - value);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = i + loop * sources.length;
			}
		}
		return best;
	}

	function centerSourceIndex(value: number) {
		let best = 0;
		let bestDistance = Infinity;
		for (let i = 0; i < sources.length; i++) {
			const center = offsets[i] + slotWidth(i) / 2 - gapPx() / 2;
			const loop = Math.round((value - center) / totalWidth);
			const distance = Math.abs(center + loop * totalWidth - value);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = i;
			}
		}
		return best;
	}

	const REPEATS = 4;
	const pool: PoolItem[] = [];
	for (let repeat = 0; repeat < REPEATS; repeat++) {
		for (let i = 0; i < sources.length; i++) {
			const material = new THREE.MeshBasicMaterial({
				color: 0xdddddd,
				transparent: true,
			});
			const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
			mesh.visible = false;
			scene.add(mesh);
			pool.push({ mesh, material, sourceIndex: i, bound: false });
		}
	}

	let scroll = centerForIndex(0);
	let target = scroll;
	let previousScroll = scroll;
	let scrollEnergy = 0;
	let pendingFocus: { sourceIndex: number } | null = null;
	let lastWheelAt = 0;
	let snapArmed = false;
	let lastCenter = -1;

	let rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr);
	const lensScene = new THREE.Scene();
	const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

	const lensUniforms = {
		uTex: { value: rt.texture },
		uRes: { value: new THREE.Vector2(W * dpr, H * dpr) },
		uCenter: { value: new THREE.Vector2(cfg().lensX, cfg().lensY) },
		uSizeX: { value: cfg().lensWidth },
		uSizeY: { value: cfg().lensHeight },
		uShape: { value: cfg().lensShape === 'square' ? 1 : 0 },
		uSquareRound: { value: 0 },
		uRotation: { value: 0 },
		uAspect: { value: W / H },
		uZoom: { value: cfg().zoom },
		uDispersion: { value: cfg().dispersion },
		uBlur: { value: cfg().blur },
		uGlow: { value: cfg().glow },
		uWhiteGlow: { value: 0.24 },
		uNovaSize: { value: 12 },
		uBlueRing: { value: cfg().blueRing },
		uRingRadius: { value: 0.49 },
		uRingWidth: { value: 0.014 },
		uShimmer: { value: cfg().shimmer ? 1 : 0 },
		uShimmerFreq: { value: 12 },
		uShimmerSpeed: { value: 3.5 },
		uShimmerDepth: { value: 0.12 },
		uTime: { value: 0 },
		uRimStart: { value: 0.578 },
		uRimTangential: { value: cfg().rimWave },
		uRimInward: { value: 0 },
		uRimFreq1: { value: 2 },
		uRimFreq2: { value: 1 },
		uBlueColor: { value: new THREE.Color(cfg().blueColor) },
		uRimLine: { value: 1.4 },
		uRimLinePos: { value: 0.488 },
		uRimLineWidth: { value: 0.003 },
		uSamples: { value: 16 },
	};

	const lensMaterial = new THREE.ShaderMaterial({
		uniforms: lensUniforms,
		vertexShader,
		fragmentShader,
	});
	const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMaterial);
	lensScene.add(lensQuad);

	const entryEnabled = cfg().entryAnimation;
	const focusState = {
		active: false,
		sourceIndex: -1,
		poolIndex: -1,
		lensFx: entryEnabled ? 0 : 1,
		animation: null as ReturnType<ReturnType<typeof createTweenClock>['timeline']> | null,
	};

	const drop = new Array(pool.length).fill(0) as number[];
	const entry = new Array(pool.length).fill(entryEnabled ? 0 : 1) as number[];
	const grow = new Array(pool.length).fill(entryEnabled ? 0 : 1) as number[];
	const lastCenterX = new Array(pool.length) as (number | undefined)[];
	let focusScale = 1;
	let entryActive = entryEnabled;
	let entrySettled = false;
	let entryTimeline: ReturnType<ReturnType<typeof createTweenClock>['timeline']> | null =
		null;
	let panelRects: PanelRect[] = [];
	let centeredPanel: {
		sourceIndex: number;
		poolIndex: number;
		centerX: number;
	} | null = null;

	// Drop / entry / grow as indexable objects for the tween system
	const dropObj = drop as unknown as TweenTarget;
	const entryObj = entry as unknown as TweenTarget;
	const growObj = grow as unknown as TweenTarget;

	function layout() {
		panelRects = [];
		centeredPanel = null;
		let centeredDistance = Infinity;
		const half = W / 2;
		const currentPanelHeight = panelHeightPx();
		const currentGap = gapPx();
		const buffer = currentPanelHeight;

		pool.forEach((item, poolIndex) => {
			const repeat = Math.floor(poolIndex / sources.length);
			const sourceIndex = item.sourceIndex;
			const source = sources[sourceIndex];
			const centerInLoop =
				offsets[sourceIndex] + slotWidth(sourceIndex) / 2 - currentGap / 2;
			let x = centerInLoop - scroll;
			x = ((x % totalWidth) + totalWidth) % totalWidth;
			x += (repeat - Math.floor(REPEATS / 2)) * totalWidth;
			if (x > half + totalWidth) {
				x -= totalWidth * REPEATS;
			}
			const centerX = x;
			const inEntry = entryActive || entrySettled;
			if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
				item.mesh.visible = false;
				lastCenterX[poolIndex] = undefined;
				return;
			}
			lastCenterX[poolIndex] = centerX;

			const shrink = 1 - 0.25 * scrollEnergy;
			const height = currentPanelHeight * shrink;
			const width = source.aspect * currentPanelHeight * shrink;

			if (source.texture && !item.bound) {
				item.material.map = source.texture;
				item.material.color.set(0xffffff);
				item.material.needsUpdate = true;
				item.bound = true;
			}

			let y = 0;
			let drawWidth = width;
			let drawHeight = height;
			const isFocused = focusState.active && focusState.poolIndex === poolIndex;
			if (isFocused) {
				drawWidth *= focusScale;
				drawHeight *= focusScale;
			} else if (drop[poolIndex] > 0) {
				y = -drop[poolIndex] * H * 1.4;
			}

			let finalX = centerX;
			let finalY = y;
			let finalWidth = drawWidth;
			let finalHeight = drawHeight;

			if (inEntry) {
				const p = entry[poolIndex];
				const g = grow[poolIndex];
				const entryMin = Math.min(80, currentPanelHeight * 0.35);
				const currentHeight = entryMin + (drawHeight - entryMin) * g;
				finalHeight = currentHeight;
				finalWidth = currentHeight * source.aspect;
				const centeredSource = centerSourceIndex(scroll);
				let distanceIndex = sourceIndex - centeredSource;
				if (distanceIndex > sources.length / 2) {
					distanceIndex -= sources.length;
				}
				if (distanceIndex < -sources.length / 2) {
					distanceIndex += sources.length;
				}
				const middleRepeat = Math.floor(REPEATS / 2);
				if (repeat !== middleRepeat) {
					item.mesh.visible = false;
					lastCenterX[poolIndex] = undefined;
					return;
				}
				const currentSlotHeight = (s: number) =>
					entryMin +
					(currentPanelHeight - entryMin) * grow[middleRepeat * sources.length + s];
				let offset = 0;
				if (distanceIndex > 0) {
					for (let k = 0; k < distanceIndex; k++) {
						const a = (centeredSource + k) % sources.length;
						const b = (centeredSource + k + 1) % sources.length;
						offset +=
							(sources[a].aspect * currentSlotHeight(a) +
								sources[b].aspect * currentSlotHeight(b)) /
								2 +
							currentGap;
					}
				} else if (distanceIndex < 0) {
					for (let k = 0; k < -distanceIndex; k++) {
						const a =
							(((centeredSource - k) % sources.length) + sources.length) %
							sources.length;
						const b =
							(((centeredSource - k - 1) % sources.length) + sources.length) %
							sources.length;
						offset -=
							(sources[a].aspect * currentSlotHeight(a) +
								sources[b].aspect * currentSlotHeight(b)) /
								2 +
							currentGap;
					}
				}
				finalX = offset;
				const below = -H * 0.9;
				finalY = below + (y - below) * p;
			}

			item.mesh.visible = true;
			item.mesh.position.set(finalX, finalY, 0);
			item.mesh.scale.set(finalWidth, finalHeight, 1);

			const screenX = centerX + W / 2;
			const screenY = H / 2 - y;
			panelRects.push({
				left: screenX - drawWidth / 2,
				right: screenX + drawWidth / 2,
				top: screenY - drawHeight / 2,
				bottom: screenY + drawHeight / 2,
				poolIndex,
				sourceIndex,
				centerX,
			});
			if (Math.abs(centerX) < centeredDistance) {
				centeredDistance = Math.abs(centerX);
				centeredPanel = { sourceIndex, poolIndex, centerX };
			}
		});
	}

	function panelAt(x: number, y: number) {
		return (
			panelRects.find(
				(rect) =>
					x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
			) || null
		);
	}

	// --- Custom cursor (lerp instead of gsap.quickTo / gsap.to) ---
	const canvas = renderer.domElement;
	const cursorState = {
		x: 0,
		y: 0,
		tx: 0,
		ty: 0,
		scale: 0,
		tScale: 0,
		alpha: 0,
		tAlpha: 0,
	};
	let overPanel = false;

	if (cursorElement) {
		cursorElement.style.transformOrigin = '20% 30%';
		cursorElement.style.opacity = '0';
		cursorElement.style.transform = 'translate(0px, 0px) scale(0)';
		cursorElement.style.willChange = 'transform, opacity';
	}

	function setView(visible: boolean) {
		if (entryActive || entrySettled) {
			visible = false;
		}
		canvas.style.cursor = visible ? 'pointer' : '';
		if (visible === overPanel || !cursorElement) {
			return;
		}
		overPanel = visible;
		cursorState.tScale = visible ? 1 : 0;
		cursorState.tAlpha = visible ? 1 : 0;
	}

	function updateCursor(dt: number) {
		if (!cursorElement) return;
		// Roughly match gsap quickTo ~0.5s power3 + scale tweens
		const posK = 1 - Math.pow(0.001, dt);
		const scaleK = 1 - Math.pow(0.0008, dt);
		cursorState.x += (cursorState.tx - cursorState.x) * Math.min(1, posK * 8);
		cursorState.y += (cursorState.ty - cursorState.y) * Math.min(1, posK * 8);
		cursorState.scale += (cursorState.tScale - cursorState.scale) * Math.min(1, scaleK * 10);
		cursorState.alpha += (cursorState.tAlpha - cursorState.alpha) * Math.min(1, scaleK * 10);
		cursorElement.style.opacity = String(cursorState.alpha);
		cursorElement.style.transform = `translate(${cursorState.x}px, ${cursorState.y}px) scale(${cursorState.scale})`;
	}

	function localPointer(event: PointerEvent | MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	let dragPointerId: number | null = null;
	let dragOriginX = 0;
	let dragOriginTarget = 0;
	let dragMoved = false;
	let suppressClick = false;

	function onWheel(event: WheelEvent) {
		event.preventDefault();
		if (focusState.active || entryActive || entrySettled) return;
		userInteracted = true;
		pendingFocus = null;
		target += (event.deltaY || event.deltaX) * cfg().wheelSensitivity;
		lastWheelAt = performance.now();
		snapArmed = true;
	}

	function onPointerDown(event: PointerEvent) {
		if (focusState.active || entryActive || entrySettled) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		dragPointerId = event.pointerId;
		dragOriginX = event.clientX;
		dragOriginTarget = target;
		dragMoved = false;
		userInteracted = true;
		pendingFocus = null;
		canvas.setPointerCapture?.(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		const point = localPointer(event);
		cursorState.tx = point.x;
		cursorState.ty = point.y;

		if (dragPointerId === event.pointerId) {
			const dx = event.clientX - dragOriginX;
			if (Math.abs(dx) > 6) dragMoved = true;
			target = dragOriginTarget - dx * cfg().wheelSensitivity;
			lastWheelAt = performance.now();
			snapArmed = true;
			setView(false);
			return;
		}
		if (focusState.active) {
			setView(false);
			return;
		}
		if (event.pointerType === 'mouse') {
			setView(panelAt(point.x, point.y) !== null);
		}
	}

	function onPointerUp(event: PointerEvent) {
		if (dragPointerId !== event.pointerId) return;
		canvas.releasePointerCapture?.(event.pointerId);
		dragPointerId = null;
		if (dragMoved) {
			suppressClick = true;
			lastWheelAt = performance.now();
			snapArmed = true;
		}
	}

	function onPointerLeave() {
		if (dragPointerId !== null) return;
		setView(false);
	}

	function onClick(event: MouseEvent) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		if (focusState.active || entryActive || entrySettled) return;
		const point = localPointer(event);
		const hit = panelAt(point.x, point.y);
		if (!hit) return;
		if (centeredPanel && hit.poolIndex === centeredPanel.poolIndex) {
			openFocus();
			return;
		}
		userInteracted = true;
		target = centerForIndex(nearestIndex(scroll + hit.centerX));
		pendingFocus = { sourceIndex: hit.sourceIndex };
		setView(false);
	}

	function openFocus() {
		if (focusState.active || !centeredPanel) return;
		focusState.active = true;
		focusState.sourceIndex = centeredPanel.sourceIndex;
		focusState.poolIndex = centeredPanel.poolIndex;
		target = centerForIndex(nearestIndex(scroll));

		const focusX = lastCenterX[focusState.poolIndex] || 0;
		const others = pool
			.map((_, index) => ({ index, x: lastCenterX[index] }))
			.filter((item) => item.index !== focusState.poolIndex && item.x !== undefined)
			.map((item) => ({
				...item,
				distance: Math.abs((item.x as number) - focusX),
			}))
			.sort((a, b) => a.distance - b.distance);

		let rank = 0;
		let previousDistance = -1;
		const ranked = others.map((item) => {
			if (previousDistance >= 0 && item.distance - previousDistance > 1) {
				rank++;
			}
			previousDistance = item.distance;
			return { index: item.index, rank };
		});

		focusState.animation?.kill();
		const timeline = tweens.timeline();
		const lensProxy: TweenTarget = { lensFx: focusState.lensFx };
		timeline.to(
			lensProxy,
			{
				lensFx: 0,
				duration: 0.85,
				ease: ease.power3Out,
				onUpdate: () => {
					focusState.lensFx = lensProxy.lensFx;
				},
			},
			0,
		);
		const scaleState: TweenTarget = { value: focusScale };
		timeline.to(
			scaleState,
			{
				value: cfg().focusScale,
				duration: 0.9,
				ease: ease.power3Out,
				onUpdate: () => {
					focusScale = scaleState.value;
				},
			},
			0,
		);
		ranked.forEach((item) => {
			timeline.to(
				dropObj,
				{
					[item.index]: 1,
					duration: 0.7,
					ease: ease.power4Out,
				},
				item.rank * 0.06,
			);
		});
		focusState.animation = timeline;
		setView(false);
		onFocusChange(true);
	}

	function closeFocus() {
		if (!focusState.active) return;
		focusState.animation?.kill();
		onFocusChange(false);

		const focusX = lastCenterX[focusState.poolIndex] || 0;
		const others = pool
			.map((_, index) => ({ index, x: lastCenterX[index] }))
			.filter((item) => item.x !== undefined && (drop[item.index] || 0) > 0)
			.map((item) => ({
				...item,
				distance: Math.abs((item.x as number) - focusX),
			}))
			.sort((a, b) => b.distance - a.distance);

		const timeline = tweens.timeline({
			onComplete: () => {
				focusState.active = false;
				focusState.sourceIndex = -1;
			},
		});
		const lensProxy: TweenTarget = { lensFx: focusState.lensFx };
		timeline.to(
			lensProxy,
			{
				lensFx: 1,
				duration: 0.68,
				ease: ease.power3InOut,
				onUpdate: () => {
					focusState.lensFx = lensProxy.lensFx;
				},
			},
			0,
		);
		const scaleState: TweenTarget = { value: focusScale };
		timeline.to(
			scaleState,
			{
				value: 1,
				duration: 0.76,
				ease: ease.power3Out,
				onUpdate: () => {
					focusScale = scaleState.value;
				},
			},
			0,
		);
		others.forEach((item, index) => {
			timeline.to(
				dropObj,
				{
					[item.index]: 0,
					duration: 0.6,
					ease: ease.power4Out,
				},
				index * 0.035,
			);
		});
		focusState.animation = timeline;
	}

	function playEntry() {
		if (!entryEnabled) {
			onEntryDone(true);
			return;
		}
		entryTimeline?.kill();
		entry.fill(0);
		grow.fill(0);
		entryActive = true;
		entrySettled = false;
		focusState.lensFx = 0;
		onEntryDone(false);
		target = centerForIndex(nearestIndex(scroll));
		scroll = target;
		layout();

		const visible = lastCenterX
			.map((x, index) => (x === undefined ? -1 : index))
			.filter((index) => index >= 0);

		const timeline = tweens.timeline({ delay: 0.5 });
		const spread = 0.07 * Math.max(visible.length - 1, 1);
		let lastRiseEnd = 0;
		visible.forEach((index) => {
			const at = Math.random() * spread;
			lastRiseEnd = Math.max(lastRiseEnd, at + 1);
			timeline.to(
				entryObj,
				{
					[index]: 1,
					duration: 1,
					ease: ease.power3Out,
				},
				at,
			);
		});
		timeline.call(
			() => {
				entryActive = false;
				entrySettled = true;
			},
			undefined,
			lastRiseEnd,
		);

		const center = centerSourceIndex(scroll);
		const middleRepeat = Math.floor(REPEATS / 2);
		const growList: { index: number; distanceRank: number }[] = [];
		let maxRank = 0;
		for (let i = 0; i < sources.length; i++) {
			let distance = i - center;
			if (distance > sources.length / 2) distance -= sources.length;
			if (distance < -sources.length / 2) distance += sources.length;
			const distanceRank = Math.abs(distance);
			maxRank = Math.max(maxRank, distanceRank);
			growList.push({
				index: middleRepeat * sources.length + i,
				distanceRank,
			});
		}

		const growStart = lastRiseEnd + 0.25;
		let growEnd = growStart;
		const lensProxy: TweenTarget = { lensFx: focusState.lensFx };
		timeline.to(
			lensProxy,
			{
				lensFx: 1,
				duration: 1.4,
				ease: ease.power2InOut,
				onUpdate: () => {
					focusState.lensFx = lensProxy.lensFx;
				},
			},
			growStart,
		);
		growList.forEach((item) => {
			const rank = maxRank - item.distanceRank;
			const at = growStart + rank * 0.085;
			growEnd = Math.max(growEnd, at + 2.15);
			timeline.to(
				growObj,
				{
					[item.index]: 1,
					duration: 2.15,
					ease: ease.expoInOut,
				},
				at,
			);
		});
		timeline.call(
			() => {
				entrySettled = false;
				grow.fill(1);
				onEntryDone(true);
			},
			undefined,
			growEnd,
		);
		entryTimeline = timeline;
	}

	canvas.addEventListener('wheel', onWheel, { passive: false });
	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('pointercancel', onPointerUp);
	canvas.addEventListener('pointerleave', onPointerLeave);
	canvas.addEventListener('click', onClick);

	let raf = 0;
	let lastTime = performance.now();

	function renderFrame(dt: number) {
		tweens.update(dt);
		updateCursor(dt);

		const values = cfg();
		renderer.setClearColor(new THREE.Color(values.background), 1);

		if (
			values.snap &&
			snapArmed &&
			!focusState.active &&
			Math.abs(target - scroll) < values.snapDistance &&
			performance.now() - lastWheelAt > values.snapDelay
		) {
			target = centerForIndex(nearestIndex(target));
			snapArmed = false;
		}

		scroll += (target - scroll) * values.glide;
		const centerIndex = centerSourceIndex(scroll);
		if (centerIndex !== lastCenter) {
			lastCenter = centerIndex;
			onActiveChange(centerIndex);
		}

		const speed = scroll - previousScroll;
		previousScroll = scroll;
		const normalized = Math.min(1, Math.abs(speed) / Math.max(1, values.speedShrink));
		const energyEase = normalized > scrollEnergy ? 0.25 : 0.06;
		scrollEnergy += (normalized - scrollEnergy) * energyEase;

		layout();

		if (
			pendingFocus &&
			!focusState.active &&
			Math.abs(target - scroll) < 0.5
		) {
			const pending = pendingFocus;
			pendingFocus = null;
			if (centeredPanel && centeredPanel.sourceIndex === pending.sourceIndex) {
				openFocus();
			}
		}

		lensUniforms.uCenter.value.set(values.lensX, values.lensY);
		lensUniforms.uSizeX.value = values.lensWidth;
		lensUniforms.uSizeY.value = values.lensHeight;
		lensUniforms.uShape.value = values.lensShape === 'square' ? 1 : 0;
		lensUniforms.uRotation.value = (values.lensRotation * Math.PI) / 180;
		lensUniforms.uAspect.value = W / H;
		lensUniforms.uTime.value = performance.now() * 0.001;
		lensUniforms.uBlur.value = values.blur;
		lensUniforms.uGlow.value = values.glow;
		lensUniforms.uShimmer.value = values.shimmer ? 1 : 0;
		lensUniforms.uBlueColor.value.set(values.blueColor);

		const fx = focusState.lensFx;
		lensUniforms.uDispersion.value = values.dispersion * fx;
		lensUniforms.uBlueRing.value = values.blueRing * fx;
		lensUniforms.uRimLine.value = 1.4 * fx;
		lensUniforms.uZoom.value = values.zoom * fx;
		lensUniforms.uRimTangential.value = values.rimWave * fx;

		renderer.setRenderTarget(rt);
		renderer.render(scene, camera);
		renderer.setRenderTarget(null);
		renderer.render(lensScene, lensCamera);
	}

	function tick(now: number) {
		const dt = Math.min(0.05, (now - lastTime) / 1000);
		lastTime = now;
		renderFrame(dt);
		raf = requestAnimationFrame(tick);
	}

	raf = requestAnimationFrame(tick);
	playEntry();

	function onResize() {
		W = Math.max(1, mount.clientWidth);
		H = Math.max(1, mount.clientHeight);
		renderer.setSize(W, H);
		camera.left = -W / 2;
		camera.right = W / 2;
		camera.top = H / 2;
		camera.bottom = -H / 2;
		camera.updateProjectionMatrix();
		rt.setSize(W * dpr, H * dpr);
		lensUniforms.uRes.value.set(W * dpr, H * dpr);
		recomputeTotal();
	}

	const resizeObserver = new ResizeObserver(onResize);
	resizeObserver.observe(mount);

	function destroy() {
		destroyed = true;
		try {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			canvas.removeEventListener('wheel', onWheel);
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerup', onPointerUp);
			canvas.removeEventListener('pointercancel', onPointerUp);
			canvas.removeEventListener('pointerleave', onPointerLeave);
			canvas.removeEventListener('click', onClick);
			focusState.animation?.kill();
			entryTimeline?.kill();
			tweens.killAll();
			renderer.dispose();
			rt.dispose();
			lensQuad.geometry.dispose();
			lensMaterial.dispose();
			pool.forEach((item) => {
				item.mesh.geometry.dispose();
				item.material.dispose();
			});
			sources.forEach((source) => source.texture?.dispose());
			renderer.domElement.remove();
		} catch (error) {
			console.error('LiquidGlassCarousel cleanup failed', error);
		}
	}

	return { closeFocus, destroy };
}
