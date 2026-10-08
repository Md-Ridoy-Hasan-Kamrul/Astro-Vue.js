/**
 * Shared Lenis smooth-scroll singleton.
 * Survives ClientRouter when the SmoothScroll island uses transition:persist.
 * Call pause/resume when fullscreen menus lock body scroll.
 */
import Lenis from 'lenis';

let lenis: Lenis | null = null;

export function getLenis() {
	return lenis;
}

export function initSmoothScroll() {
	if (typeof window === 'undefined') return null;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		destroySmoothScroll();
		return null;
	}
	if (lenis) return lenis;

	/* Astro ClientRouter + Lenis: avoid noisy scrollend churn */
	try {
		// @ts-expect-error Astro reads window.onscrollend when present
		delete window.onscrollend;
	} catch {
		/* ignore */
	}

	lenis = new Lenis({
		autoRaf: true,
		anchors: true,
		autoToggle: true,
		stopInertiaOnNavigate: true,
		lerp: 0.1,
		smoothWheel: true,
	});

	return lenis;
}

export function destroySmoothScroll() {
	lenis?.destroy();
	lenis = null;
}

/**
 * autoToggle stop/start only flips overflow and waits for a transitionend
 * that never arrives. Dispatch one so Lenis actually stops or starts now,
 * and reset so a stale target does not lerp the page for a few seconds.
 */
function flushOverflowToggle() {
	if (typeof document === 'undefined') return;
	document.documentElement.dispatchEvent(
		new TransitionEvent('transitionend', { propertyName: 'overflow' }),
	);
}

export function pauseSmoothScroll() {
	if (!lenis) return;
	lenis.stop();
	if (!lenis.isStopped) flushOverflowToggle();
}

export function resumeSmoothScroll() {
	if (!lenis) return;
	if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') return;
	// autoToggle keeps overflow:clip on <html> until a transitionend.
	// The stopped class can keep that clip in place, so a menu click
	// scrolls into a short page and the highlight never meets the section.
	if (typeof document !== 'undefined') {
		document.documentElement.classList.remove('lenis-stopped');
		document.documentElement.style.removeProperty('overflow');
	}
	lenis.start();
	if (lenis.isStopped) flushOverflowToggle();
}

/** Smooth scroll inside one element, separate from the page scroller. */
export function createAreaScroll(wrapper: HTMLElement, content: HTMLElement) {
	return new Lenis({
		wrapper,
		content,
		eventsTarget: wrapper,
		autoRaf: true,
		smoothWheel: true,
		lerp: 0.1,
		autoToggle: false,
		overscroll: false,
		anchors: false,
	});
}

/** Symmetric ease. Forward and back use the same curve. */
export function easeInOutCubic(t: number) {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Navbar jumps. Duration grows with distance, then caps, so a long
 * trip does not launch at rocket speed the way Lenis lerp does.
 */
export function glideDuration(distancePx: number) {
	const distance = Math.abs(distancePx);
	return Math.min(1.45, Math.max(0.78, distance / 2600));
}

let glideToken = 0;

/**
 * Time-based ease to a document Y. Lenis anchor clicks use lerp and miss
 * the section, so callers prevent that click and use this instead.
 */
export function glideToY(destination: number, onComplete?: () => void) {
	if (typeof window === 'undefined') return;
	const token = ++glideToken;
	const root = document.documentElement;
	const from = window.scrollY;
	const delta = destination - from;
	const duration = glideDuration(delta) * 1000;
	const start = performance.now();
	let settled = false;
	const settle = () => {
		if (settled || token !== glideToken) return;
		settled = true;
		root.style.removeProperty('overflow-y');
		if (Math.abs(window.scrollY - destination) > 1) window.scrollTo(0, destination);
		getLenis()?.resize();
		scrollSmoothTo(window.scrollY, { immediate: true, force: true });
		onComplete?.();
	};
	root.style.setProperty('overflow-y', 'visible', 'important');
	const frame = () => {
		if (token !== glideToken) return;
		const t = Math.min(1, (performance.now() - start) / duration);
		window.scrollTo(0, from + delta * easeInOutCubic(t));
		if (t < 1) window.setTimeout(frame, 16);
		else settle();
	};
	frame();
	window.setTimeout(settle, duration + 80);
}

/** Glide so the element's top sits on its scroll-margin, just under the bar. */
export function glideToElement(target: HTMLElement, onComplete?: () => void) {
	const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
	const distance = target.getBoundingClientRect().top;
	const destination = Math.max(0, distance + window.scrollY - margin);
	glideToY(destination, onComplete);
}

/** Soft navigations / hash targets */
export function scrollSmoothTo(
	target: number | string | HTMLElement,
	options?: {
		immediate?: boolean;
		offset?: number;
		duration?: number;
		easing?: (t: number) => number;
		force?: boolean;
		onComplete?: () => void;
	},
) {
	if (!lenis) {
		if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'auto' });
		else if (typeof target === 'string') {
			const el = document.querySelector(target);
			el?.scrollIntoView({ behavior: 'auto' });
		} else {
			target.scrollIntoView({ behavior: 'auto' });
		}
		options?.onComplete?.();
		return;
	}
	lenis.scrollTo(target, options);
}
