/**
 * Scroll progress for a sticky fly-in track.
 * Subscribes to Lenis when present, otherwise window scroll.
 */
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { getLenis } from '../smoothScroll';
import { scrollProgressForTarget } from './scrollFlyIn';

export function useScrollFlyInProgress(targetRef: Ref<HTMLElement | null>) {
	const progress = ref(0);
	let usingLenis = false;

	function readProgress() {
		const node = targetRef.value;
		if (!node || typeof window === 'undefined') {
			progress.value = 0;
			return;
		}
		const rect = node.getBoundingClientRect();
		progress.value = scrollProgressForTarget({
			targetTop: rect.top,
			targetHeight: rect.height,
			viewportHeight: window.innerHeight,
		});
	}

	onMounted(() => {
		readProgress();
		window.addEventListener('resize', readProgress);
		const lenis = getLenis();
		if (lenis) {
			usingLenis = true;
			lenis.on('scroll', readProgress);
			return;
		}
		window.addEventListener('scroll', readProgress, { passive: true });
	});

	onUnmounted(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', readProgress);
		}
		if (usingLenis) {
			getLenis()?.off('scroll', readProgress);
			return;
		}
		if (typeof window === 'undefined') return;
		window.removeEventListener('scroll', readProgress);
	});

	return { progress, readProgress };
}
