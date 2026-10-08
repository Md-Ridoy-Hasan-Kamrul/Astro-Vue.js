/**
 * Particle navbar engine, ported from Particle Navbar (Matthias Ölschlegel, Framer).
 * The pill outline and its surface are made of fine particles. Hovering a link
 * streams nearby particles over to assemble a capsule around it, which glides
 * between links like a liquid pill. The CTA wears a particle ring that bursts on
 * press and rebuilds itself. On first view the pill assembles from left to right.
 *
 * Hooks in the root element:
 *   .pn-bar   the padded row (its top padding sets the capsule radius)
 *   .pn-links the link list (one continuous hover area)
 *   .pn-link  each link
 *   .pn-cta   the call-to-action
 * Hovered links get `.is-hot`.
 */

export type ParticleNavOptions = {
	color: string;
	hoverColor: string;
	density: number;
	size: number;
	glow: number;
	twinkle: number;
	gather: number;
	speed: number;
	drift: number;
	cursor: number;
	assemble: boolean;
	hasButton: boolean;
	radius: number;
	reduced: boolean;
};

type RGBA = [number, number, number, number];
type Rect = { x: number; y: number; w: number; h: number; r: number };
type Pt = { x: number; y: number; nx: number; ny: number };

const TAU = Math.PI * 2;
const K_EDGE = 0;
const K_FILL = 1;
const K_CTA = 2;
const LV = 14;

function clamp(v: number, a = 0, b = 1) {
	return v < a ? a : v > b ? b : v;
}

function smooth(e0: number, e1: number, x: number) {
	const t = clamp((x - e0) / (e1 - e0));
	return t * t * (3 - 2 * t);
}

function parseColor(input: string, fallback: RGBA): RGBA {
	if (!input) return fallback;
	let s = String(input).trim();
	if (s.startsWith('var(')) {
		const comma = s.indexOf(',');
		if (comma < 0) return fallback;
		s = s.slice(comma + 1, s.lastIndexOf(')')).trim();
		return parseColor(s, fallback);
	}
	if (s[0] === '#') {
		let h = s.slice(1);
		if (h.length === 3 || h.length === 4)
			h = h
				.split('')
				.map((c) => c + c)
				.join('');
		const n = parseInt(h.slice(0, 6), 16);
		if (isNaN(n)) return fallback;
		const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
	}
	const m = s.match(/rgba?\(([^)]+)\)/i);
	if (m) {
		const p = m[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map((x) => (x.endsWith('%') ? (parseFloat(x) / 100) * 255 : parseFloat(x)));
		if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
			let a = p.length > 3 && !isNaN(p[3]) ? p[3] : 1;
			if (a > 1) a = a / 255;
			return [p[0], p[1], p[2], a];
		}
	}
	return fallback;
}

function luminance(c: RGBA) {
	return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

function rgba(c: RGBA, a: number) {
	return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

function radiusOf(R: Rect) {
	return Math.max(0, Math.min(R.r, R.w / 2, R.h / 2));
}

function perimeterOf(R: Rect) {
	const r = radiusOf(R);
	return 2 * (R.w - 2 * r) + 2 * (R.h - 2 * r) + TAU * r;
}

function insetRect(R: Rect, d: number): Rect {
	return {
		x: R.x + d,
		y: R.y + d,
		w: Math.max(0, R.w - 2 * d),
		h: Math.max(0, R.h - 2 * d),
		r: Math.max(0, R.r - d),
	};
}

// Point on a rounded rectangle outline; t in [0, 1) runs clockwise from the top-left.
function rrPoint(t: number, R: Rect, o: Pt) {
	const r = radiusOf(R);
	const sw = Math.max(0, R.w - 2 * r);
	const sh = Math.max(0, R.h - 2 * r);
	const arc = (Math.PI * r) / 2;
	const L = 2 * sw + 2 * sh + 4 * arc;
	if (L <= 0) {
		o.x = R.x;
		o.y = R.y;
		o.nx = 0;
		o.ny = -1;
		return;
	}
	let d = (((t % 1) + 1) % 1) * L;
	const seg = [sw, arc, sh, arc, sw, arc, sh, arc];
	for (let s = 0; s < 8; s++) {
		if (d <= seg[s] || s === 7) {
			const len = seg[s];
			edgePoint(s, s === 2 ? d : s === 6 ? len - d : len > 0 ? d / len : 0, R, o, 1);
			return;
		}
		d -= seg[s];
	}
}

// Arc-length position on the outline -> segment and local parameter. Horizontal edges and
// corners use a fraction, the vertical sides a pixel offset from the top.
function edgeParam(d: number, C: Rect): [number, number] {
	const r = radiusOf(C);
	const sw = Math.max(0, C.w - 2 * r);
	const sh = Math.max(0, C.h - 2 * r);
	const arc = (Math.PI * r) / 2;
	const seg = [sw, arc, sh, arc, sw, arc, sh, arc];
	for (let s = 0; s < 8; s++) {
		if (d <= seg[s] || s === 7) {
			const len = seg[s];
			if (s === 2) return [2, Math.min(d, len)];
			if (s === 6) return [6, Math.max(0, len - d)];
			return [s, len > 0 ? clamp(d / len) : 0];
		}
		d -= seg[s];
	}
	return [0, 0];
}

// Places a particle on the current outline and returns its visibility.
function edgePoint(seg: number, a: number, S: Rect, o: Pt, slack: number) {
	const r = radiusOf(S);
	const sw = Math.max(0, S.w - 2 * r);
	const sh = Math.max(0, S.h - 2 * r);
	let ang = 0;
	let cx = 0;
	let cy = 0;
	switch (seg) {
		case 0:
			o.x = S.x + r + a * sw;
			o.y = S.y;
			o.nx = 0;
			o.ny = -1;
			return 1;
		case 2:
			o.x = S.x + S.w;
			o.y = S.y + r + Math.min(a, sh);
			o.nx = 1;
			o.ny = 0;
			return clamp((sh - a) / 5 + slack);
		case 4:
			o.x = S.x + S.w - r - a * sw;
			o.y = S.y + S.h;
			o.nx = 0;
			o.ny = 1;
			return 1;
		case 6:
			o.x = S.x;
			o.y = S.y + r + Math.min(a, sh);
			o.nx = -1;
			o.ny = 0;
			return clamp((sh - a) / 5 + slack);
		case 1:
			ang = -Math.PI / 2 + (a * Math.PI) / 2;
			cx = S.x + S.w - r;
			cy = S.y + r;
			break;
		case 3:
			ang = (a * Math.PI) / 2;
			cx = S.x + S.w - r;
			cy = S.y + S.h - r;
			break;
		case 5:
			ang = Math.PI / 2 + (a * Math.PI) / 2;
			cx = S.x + r;
			cy = S.y + S.h - r;
			break;
		default:
			ang = Math.PI + (a * Math.PI) / 2;
			cx = S.x + r;
			cy = S.y + r;
	}
	o.nx = Math.cos(ang);
	o.ny = Math.sin(ang);
	o.x = cx + o.nx * r;
	o.y = cy + o.ny * r;
	return 1;
}

// Signed distance from a point to a rounded rectangle (negative inside).
function rrDist(x: number, y: number, R: Rect) {
	const r = radiusOf(R);
	const qx = Math.abs(x - (R.x + R.w / 2)) - (R.w / 2 - r);
	const qy = Math.abs(y - (R.y + R.h / 2)) - (R.h / 2 - r);
	const ox = Math.max(qx, 0);
	const oy = Math.max(qy, 0);
	return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

// Maps (u, v) in the unit square into a rounded rectangle without gaps or clumps.
function fillPoint(u: number, v: number, R: Rect, o: { x: number; y: number }) {
	const r = radiusOf(R);
	const y = R.y + v * R.h;
	const dy = Math.abs(y - (R.y + R.h / 2));
	const e = dy - (R.h / 2 - r);
	const hw = R.w / 2 - r + (e > 0 ? Math.sqrt(Math.max(0, r * r - e * e)) : r);
	o.x = R.x + R.w / 2 + (u * 2 - 1) * hw;
	o.y = y;
}

// Same as fillPoint, but the vertical position is a pixel offset from the top.
function fillPointPx(u: number, yOff: number, R: Rect, o: Pt, slack: number) {
	const v = R.h > 0 ? Math.min(yOff, R.h) / R.h : 0;
	fillPoint(u, v, R, o);
	return clamp((R.h - yOff) / 6 + slack);
}

export class ParticleEngine {
	root: HTMLElement;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D | null;
	o: ParticleNavOptions;
	M = 44;
	ratio = 1;
	w = 0;
	h = 0;
	barH = 0;
	capH = 0;
	cssH = 0;
	cssW = 0;
	scale = 1;
	innerR = 16;
	shape: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
	capShape: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
	buildKey = '';
	builtW = 0;
	homesDirty = true;
	pendingDraw = false;
	linkEls: HTMLElement[] = [];
	linkRects: (Rect | null)[] = [];
	ctaEl: HTMLElement | null = null;
	cta: Rect | null = null;
	n = 0;
	x = new Float32Array(0);
	y = new Float32Array(0);
	vx = new Float32Array(0);
	vy = new Float32Array(0);
	hx = new Float32Array(0);
	hy = new Float32Array(0);
	p1 = new Float32Array(0);
	p2 = new Float32Array(0);
	sz = new Float32Array(0);
	al = new Float32Array(0);
	ph = new Float32Array(0);
	tw = new Float32Array(0);
	rk = new Float32Array(0);
	ed = new Float32Array(0);
	bo = new Float32Array(0);
	td = new Float32Array(0);
	lf = new Float32Array(0);
	vz = new Float32Array(0);
	gt = new Float32Array(0);
	gb = new Float32Array(0);
	dl = new Float32Array(0);
	sb = new Float32Array(0);
	sa = new Float32Array(0);
	hd = new Float32Array(0);
	mt = new Float32Array(0);
	st = new Uint8Array(0);
	ls = new Int32Array(0);
	da = new Float32Array(0);
	ht = new Float32Array(0);
	kind = new Uint8Array(0);
	seg = new Uint8Array(0);
	flag = new Uint8Array(0);
	gm = new Uint8Array(0);
	rEdge: [number, number] = [0, 0];
	rFill: [number, number] = [0, 0];
	rCta: [number, number] = [0, 0];
	hover = -1;
	hoverRect: Rect | null = null;
	capA = { x0: 0, x1: 0, y0: 0, y1: 0, v0: 0, v1: 0, w0: 0, w1: 0, moving: false };
	capRect: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
	capIn: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };
	gathered: number[] = [];
	releaseTimer = 0;
	pointer = { x: 0, y: 0, inside: false };
	ctaHover = false;
	ctaHotEl: HTMLElement | null = null;
	ctaEn = 0;
	cp = 0;
	lastDrawT = 0;
	settling = false;
	alphaInit = false;
	sameColor = true;
	ctaPhase = 0;
	capPhase = 0;
	burstT = -99;
	entranceT = -99;
	entering = false;
	entered = false;
	// With the entrance on, nothing is drawn until it starts (no full pill flashing first).
	waiting = false;
	motion = 0;
	base: RGBA = [255, 255, 255, 1];
	hot: RGBA = [255, 255, 255, 1];
	glowMode = true;
	fills: string[] = [];
	sprite: HTMLCanvasElement | null = null;
	bx: Float32Array[] = [];
	bc = new Int32Array(LV * 2);
	gl = new Float32Array(3 * 1600);
	glc = 0;
	running = false;
	visible = true;
	pageVisible = true;
	raf = 0;
	lastUpdate = 0;
	frame = 0;
	ro: ResizeObserver | null = null;
	io: IntersectionObserver | null = null;
	tmp: Pt = { x: 0, y: 0, nx: 0, ny: 0 };
	destroyed = false;

	constructor(root: HTMLElement, canvas: HTMLCanvasElement, o: ParticleNavOptions) {
		this.root = root;
		this.canvas = canvas;
		this.o = o;
		this.waiting = o.assemble && !o.reduced;
		this.ctx = canvas.getContext('2d');
		for (let b = 0; b < LV * 2; b++) this.bx.push(new Float32Array(3 * 256));
		this.palette();
		this.collect();
		this.measure(true);
		root.addEventListener('pointermove', this.onMove);
		root.addEventListener('pointerleave', this.onLeave);
		root.addEventListener('pointerdown', this.onDown);
		root.addEventListener('focusin', this.onFocusIn);
		root.addEventListener('focusout', this.onFocusOut);
		document.addEventListener('visibilitychange', this.onVisibility);
		if (typeof ResizeObserver !== 'undefined') {
			this.ro = new ResizeObserver(() => this.onResize());
			this.ro.observe(root);
		}
		document.fonts?.ready.then(() => !this.destroyed && this.onResize()).catch(() => {});
		if (typeof IntersectionObserver !== 'undefined') {
			this.io = new IntersectionObserver(
				(entries) => {
					for (const e of entries) this.visible = e.isIntersecting;
					if (this.visible) {
						if (!this.entered) this.enter();
						this.wake();
					} else this.stop();
				},
				{ rootMargin: '60px' },
			);
			this.io.observe(root);
		} else {
			this.enter();
			this.wake();
		}
	}

	now() {
		return performance.now() / 1e3;
	}

	destroy() {
		this.destroyed = true;
		this.stop();
		window.clearTimeout(this.releaseTimer);
		this.root.removeEventListener('pointermove', this.onMove);
		this.root.removeEventListener('pointerleave', this.onLeave);
		this.root.removeEventListener('pointerdown', this.onDown);
		this.root.removeEventListener('focusin', this.onFocusIn);
		this.root.removeEventListener('focusout', this.onFocusOut);
		document.removeEventListener('visibilitychange', this.onVisibility);
		this.ro?.disconnect();
		this.io?.disconnect();
		for (const el of this.linkEls) el.classList.remove('is-hot');
		this.ctaHotEl?.classList.remove('is-hot');
	}

	setOptions(o: ParticleNavOptions) {
		const prev = this.o;
		this.o = o;
		if (prev.color !== o.color || prev.hoverColor !== o.hoverColor) this.palette();
		if (o.reduced && this.entering) this.entering = false;
		if (!o.assemble || o.reduced) this.waiting = false;
		this.collect();
		this.measure(false);
		this.flushDraw();
		this.wake();
	}

	refresh() {
		this.collect();
		this.measure(false);
		this.flushDraw();
		this.wake();
	}

	palette() {
		this.base = parseColor(this.o.color, [255, 255, 255, 1]);
		this.hot = parseColor(this.o.hoverColor, this.base);
		this.sameColor =
			Math.abs(this.base[0] - this.hot[0]) +
				Math.abs(this.base[1] - this.hot[1]) +
				Math.abs(this.base[2] - this.hot[2]) <
				6 && Math.abs(this.base[3] - this.hot[3]) < 0.02;
		this.glowMode = luminance(this.base) > 0.45;
		this.fills = [];
		for (let c = 0; c < 2; c++) {
			const col = c ? this.hot : this.base;
			for (let l = 0; l < LV; l++) this.fills.push(rgba(col, ((l + 0.5) / LV) * col[3]));
		}
		this.sprite = null;
		if (this.glowMode) {
			const s = document.createElement('canvas');
			s.width = s.height = 64;
			const g = s.getContext('2d');
			if (g) {
				const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
				grd.addColorStop(0, rgba(this.hot, 1));
				grd.addColorStop(0.35, rgba(this.hot, 0.35));
				grd.addColorStop(1, rgba(this.hot, 0));
				g.fillStyle = grd;
				g.fillRect(0, 0, 64, 64);
				this.sprite = s;
			}
		}
	}

	collect() {
		const r = this.root;
		this.linkEls.forEach((el) => el.classList.remove('is-hot'));
		this.linkEls = Array.from(r.querySelectorAll<HTMLElement>('.pn-bar .pn-link'));
		if (this.hover >= 0 && this.linkEls[this.hover]) this.linkEls[this.hover].classList.add('is-hot');
		this.ctaEl = r.querySelector<HTMLElement>('.pn-bar .pn-cta');
	}

	measure(force: boolean) {
		const root = this.root;
		const w = root.offsetWidth;
		const h = root.offsetHeight;
		const bb = root.getBoundingClientRect();
		// offsetWidth is rounded while the rect is fractional; ignore that sub-pixel wobble so
		// an animating width does not look like a zoom change every frame.
		const s = w > 0 && bb.width > 0 ? bb.width / w : 1;
		this.scale = Math.abs(s - 1) < 0.02 ? 1 : s;
		const bar = root.querySelector<HTMLElement>('.pn-bar');
		this.barH = bar ? bar.offsetHeight : h;
		this.capH = Math.max(h, this.barH);
		if (bar) {
			const pt = parseFloat(getComputedStyle(bar).paddingTop) || 0;
			this.innerR = Math.max(6, this.o.radius - pt);
		}
		this.w = w;
		this.h = h;
		this.computeRects(bb);
		const dpr = window.devicePixelRatio || 1;
		this.ratio = Math.min(3, Math.max(1, dpr * this.scale));
		this.fitCanvas();
		this.updateShape();
		const o = this.o;
		// While the bar's width animates (compact on scroll), keep the particles and let the
		// outline stretch with it; only a big change in width lays them out again.
		const keepWidth = this.builtW > 0 && Math.abs(w - this.builtW) / this.builtW < 0.45;
		const key = [
			Math.round(keepWidth ? this.builtW : w),
			Math.round(this.capH),
			Math.round(this.barH),
			this.cta ? Math.round(this.cta.w) + 'x' + Math.round(this.cta.h) : '-',
			o.density,
			o.size,
			o.hasButton,
			o.radius,
		].join('|');
		if (force || key !== this.buildKey) {
			this.buildKey = key;
			this.builtW = w;
			this.build();
		}
		this.homesDirty = true;
	}

	fitCanvas() {
		const cssH = Math.round(this.h + this.M * 2);
		if (cssH !== this.cssH) {
			this.cssH = cssH;
			this.canvas.style.height = cssH + 'px';
		}
		// The canvas only ever grows in width, so a bar animating its width (compact on scroll)
		// draws into the same buffer every frame instead of reallocating and blanking it.
		const cssW = Math.max(this.cssW, Math.round(this.w + this.M * 2));
		if (cssW !== this.cssW) {
			this.cssW = cssW;
			this.canvas.style.width = cssW + 'px';
		}
		const cw = Math.max(1, Math.round(cssW * this.ratio));
		const ch = Math.max(1, Math.round(cssH * this.ratio));
		if (this.canvas.width !== cw || this.canvas.height !== ch) {
			this.canvas.width = cw;
			this.canvas.height = ch;
			this.pendingDraw = true;
		}
	}

	// A resized canvas is blank until the next frame, so redraw it right away.
	flushDraw() {
		if (!this.pendingDraw) return;
		this.pendingDraw = false;
		if (this.homesDirty) this.computeHomes();
		this.draw(this.now());
	}

	computeRects(bb?: DOMRect) {
		const box = bb || this.root.getBoundingClientRect();
		const s = this.scale || 1;
		const rel = (el: HTMLElement): Rect | null => {
			if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return null;
			const b = el.getBoundingClientRect();
			if (b.width === 0 && b.height === 0) return null;
			return {
				x: (b.left - box.left) / s,
				y: (b.top - box.top) / s,
				w: b.width / s,
				h: b.height / s,
				r: b.height / s / 2,
			};
		};
		this.linkRects = this.linkEls.map((el) => {
			const rc = rel(el);
			if (rc) rc.r = Math.min(rc.h / 2, this.innerR);
			return rc;
		});
		this.cta = this.ctaEl ? rel(this.ctaEl) : null;
		if (this.cta && this.ctaEl) {
			const br = parseFloat(getComputedStyle(this.ctaEl).borderTopLeftRadius);
			this.cta.r = Math.min(this.cta.h / 2, isNaN(br) ? this.cta.h / 2 : br);
		}
		if (this.hover >= 0) {
			const rc = this.linkRects[this.hover];
			if (rc) this.hoverRect = rc;
		}
	}

	shapeAt(h: number): Rect {
		const r = Math.min(this.o.radius, this.barH / 2, h / 2, this.w / 2);
		return { x: 0, y: 0, w: this.w, h, r };
	}

	updateShape() {
		this.shape = this.shapeAt(this.h);
	}

	build() {
		const o = this.o;
		const d = clamp(o.density, 0.2, 3);
		const f = this.w < 520 ? 0.82 : 1;
		const C = this.shapeAt(Math.max(this.h, this.barH));
		this.capShape = C;
		const perim = Math.max(perimeterOf(C), 1);
		const inner = insetRect(C, 3.4);
		const area = Math.max(inner.w * inner.h, 1);
		let nE = Math.round(perim / (1.3 / (d * f)));
		let nF = Math.round(area / (70 / (d * f)));
		let nC = 0;
		if (o.hasButton && this.cta) {
			const cp = perimeterOf(this.cta);
			const ca = this.cta.w * this.cta.h;
			nC = Math.round((cp / 1.05) * d + (ca / 40) * d);
		}
		const MAX = 7e3;
		const total0 = nE + nF + nC;
		if (total0 > MAX) {
			const k = MAX / total0;
			nE = Math.round(nE * k);
			nF = Math.round(nF * k);
			nC = Math.round(nC * k);
		}
		const n = nE + nF + nC;
		this.n = n;
		const F = () => new Float32Array(n);
		this.x = F();
		this.y = F();
		this.vx = F();
		this.vy = F();
		this.hx = F();
		this.hy = F();
		this.p1 = F();
		this.p2 = F();
		this.sz = F();
		this.al = F();
		this.ph = F();
		this.tw = F();
		this.rk = F();
		this.ed = F();
		this.bo = F();
		this.td = F();
		this.lf = F();
		this.vz = F();
		this.gt = F();
		this.gb = F();
		this.dl = F();
		this.sb = F();
		this.sa = F();
		this.hd = F();
		this.mt = F();
		this.st = new Uint8Array(n);
		this.ls = new Int32Array(n);
		this.da = F();
		this.ht = F();
		this.alphaInit = false;
		this.kind = new Uint8Array(n);
		this.seg = new Uint8Array(n);
		this.flag = new Uint8Array(n);
		this.gm = new Uint8Array(n);
		this.gathered = [];
		let i = 0;
		const size = clamp(o.size, 0.4, 4);
		const R = Math.random;
		const common = (idx: number) => {
			this.ph[idx] = R() * TAU;
			this.tw[idx] = 1.1 + R() * 2.4;
			this.rk[idx] = 0.72 + R() * 0.56;
			this.lf[idx] = 1;
			this.vz[idx] = 1;
		};
		this.rEdge = [i, i + nE];
		for (let j = 0; j < nE; j++, i++) {
			this.kind[i] = K_EDGE;
			const [sg, a] = edgeParam(R() * perim, C);
			this.seg[i] = sg;
			this.p1[i] = a;
			this.p2[i] = -Math.pow(R(), 2.2) * 1.15 + 0.22;
			this.sz[i] = size * (0.7 + R() * 0.5);
			this.al[i] = 0.4 + R() * 0.34;
			common(i);
		}
		this.rFill = [i, i + nF];
		for (let j = 0; j < nF; j++, i++) {
			this.kind[i] = K_FILL;
			this.p1[i] = R();
			this.p2[i] = R() * inner.h;
			const sparkle = R() < 0.03;
			this.sz[i] = size * (sparkle ? 1.05 + R() * 0.4 : 0.55 + R() * 0.6);
			this.al[i] = sparkle ? 0.55 + R() * 0.3 : 0.09 + R() * R() * 0.3;
			common(i);
		}
		this.rCta = [i, i + nC];
		if (nC) {
			const cp = this.cta ? perimeterOf(this.cta) : 1;
			const edgeShare = Math.min(0.9, ((cp / 1.05) * d) / Math.max(1, nC));
			for (let j = 0; j < nC; j++, i++) {
				this.kind[i] = K_CTA;
				const edge = R() < edgeShare;
				this.gm[i] = edge ? 0 : 1;
				this.p1[i] = R();
				if (edge) this.p2[i] = -Math.pow(R(), 2) * 1 + 0.25;
				else {
					// inner specks hug the rim so the label stays calm
					const q = Math.pow(R(), 2.2) * 0.42;
					this.p2[i] = R() < 0.5 ? q : 1 - q;
				}
				this.sz[i] = size * (edge ? 0.72 + R() * 0.45 : 0.55 + R() * 0.5);
				this.al[i] = 0.62 + R() * 0.38;
				common(i);
			}
		}
		this.updateShape();
		this.computeHomes(false);
		for (let q = 0; q < n; q++) {
			let px = this.hx[q];
			let py = this.hy[q];
			if (this.kind[q] === K_CTA) {
				const c = this.cta;
				px = c ? c.x + c.w * (0.1 + 0.8 * this.p1[q]) : 0;
				py = c ? c.y + c.h * 0.5 : 0;
			}
			this.x[q] = px;
			this.y[q] = py;
		}
		if (this.entering) this.scatter(this.now() - this.entranceT);
		if (this.hover >= 0) {
			const h = this.hover;
			this.hover = -1;
			this.setHover(h);
		}
	}

	// `carry` moves resting particles together with their homes, so the outline sticks to the
	// glass while the nav resizes instead of trailing behind on springs.
	computeHomes(carry = true) {
		const S = this.shape;
		const C = this.capShape;
		const t = this.tmp;
		const sideC = Math.max(0, C.h - 2 * radiusOf(C));
		const sideS = Math.max(0, S.h - 2 * radiusOf(S));
		const slackE = clamp(1 - (sideC - sideS) / 10);
		const slackF = clamp(1 - (C.h - S.h) / 12);
		const [e0, e1] = this.rEdge;
		for (let i = e0; i < e1; i++) {
			const v = edgePoint(this.seg[i], this.p1[i], S, t, slackE);
			const b = this.p2[i];
			const nx = t.x + t.nx * b;
			const ny = t.y + t.ny * b;
			if (carry) {
				this.x[i] += nx - this.hx[i];
				this.y[i] += ny - this.hy[i];
			}
			this.hx[i] = nx;
			this.hy[i] = ny;
			this.vz[i] = v;
			// light from above: bright top rim, softer sides, dim underside
			this.lf[i] = 0.82 - 0.3 * t.ny;
		}
		const Si = insetRect(S, 3.4);
		const [f0, f1] = this.rFill;
		for (let i = f0; i < f1; i++) {
			this.vz[i] = fillPointPx(this.p1[i], this.p2[i], Si, t, slackF);
			if (carry && this.flag[i] !== 1) {
				this.x[i] += t.x - this.hx[i];
				this.y[i] += t.y - this.hy[i];
			}
			this.hx[i] = t.x;
			this.hy[i] = t.y;
			// calm interior for the labels, a little more life near the rim
			const dEdge = Math.min(t.y - S.y, S.y + S.h - t.y);
			const e = 1 - smooth(0, 1, dEdge / 22);
			this.lf[i] = (0.42 + 0.58 * e) * (1.08 - 0.16 * clamp((t.y - S.y) / Math.max(1, S.h)));
		}
		this.homesDirty = false;
	}

	local(e: PointerEvent) {
		const b = this.root.getBoundingClientRect();
		const s = this.scale || 1;
		return { x: (e.clientX - b.left) / s, y: (e.clientY - b.top) / s };
	}

	onResize() {
		if (this.destroyed) return;
		this.measure(false);
		this.flushDraw();
		this.wake();
	}

	setCtaHover(el: HTMLElement | null) {
		if (this.ctaHotEl && this.ctaHotEl !== el) this.ctaHotEl.classList.remove('is-hot');
		if (el) el.classList.add('is-hot');
		this.ctaHotEl = el;
		this.ctaHover = !!el && el === this.ctaEl;
	}

	hoverFromElement(link: HTMLElement | null, inList = false) {
		if (link) {
			const i = this.linkEls.indexOf(link);
			if (i >= 0) {
				window.clearTimeout(this.releaseTimer);
				this.releaseTimer = 0;
				this.setHover(i);
				return;
			}
		}
		if (inList && this.hover >= 0) {
			window.clearTimeout(this.releaseTimer);
			this.releaseTimer = 0;
			return;
		}
		if (this.hover >= 0 && !this.releaseTimer) this.scheduleRelease(140);
	}

	scheduleRelease(ms: number) {
		window.clearTimeout(this.releaseTimer);
		this.releaseTimer = window.setTimeout(() => {
			this.releaseTimer = 0;
			this.setHover(-1);
			this.wake();
		}, ms);
	}

	setHover(i: number) {
		if (i === this.hover && (i < 0 || this.gathered.length)) return;
		const prev = this.hover;
		if (prev >= 0 && this.linkEls[prev]) this.linkEls[prev].classList.remove('is-hot');
		this.hover = i;
		const t = this.now();
		if (i < 0) {
			this.releaseAll(t);
			this.gathered = [];
			this.hoverRect = null;
			return;
		}
		if (this.linkEls[i]) this.linkEls[i].classList.add('is-hot');
		this.computeRects();
		const cap = this.linkRects[i];
		if (!cap) return;
		this.hoverRect = cap;
		if (this.gathered.length) {
			// another link: the formed capsule glides over as one shape (stepCapsule)
			this.wake();
			return;
		}
		const ca = this.capA;
		ca.x0 = cap.x;
		ca.x1 = cap.x + cap.w;
		ca.y0 = cap.y;
		ca.y1 = cap.y + cap.h;
		ca.v0 = ca.v1 = ca.w0 = ca.w1 = 0;
		this.syncCapsule();
		const cx = cap.x + cap.w / 2;
		const cy = cap.y + cap.h / 2;
		const [f0, f1] = this.rFill;
		if (this.homesDirty) this.computeHomes();
		{
			let visCount = 0;
			for (let j = f0; j < f1; j++) if (this.vz[j] > 0.5) visCount++;
			const g = clamp(this.o.gather, 0.05, 0.9);
			const K = Math.round(Math.min(visCount * g, (cap.w * cap.h * g) / 5.4));
			const cand: { j: number; d: number }[] = [];
			for (let j = f0; j < f1; j++) {
				if (this.vz[j] <= 0.5) continue;
				const dx = this.x[j] - cx;
				const dy = this.y[j] - cy;
				cand.push({ j, d: dx * dx + dy * dy * 4 + Math.random() * 2200 });
			}
			cand.sort((a, b) => a.d - b.d);
			this.gathered = cand.slice(0, K).map((c) => c.j);
		}
		const list = this.gathered.map((j) => ({
			j,
			a: Math.atan2((this.y[j] - cy) / Math.max(1, cap.h), (this.x[j] - cx) / Math.max(1, cap.w)),
		}));
		list.sort((a, b) => a.a - b.a);
		let bestT = 0;
		let bestD = 1e9;
		const a0 = list.length ? list[0].a : 0;
		for (let q = 0; q < 72; q++) {
			const tt = q / 72;
			rrPoint(tt, cap, this.tmp);
			const aa = Math.atan2((this.tmp.y - cy) / cap.h, (this.tmp.x - cx) / cap.w);
			let dd = Math.abs(aa - a0);
			if (dd > Math.PI) dd = TAU - dd;
			if (dd < bestD) {
				bestD = dd;
				bestT = tt;
			}
		}
		const edges = list.filter((_, q) => q % 8 < 5).length || 1;
		let e = 0;
		const sp = clamp(this.o.speed, 0.3, 3);
		for (let q = 0; q < list.length; q++) {
			const j = list[q].j;
			if (q % 8 < 5) {
				this.gm[j] = 0;
				this.gt[j] = bestT + e / edges;
				this.gb[j] = (Math.random() - 0.5) * 1.5;
				e++;
			} else {
				this.gm[j] = 1;
				this.gt[j] = Math.random();
				this.gb[j] = Math.random();
			}
			const dx = this.x[j] - cx;
			const dy = this.y[j] - cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			// particles still glowing from a release rejoin right away, the rest stream in by distance
			const warm = this.flag[j] !== 0 || this.ht[j] > 0.3;
			this.dl[j] = this.o.reduced
				? t
				: t + (warm ? Math.random() * 0.04 : dist / (1100 * sp) + Math.random() * 0.05);
			this.flag[j] = 1;
			this.st[j] = 0;
			// its spot shows empty while the capsule forms, then heals softly (farthest first)
			const far = clamp(dist / 220);
			this.hd[j] = this.sb[j] > 0.5 ? t : t + 0.5 + 0.3 * (1 - far) + Math.random() * 0.08;
		}
		this.wake();
	}

	// Leaving: a capsule particle whose own spot is still empty flies back and refills it. One
	// whose spot is already shown by its stand-in dissolves into the field right around the
	// capsule and then quietly takes the stand-in's place, so nothing ever crosses the bar.
	releaseAll(t: number) {
		const [f0, f1] = this.rFill;
		const R = this.capRect;
		const cx = R.x + R.w / 2;
		const cy = R.y + R.h / 2;
		const landers: number[] = [];
		for (let j = f0; j < f1; j++) {
			if (this.flag[j] !== 1) continue;
			this.st[j] = 0;
			if (t < this.dl[j]) {
				// never left its spot
				this.flag[j] = 0;
				continue;
			}
			if (this.o.reduced) {
				this.flag[j] = 0;
				this.x[j] = this.hx[j];
				this.y[j] = this.hy[j];
				this.vx[j] = 0;
				this.vy[j] = 0;
				this.sb[j] = 0;
				continue;
			}
			const hdx = this.hx[j] - cx;
			const hdy = this.hy[j] - cy;
			if (this.sb[j] >= 0.5 && hdx * hdx + hdy * hdy * 4 > 220 * 220) landers.push(j);
			else {
				this.flag[j] = 3;
				this.dl[j] = t + 0.04 + Math.random() * 0.1;
			}
		}
		if (!landers.length) return;
		// the nearest visible spots around the capsule, matched by angle with the best rotation
		const spots: { j: number; d: number }[] = [];
		for (let j = f0; j < f1; j++) {
			if (this.flag[j] !== 0 || this.vz[j] <= 0.5) continue;
			spots.push({ j, d: rrDist(this.hx[j], this.hy[j], R) });
		}
		spots.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
		const m = Math.min(landers.length, spots.length);
		for (let k = m; k < landers.length; k++) {
			this.flag[landers[k]] = 3;
			this.dl[landers[k]] = t + 0.04 + Math.random() * 0.1;
		}
		if (!m) return;
		const L = landers.slice(0, m).map((j) => ({ j, a: Math.atan2(this.y[j] - cy, this.x[j] - cx) }));
		const S = spots.slice(0, m).map((c) => ({ j: c.j, a: Math.atan2(this.hy[c.j] - cy, this.hx[c.j] - cx) }));
		L.sort((a, b) => a.a - b.a);
		S.sort((a, b) => a.a - b.a);
		let bestOff = 0;
		let bestCost = Infinity;
		const step = Math.max(1, Math.floor(m / 60));
		for (let off = 0; off < m; off += step) {
			let c = 0;
			for (let q = 0; q < m; q++) {
				const a = L[q].j;
				const b = S[(q + off) % m].j;
				const dx = this.x[a] - this.hx[b];
				const dy = this.y[a] - this.hy[b];
				c += dx * dx + dy * dy;
			}
			if (c < bestCost) {
				bestCost = c;
				bestOff = off;
			}
		}
		for (let q = 0; q < m; q++) {
			const a = L[q].j;
			this.flag[a] = 5;
			this.ls[a] = S[(q + bestOff) % m].j;
			this.dl[a] = t + 0.04 + Math.random() * 0.1;
		}
	}

	// The highlight capsule as an animated shape: on a link change its edges spring to the new
	// link, the leading edge faster than the trailing one, so it stretches over and settles.
	stepCapsule(dt: number) {
		const target = this.hoverRect;
		const ca = this.capA;
		if (!target) return;
		const tx0 = target.x;
		const tx1 = target.x + target.w;
		const ty0 = target.y;
		const ty1 = target.y + target.h;
		if (this.o.reduced) {
			ca.x0 = tx0;
			ca.x1 = tx1;
			ca.y0 = ty0;
			ca.y1 = ty1;
			ca.v0 = ca.v1 = ca.w0 = ca.w1 = 0;
		} else {
			const sp = clamp(this.o.speed, 0.3, 3);
			const right = tx0 + tx1 > ca.x0 + ca.x1;
			// long jumps glide a little softer so the stretch stays modest
			const jump = Math.abs(tx0 + tx1 - ca.x0 - ca.x1) / 2;
			const soft = jump > 2.2 * Math.max(40, target.w) ? 0.6 : 1;
			const kLead = 700 * sp * sp * soft;
			const kTrail = 380 * sp * sp * soft;
			const spring = (p: number, v: number, to: number, k: number, z: number, h: number) => {
				const c = 2 * Math.sqrt(k) * z;
				return v + (k * (to - p) - c * v) * h;
			};
			const steps = dt > 1 / 90 ? 2 : 1;
			const h = dt / steps;
			for (let q = 0; q < steps; q++) {
				ca.v0 = spring(ca.x0, ca.v0, tx0, right ? kTrail : kLead, right ? 0.95 : 0.9, h);
				ca.v1 = spring(ca.x1, ca.v1, tx1, right ? kLead : kTrail, right ? 0.9 : 0.95, h);
				ca.w0 = spring(ca.y0, ca.w0, ty0, 700 * sp * sp, 0.95, h);
				ca.w1 = spring(ca.y1, ca.w1, ty1, 700 * sp * sp, 0.95, h);
				ca.x0 += ca.v0 * h;
				ca.x1 += ca.v1 * h;
				ca.y0 += ca.w0 * h;
				ca.y1 += ca.w1 * h;
			}
			// the stretch never exceeds ~35 %: the trailing edge is pulled along
			const maxW = Math.max(target.w, 8) * 1.35;
			if (ca.x1 - ca.x0 > maxW) {
				if (right) ca.x0 = ca.x1 - maxW;
				else ca.x1 = ca.x0 + maxW;
			}
		}
		this.syncCapsule();
	}

	syncCapsule() {
		const ca = this.capA;
		const target = this.hoverRect;
		let x0 = Math.min(ca.x0, ca.x1 - 4);
		const x1 = Math.max(ca.x1, x0 + 4);
		let y0 = ca.y0;
		let y1 = ca.y1;
		// a stretched capsule gets a touch thinner (keeps the liquid look)
		if (target) {
			const stretch = (x1 - x0) / Math.max(1, target.w);
			if (stretch > 1) {
				const k = Math.max(0.8, 1 / Math.sqrt(stretch));
				const cy = (y0 + y1) / 2;
				const hh = ((y1 - y0) / 2) * k;
				y0 = cy - hh;
				y1 = cy + hh;
			}
		}
		x0 = Math.min(x0, x1 - 4);
		const h = Math.max(4, y1 - y0);
		const R = this.capRect;
		R.x = x0;
		R.y = y0;
		R.w = x1 - x0;
		R.h = h;
		R.r = Math.min(h / 2, this.innerR);
		const I = this.capIn;
		I.x = R.x + 3;
		I.y = R.y + 3;
		I.w = Math.max(0, R.w - 6);
		I.h = Math.max(0, R.h - 6);
		I.r = Math.max(0, R.r - 3);
		ca.moving = Math.abs(ca.v0) + Math.abs(ca.v1) + Math.abs(ca.w0) + Math.abs(ca.w1) > 2;
	}

	burst() {
		if (this.o.reduced || !this.cta) return;
		const t = this.now();
		this.burstT = t;
		const c = this.cta;
		const cx = c.x + c.w / 2;
		const cy = c.y + c.h / 2;
		const kick = (i: number, base: number) => {
			let dx = this.x[i] - cx;
			let dy = this.y[i] - cy;
			const dd = Math.sqrt(dx * dx + dy * dy) || 1;
			dx /= dd;
			dy /= dd;
			const ang = (Math.random() - 0.5) * 1.1;
			const ca = Math.cos(ang);
			const sa = Math.sin(ang);
			const ux = dx * ca - dy * sa;
			const uy = dx * sa + dy * ca;
			const s = base * (0.4 + Math.random() * 0.95);
			this.vx[i] += ux * s;
			this.vy[i] += uy * s * 0.8;
		};
		const [c0, c1] = this.rCta;
		for (let i = c0; i < c1; i++) kick(i, 200);
		const [e0, f1] = [this.rEdge[0], this.rFill[1]];
		for (let i = e0; i < f1; i++) {
			const dx = this.x[i] - cx;
			const dy = this.y[i] - cy;
			if (dx * dx + dy * dy < 90 * 90) kick(i, 80);
		}
		this.wake();
	}

	enter() {
		if (this.entered) return;
		this.entered = true;
		this.waiting = false;
		if (!this.o.assemble || this.o.reduced || !this.n) return;
		this.entranceT = this.now();
		this.entering = true;
		this.scatter(0);
	}

	// Scatters the particles into a soft cloud; they then assemble the pill from left to right.
	scatter(elapsed: number) {
		const S = this.shape;
		const R = Math.random;
		for (let i = 0; i < this.n; i++) {
			const kd = this.kind[i];
			const bx = kd <= K_FILL ? this.hx[i] : this.x[i];
			const by = kd <= K_FILL ? this.hy[i] : this.y[i];
			const ang = R() * TAU;
			const dist = 34 + R() * 120;
			this.x[i] = bx + Math.cos(ang) * dist;
			this.y[i] = by + Math.sin(ang) * dist * 0.5;
			this.vx[i] = 0;
			this.vy[i] = 0;
			this.ed[i] = elapsed + clamp((bx - S.x) / Math.max(1, S.w)) * 0.5 + R() * 0.24;
		}
	}

	wake() {
		if (this.destroyed || !this.visible || !this.pageVisible) return;
		this.running = true;
		if (!this.raf) {
			this.lastUpdate = this.now();
			this.raf = requestAnimationFrame(this.tick);
		}
	}

	stop() {
		this.running = false;
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	idle(t: number) {
		return (
			!this.pointer.inside &&
			this.hover < 0 &&
			!this.ctaHover &&
			this.ctaEn < 0.01 &&
			!this.settling &&
			!this.capA.moving &&
			this.cp < 0.003 &&
			t - this.burstT > 1.3 &&
			!this.entering &&
			this.motion < 3
		);
	}

	update(dt: number, t: number) {
		const o = this.o;
		if (this.homesDirty) this.computeHomes();
		const reduced = o.reduced;
		const sp = clamp(o.speed, 0.3, 3);
		// eased energies: quick to wake up, slow and soft to calm down (no abrupt stops)
		const ease = (cur: number, on: boolean, up: number, down: number) => {
			const target = on ? 1 : 0;
			return cur + (target - cur) * (1 - Math.exp(-dt / (target > cur ? up : down)));
		};
		this.ctaEn = reduced ? (this.ctaHover ? 1 : 0) : ease(this.ctaEn, this.ctaHover, 0.16, 0.5);
		this.ctaPhase += dt * (0.014 + 0.13 * this.ctaEn);
		this.capPhase += dt * 0.028;
		this.stepCapsule(dt);
		const driftAmp = reduced ? 0 : clamp(o.drift, 0, 1) * 1.7;
		const ba = t - this.burstT;
		const inBurst = ba < 0.24;
		const rebuildK = clamp((ba - 0.24) / 0.35);
		const cap = this.hoverRect ? this.capRect : null;
		const capIn = this.capIn;
		// presence of the capsule (drives the small clearing that travels with it)
		this.cp = reduced ? (cap ? 1 : 0) : ease(this.cp, !!cap, 0.25, 0.18);
		const sbUp = reduced ? 1 : 1 - Math.exp(-dt / 0.2);
		const sbDown = reduced ? 1 : 1 - Math.exp(-dt / 0.12);
		const pin = this.pointer.inside && !reduced && o.cursor > 0;
		const px = this.pointer.x;
		const py = this.pointer.y;
		const CR = 50;
		const CR2 = CR * CR;
		const cStr = clamp(o.cursor, 0, 1) * 2400;
		const tp = this.tmp;
		const cta = this.cta;
		const ring = cta ? insetRect(cta, -(0.4 + 1.6 * this.ctaEn)) : null;
		const ctaIn = cta ? insetRect(cta, 3) : null;
		const ccx = cta ? cta.x + cta.w / 2 : 0;
		const ccy = cta ? cta.y + cta.h / 2 : 0;
		const pull = !reduced && cta && this.ctaEn > 0.02 ? this.ctaEn * 460 : 0;
		const VMAX = 950;
		let motion = 0;
		const n = this.n;
		for (let i = 0; i < n; i++) {
			const kd = this.kind[i];
			let tx = 0;
			let ty = 0;
			let K = 90;
			let Z = 0.8;
			let drag = 0;
			let gathered = false;
			if (kd === K_EDGE || kd === K_FILL) {
				let fl = this.flag[i];
				// stand-in at this particle's spot: shown while it is away and its spot has healed
				if (kd === K_FILL) {
					let want = fl === 1 ? (t >= this.hd[i] ? 1 : 0) : fl === 5 || fl === 6 ? 1 : 0;
					if (fl === 3) {
						// flying home to its own stand-in: it hands over during the last ~30 px
						const dx = this.hx[i] - this.x[i];
						const dy = this.hy[i] - this.y[i];
						want = Math.min(this.sb[i], clamp(Math.sqrt(dx * dx + dy * dy) / 30));
					}
					const cur = this.sb[i];
					this.sb[i] = cur + (want - cur) * (want > cur ? sbUp : sbDown);
				}
				if (fl === 3 && t >= this.dl[i]) {
					this.flag[i] = 0;
					fl = 0;
				}
				if (fl === 6 && t - this.mt[i] > 0.17) {
					// merged into a star around the capsule: take over its own stand-in at home
					const a = this.ph[i];
					this.x[i] = this.hx[i] + Math.sin(t * 0.8 + a) * driftAmp;
					this.y[i] = this.hy[i] + Math.cos(t * 0.62 + a * 1.7) * driftAmp * 0.75;
					this.vx[i] = 0;
					this.vy[i] = 0;
					this.da[i] = this.sa[i];
					this.ht[i] = 0;
					this.sb[i] = 0;
					this.flag[i] = 0;
					fl = 0;
				}
				if (fl === 3 || (fl === 5 && t < this.dl[i])) {
					// released: float in place for a moment while the glow fades
					tx = this.x[i];
					ty = this.y[i];
					K = 0;
					drag = 6;
					gathered = true;
				} else if (fl === 5 || fl === 6) {
					// dissolve into a star right around the capsule
					const sj = this.ls[i];
					tx = this.x[sj];
					ty = this.y[sj];
					if (fl === 5) {
						const since = t - this.dl[i];
						const ramp = since < 0.38 ? 0.12 + 0.88 * smooth(0, 1, since / 0.38) : 1;
						K = 90 * sp * ramp;
						Z = 0.9;
						const ex = tx - this.x[i];
						const ey = ty - this.y[i];
						if (ex * ex + ey * ey < 6 || since > 1.1) {
							this.flag[i] = 6;
							this.mt[i] = t;
						}
					} else {
						K = 500;
						Z = 1;
					}
					gathered = true;
				} else if (fl === 1 && cap && t >= this.dl[i]) {
					if (this.gm[i] === 0) {
						rrPoint(this.gt[i] + this.capPhase, cap, tp);
						tx = tp.x + tp.nx * this.gb[i];
						ty = tp.y + tp.ny * this.gb[i];
					} else {
						fillPoint(this.gt[i], this.gb[i], capIn, tp);
						tx = tp.x;
						ty = tp.y;
					}
					if (this.st[i]) {
						// seated: rides the capsule as one rigid shape (uniform, no overshoot)
						K = 1400 * sp;
						Z = 1;
					} else {
						// arriving: soft start, the pull fades in over ~0.25 s
						const since = t - this.dl[i];
						const ramp = since < 0.26 ? 0.16 + 0.84 * smooth(0, 1, since / 0.26) : 1;
						K = 150 * this.rk[i] * sp * ramp;
						Z = 0.84;
						const ex = tx - this.x[i];
						const ey = ty - this.y[i];
						if (since > 0.12 && ex * ex + ey * ey < 9) this.st[i] = 1;
					}
					gathered = true;
				} else {
					tx = this.hx[i];
					ty = this.hy[i];
					// after a release the way home eases in too (same soft start as the gather)
					const since = t - this.dl[i];
					const ramp = since >= 0 && since < 0.38 ? 0.12 + 0.88 * smooth(0, 1, since / 0.38) : 1;
					K = 80 * this.rk[i] * sp * ramp;
					Z = 0.88;
				}
				if (driftAmp > 0) {
					const a = this.ph[i];
					const f = kd === K_FILL ? 1 : 0.32;
					tx += Math.sin(t * 0.8 + a) * driftAmp * f;
					ty += Math.cos(t * 0.62 + a * 1.7) * driftAmp * f * 0.75;
				}
			} else {
				if (!cta || !ring || !ctaIn) continue;
				if (this.gm[i] === 0) {
					rrPoint(this.p1[i] + this.ctaPhase * (this.rk[i] > 1 ? 1 : 0.82), ring, tp);
					const b = this.p2[i];
					tx = tp.x + tp.nx * b;
					ty = tp.y + tp.ny * b;
					this.bo[i] = tp.ny;
				} else {
					fillPoint(this.p1[i], this.p2[i], ctaIn, tp);
					tx = tp.x;
					ty = tp.y;
					if (driftAmp > 0) {
						tx += Math.sin(t * 1.3 + this.ph[i]) * (0.5 + 1.1 * this.ctaEn);
						ty += Math.cos(t * 1.1 + this.ph[i]) * (0.35 + 0.6 * this.ctaEn);
					}
				}
				if (inBurst) {
					K = 4;
					Z = 0;
					drag = 3.2;
				} else {
					K = (30 + 170 * rebuildK) * this.rk[i];
					Z = 0.78;
				}
			}
			if (this.entering && t < this.entranceT + this.ed[i]) continue;
			if (reduced) {
				this.x[i] = tx;
				this.y[i] = ty;
				this.vx[i] = 0;
				this.vy[i] = 0;
				this.td[i] = 0;
				continue;
			}
			const C = 2 * Math.sqrt(K) * Z + drag;
			const ex = tx - this.x[i];
			const ey = ty - this.y[i];
			let ax = K * ex - C * this.vx[i];
			let ay = K * ey - C * this.vy[i];
			if (kd <= K_FILL) {
				this.bo[i] = 0;
				if (!gathered) {
					if (pin) {
						const dx = this.x[i] - px;
						const dy = this.y[i] - py;
						const d2 = dx * dx + dy * dy;
						if (d2 < CR2) {
							const dd = Math.sqrt(d2) + 0.001;
							const q = 1 - dd / CR;
							const f = (q * q * cStr) / dd;
							ax += dx * f;
							ay += dy * f;
							this.bo[i] = q;
						}
					}
					if (pull && kd === K_FILL) {
						// the surface leans gently toward the hovered button
						const dx = ccx - this.x[i];
						const dy = ccy - this.y[i];
						const d2 = dx * dx + dy * dy;
						if (d2 < 170 * 170) {
							const dd = Math.sqrt(d2) + 0.001;
							const f = (pull * (1 - dd / 170)) / dd;
							ax += dx * f;
							ay += dy * f;
						}
					}
				}
			}
			let nvx = this.vx[i] + ax * dt;
			let nvy = this.vy[i] + ay * dt;
			if (kd <= K_FILL) {
				const v2 = nvx * nvx + nvy * nvy;
				if (v2 > VMAX * VMAX) {
					const k = VMAX / Math.sqrt(v2);
					nvx *= k;
					nvy *= k;
				}
			}
			this.vx[i] = nvx;
			this.vy[i] = nvy;
			this.x[i] += nvx * dt;
			this.y[i] += nvy * dt;
			this.td[i] = Math.abs(ex) + Math.abs(ey);
			motion += Math.abs(nvx) + Math.abs(nvy);
		}
		this.motion = motion / Math.max(1, n);
	}

	draw(t: number) {
		const ctx = this.ctx;
		if (!ctx) return;
		this.pendingDraw = false;
		const o = this.o;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (this.waiting) return;
		ctx.setTransform(this.ratio, 0, 0, this.ratio, this.M * this.ratio, this.M * this.ratio);
		ctx.globalCompositeOperation = this.glowMode ? 'lighter' : 'source-over';
		const bc = this.bc;
		bc.fill(0);
		this.glc = 0;
		const glMax = this.gl.length / 3;
		const twk = clamp(o.twinkle, 0, 1) * (o.reduced ? 0.25 : 1);
		const ba = t - this.burstT;
		const cEn = this.ctaEn;
		const driftAmp = o.reduced ? 0 : clamp(o.drift, 0, 1) * 1.7;
		const haloOn = this.cp > 0.003;
		const HR = this.capRect;
		const cpv = this.cp;
		const halo = (x: number, y: number) => 1 - cpv * (1 - smooth(6, 40, rrDist(x, y, HR)));
		// every particle's brightness and "heat" (hover colour) ease over time, so nothing pops
		const dtd = clamp(t - this.lastDrawT, 0, 0.1);
		this.lastDrawT = t;
		const snap = o.reduced || !this.alphaInit;
		this.alphaInit = true;
		const aUp = snap ? 1 : 1 - Math.exp(-dtd / 0.07);
		const aDown = snap ? 1 : 1 - Math.exp(-dtd / 0.2);
		const hUp = snap ? 1 : 1 - Math.exp(-dtd / 0.12);
		const hDown = snap ? 1 : 1 - Math.exp(-dtd / 0.3);
		let settle = 0;
		const split = !this.sameColor;
		const n = this.n;
		for (let i = 0; i < n; i++) {
			const kd = this.kind[i];
			let a = this.al[i];
			let heat = 1;
			const tf = 1 - twk * 0.55 + twk * 0.55 * (0.5 + 0.5 * Math.sin(t * this.tw[i] + this.ph[i]));
			let sizeK = 1;
			if (kd === K_EDGE || kd === K_FILL) {
				const v = this.vz[i];
				if (v <= 0.01) {
					this.da[i] = 0;
					this.ht[i] = 0;
					continue;
				}
				a *= tf * v * this.lf[i];
				const fl = this.flag[i];
				const want = fl === 1 && t >= this.dl[i] ? 1 : 0;
				if (kd === K_FILL) {
					// the stand-in that refills this particle's spot while it is away
					let sa = 0;
					if (fl !== 0 && this.sb[i] > 0.01) {
						const ph = this.ph[i];
						const sx = this.hx[i] + Math.sin(t * 0.8 + ph) * driftAmp;
						const sy = this.hy[i] + Math.cos(t * 0.62 + ph * 1.7) * driftAmp * 0.75;
						sa = a * this.sb[i] * (haloOn ? halo(sx, sy) : 1);
						if (!this.glowMode) sa *= 0.82;
						if (sa > 0.015)
							this.pushDot(0, Math.min(1, sa), sx, sy, this.sz[i] * (this.glowMode ? 1 : 0.9));
					}
					this.sa[i] = sa;
					// a small clearing travels with the capsule
					if (fl === 0 && haloOn) a *= halo(this.x[i], this.y[i]);
					if (fl === 6) a *= clamp(1 - (t - this.mt[i]) / 0.17);
				}
				let h = this.ht[i];
				const dh = want - h;
				h += dh * (dh > 0 ? hUp : hDown);
				if (h < 0.002) h = 0;
				this.ht[i] = h;
				if (dh > 0.01 || dh < -0.01) settle++;
				heat = h;
				if (h > 0) {
					const prog = clamp(1 - this.td[i] / 34);
					const peak = (this.gm[i] === 0 ? 0.92 : 0.42) * (0.78 + 0.22 * tf) * (0.6 + 0.4 * prog);
					a += (peak - a) * h;
				}
				a += this.bo[i] * 0.55;
			} else {
				const edge = this.gm[i] === 0;
				if (edge) a = (0.5 + 0.3 * cEn) * this.al[i] * (0.86 - 0.24 * this.bo[i]) * (0.82 + 0.18 * tf);
				else a = (0.2 + 0.24 * cEn) * this.al[i] * tf;
				if (ba < 1) a = Math.max(a, 0.95 * (1 - ba));
			}
			if (this.entering) {
				const since = t - this.entranceT - this.ed[i];
				a *= since < 0 ? 0 : clamp(since / 0.45);
			}
			if (!this.glowMode) {
				a *= 0.82;
				sizeK *= 0.9;
			}
			if (a > 1) a = 1;
			// displayed alpha follows the target softly (fast in, slower out)
			const cur = this.da[i];
			const da = a - cur;
			a = cur + da * (da > 0 ? aUp : aDown);
			if (a < 0.002) a = 0;
			this.da[i] = a;
			if (a < 0.015) continue;
			const size = this.sz[i] * sizeK;
			if (!split || heat >= 0.985) this.pushDot(LV, a, this.x[i], this.y[i], size);
			else if (heat <= 0.015) this.pushDot(0, a, this.x[i], this.y[i], size);
			else {
				// cross-fade between base and hover colour while heating up or cooling down
				this.pushDot(LV, a * heat, this.x[i], this.y[i], size);
				this.pushDot(0, a * (1 - heat), this.x[i], this.y[i], size);
			}
			if (this.glowMode && this.glc < glMax) {
				let ga = 0;
				if (kd <= K_FILL) ga = a * heat > 0.22 ? a * heat : 0;
				else if (a > 0.45) ga = a * 0.5;
				if (ga > 0) {
					const g = this.glc * 3;
					this.gl[g] = this.x[i];
					this.gl[g + 1] = this.y[i];
					this.gl[g + 2] = ga;
					this.glc++;
				}
			}
		}
		this.settling = settle > 0;
		for (let b = 0; b < LV * 2; b++) {
			const cnt = bc[b];
			if (!cnt) continue;
			const arr = this.bx[b];
			ctx.fillStyle = this.fills[b];
			ctx.beginPath();
			for (let j = 0; j < cnt; j++) {
				const q = j * 3;
				const s = arr[q + 2];
				const X = arr[q];
				const Y = arr[q + 1];
				if (s < 0 || s >= 1.8) {
					const r = (s < 0 ? -s : s) * 0.5;
					ctx.moveTo(X + r, Y);
					ctx.arc(X, Y, r, 0, TAU);
				} else ctx.rect(X - s * 0.5, Y - s * 0.5, s, s);
			}
			ctx.fill();
		}
		if (this.glc && this.sprite && o.glow > 0) {
			const gs = 4.5 + clamp(o.size, 0.4, 4) * 2.4;
			const ga = clamp(o.glow, 0, 1) * 0.3;
			for (let j = 0; j < this.glc; j++) {
				const q = j * 3;
				ctx.globalAlpha = Math.min(1, this.gl[q + 2] * ga);
				ctx.drawImage(this.sprite, this.gl[q] - gs, this.gl[q + 1] - gs, gs * 2, gs * 2);
			}
			ctx.globalAlpha = 1;
		}
	}

	// queues one dot into the batch of its colour (0 = base, LV = hover) and alpha level
	pushDot(colour: number, a: number, x: number, y: number, size: number) {
		if (a < 0.012) return;
		const lvl = Math.min(LV - 1, (a * LV) | 0);
		const b = colour + lvl;
		let arr = this.bx[b];
		const c = this.bc[b] * 3;
		if (c + 3 > arr.length) {
			const grown = new Float32Array(arr.length * 2);
			grown.set(arr);
			this.bx[b] = grown;
			arr = grown;
		}
		arr[c] = x;
		arr[c + 1] = y;
		arr[c + 2] = size;
		this.bc[b]++;
	}

	onMove = (e: PointerEvent) => {
		if (e.pointerType === 'touch') return;
		const p = this.local(e);
		this.pointer.x = p.x;
		this.pointer.y = p.y;
		this.pointer.inside = true;
		const t = e.target as Element | null;
		const link = (t?.closest?.('.pn-link') as HTMLElement | null) ?? null;
		const cta = (t?.closest?.('.pn-cta') as HTMLElement | null) ?? null;
		// the whole link list is one continuous hover area: crossing the gap between two links
		// keeps the capsule instead of releasing and gathering again
		const inList = !!t?.closest?.('.pn-links');
		this.hoverFromElement(link, inList);
		this.setCtaHover(cta);
		this.wake();
	};

	onLeave = () => {
		this.pointer.inside = false;
		this.setCtaHover(null);
		if (this.hover >= 0) this.scheduleRelease(60);
		this.wake();
	};

	onDown = (e: PointerEvent) => {
		const t = e.target as Element | null;
		if (t?.closest?.('.pn-cta')) this.burst();
		if (e.pointerType === 'touch') {
			const link = (t?.closest?.('.pn-link') as HTMLElement | null) ?? null;
			if (link) {
				this.hoverFromElement(link);
				this.scheduleRelease(700);
			}
		}
		this.wake();
	};

	onFocusIn = (e: FocusEvent) => {
		const t = e.target as Element | null;
		if (!t || !t.closest) return;
		let visible = true;
		try {
			visible = t.matches(':focus-visible');
		} catch {
			visible = true;
		}
		if (!visible) return;
		const link = t.closest('.pn-link') as HTMLElement | null;
		if (link) this.hoverFromElement(link);
		const cta = t.closest('.pn-cta') as HTMLElement | null;
		if (cta) this.setCtaHover(cta);
		this.wake();
	};

	onFocusOut = () => {
		if (!this.pointer.inside) {
			this.setCtaHover(null);
			if (this.hover >= 0) this.scheduleRelease(120);
		}
	};

	onVisibility = () => {
		this.pageVisible = document.visibilityState !== 'hidden';
		if (this.pageVisible) this.wake();
		else this.stop();
	};

	tick = (ms: number) => {
		this.raf = 0;
		if (!this.running || this.destroyed) return;
		const t = ms / 1e3;
		const idle = this.idle(t);
		this.frame++;
		const still = idle && (this.o.reduced || (this.o.drift <= 0 && this.o.twinkle <= 0));
		// at rest the drift and twinkle only need every other frame
		if (idle && this.frame % 2 === 1 && !still) {
			this.raf = requestAnimationFrame(this.tick);
			return;
		}
		const dt = Math.min(1 / 12, Math.max(1 / 240, t - this.lastUpdate));
		this.lastUpdate = t;
		if (this.entering && t - this.entranceT > 2.4) this.entering = false;
		// The springs are stiff (the capsule rides on them), so physics always steps at 120 Hz or
		// finer: the same motion at 120, 60, 30 or 15 fps.
		const steps = Math.max(1, Math.ceil(dt * 120 - 0.01));
		const h = dt / steps;
		for (let k = 1; k <= steps; k++) this.update(h, t - dt + h * k);
		this.fitCanvas();
		this.draw(t);
		if (still) {
			this.running = false;
			return;
		}
		this.raf = requestAnimationFrame(this.tick);
	};
}
