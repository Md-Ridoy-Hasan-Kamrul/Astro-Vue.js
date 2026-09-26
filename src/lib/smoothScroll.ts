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

export function pauseSmoothScroll() {
	lenis?.stop();
}

export function resumeSmoothScroll() {
	if (!lenis) return;
	if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') return;
	lenis.start();
}

/** Soft navigations / hash targets */
export function scrollSmoothTo(
	target: number | string | HTMLElement,
	options?: { immediate?: boolean; offset?: number },
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
