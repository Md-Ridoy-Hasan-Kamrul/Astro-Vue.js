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

/** Soft navigations / hash targets */
export function scrollSmoothTo(
	target: number | string | HTMLElement,
	options?: {
		immediate?: boolean;
		offset?: number;
		duration?: number;
		easing?: (t: number) => number;
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
		return;
	}
	lenis.scrollTo(target, options);
}
