/**
 * Scroll engine for the desktop orbit: measures the sticky stage, reads the
 * scroll target, and eases `progress` toward it. Sleeps when off screen.
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import {
	ORBIT_LAYOUT,
	dampProgress,
	frameSeconds,
	isSettled,
	scrollTargetProgress,
	type Viewport,
} from './orbitProjects';

/** Wake one viewport early so the first frame is already in place. */
const WAKE_MARGIN = '100% 0px 100% 0px';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useOrbitProgress(rootRef: Ref<HTMLElement | null>, stageRef: Ref<HTMLElement | null>) {
	const progress = ref(0);
	const viewport = ref<Viewport>({ ...ORBIT_LAYOUT.defaultViewport });

	let target = 0;
	let frame: number | null = null;
	let lastTime: number | null = null;
	let reducedMotion = false;
	let resizeObserver: ResizeObserver | null = null;
	let visibilityObserver: IntersectionObserver | null = null;

	function measureStage() {
		const stage = stageRef.value;
		if (!stage) return;
		const bounds = stage.getBoundingClientRect();
		const width = Math.max(Math.round(bounds.width), 1);
		const height = Math.max(Math.round(bounds.height), 1);
		if (width === viewport.value.width && height === viewport.value.height) return;
		viewport.value = { width, height };
	}

	function readTarget() {
		const root = rootRef.value;
		if (!root) return;
		const bounds = root.getBoundingClientRect();
		target = scrollTargetProgress({ top: bounds.top, height: bounds.height, viewportHeight: window.innerHeight });
	}

	function nextProgress(seconds: number): number {
		return reducedMotion ? target : dampProgress(progress.value, target, seconds);
	}

	function step(now: number) {
		frame = null;
		const seconds = frameSeconds(now, lastTime ?? now);
		lastTime = now;
		progress.value = nextProgress(seconds);
		if (isSettled(progress.value, target)) lastTime = null;
		else requestStep();
	}

	function requestStep() {
		if (frame === null) frame = window.requestAnimationFrame(step);
	}

	function onScroll() {
		readTarget();
		requestStep();
	}

	function startEngine() {
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
	}

	function stopEngine() {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
		if (frame !== null) window.cancelAnimationFrame(frame);
		frame = null;
		lastTime = null;
	}

	function onVisibility([entry]: IntersectionObserverEntry[]) {
		if (entry?.isIntersecting) startEngine();
		else stopEngine();
	}

	function observeStage() {
		const stage = stageRef.value;
		if (!stage) return;
		resizeObserver = new ResizeObserver(measureStage);
		resizeObserver.observe(stage);
	}

	function observeVisibility() {
		const root = rootRef.value;
		if (!root) return;
		if (!('IntersectionObserver' in window)) {
			startEngine();
			return;
		}
		visibilityObserver = new IntersectionObserver(onVisibility, { rootMargin: WAKE_MARGIN });
		visibilityObserver.observe(root);
	}

	onMounted(() => {
		reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
		measureStage();
		observeStage();
		observeVisibility();
	});

	onUnmounted(() => {
		stopEngine();
		resizeObserver?.disconnect();
		visibilityObserver?.disconnect();
	});

	return { progress, viewport };
}
