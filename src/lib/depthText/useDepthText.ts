/**
 * Pointer tilt and idle orbit for DepthText. One rAF loop, torn down on unmount.
 */
import { onMounted, onUnmounted, type Ref } from 'vue';
import { clamp, getTransform, type DepthRotation } from './depthText';

const POINTER_REACH = 0.8;
const ORBIT_CYCLES = Math.PI * 2;
const ORBIT_Y_RATE = 0.85;
const IDLE_ORBIT = 0.18;
const FULL_ORBIT = 0.55;
const MS_PER_SECOND = 1000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export type DepthMotion = {
	baseRotation: DepthRotation;
	tilt: number;
	smoothing: number;
	orbitSpeed: number;
	pointerTracking: boolean;
	autoOrbit: boolean;
};

export function useDepthText(rootRef: Ref<HTMLElement | null>, stageRef: Ref<HTMLElement | null>, motion: () => DepthMotion) {
	let stop = () => {};

	onMounted(() => {
		const root = rootRef.value;
		const stage = stageRef.value;
		if (!root || !stage || typeof window === 'undefined') return;

		const options = motion();
		const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
		const finePointer = window.matchMedia(FINE_POINTER_QUERY).matches;
		const canTrackPointer = options.pointerTracking && finePointer && !reducedMotion;
		const current = { ...options.baseRotation };
		const target = { ...options.baseRotation };
		let frameId = 0;
		let activePointer = false;
		const startTime = performance.now();

		const applyTransform = () => {
			stage.style.transform = getTransform(current.x, current.y);
		};

		if (reducedMotion) {
			applyTransform();
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const rect = root.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			activePointer = true;
			const x = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * POINTER_REACH), -1, 1);
			const y = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * POINTER_REACH), -1, 1);
			target.x = options.baseRotation.x - y * options.tilt;
			target.y = options.baseRotation.y + x * options.tilt;
		};

		const handlePointerLeave = () => {
			activePointer = false;
			target.x = options.baseRotation.x;
			target.y = options.baseRotation.y;
		};

		if (canTrackPointer) {
			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerleave', handlePointerLeave);
			window.addEventListener('blur', handlePointerLeave);
		}

		const tick = (now: number) => {
			if ((!canTrackPointer || !activePointer) && options.autoOrbit) {
				const elapsed = (now - startTime) / MS_PER_SECOND;
				const orbit = elapsed * options.orbitSpeed * ORBIT_CYCLES;
				const fallbackAmount = canTrackPointer ? IDLE_ORBIT : FULL_ORBIT;
				target.x = options.baseRotation.x + Math.sin(orbit) * options.tilt * fallbackAmount;
				target.y = options.baseRotation.y + Math.cos(orbit * ORBIT_Y_RATE) * options.tilt * fallbackAmount;
			}
			current.x += (target.x - current.x) * options.smoothing;
			current.y += (target.y - current.y) * options.smoothing;
			applyTransform();
			frameId = requestAnimationFrame(tick);
		};

		applyTransform();
		frameId = requestAnimationFrame(tick);

		stop = () => {
			if (canTrackPointer) {
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerleave', handlePointerLeave);
				window.removeEventListener('blur', handlePointerLeave);
			}
			cancelAnimationFrame(frameId);
		};
	});

	onUnmounted(() => stop());
}
