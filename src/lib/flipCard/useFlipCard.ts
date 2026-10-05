/**
 * FlipCard behaviour: click / key flip, drag to turn, hover tilt + glare,
 * all eased by one spring loop that sleeps once everything settles.
 */
import { computed, onMounted, onUnmounted, reactive, ref, type Ref } from 'vue';
import {
	HALF_TURN_DEG,
	TAP_SLOP_PX,
	dragRotation,
	glarePosition,
	isFlipped,
	isSpringSettled,
	pointerRatio,
	snapRotation,
	springStep,
	tiltAngles,
	type FlipAxis,
	type SpringState,
} from './flipCard';

export type FlipCardOptions = {
	axis: FlipAxis;
	flipOnClick: boolean;
	draggable: boolean;
	dragDistance: number;
	tilt: boolean;
	tiltMax: number;
	glare: boolean;
	hoverScale: number;
	stiffness: number;
	damping: number;
};

type Channel = 'rotation' | 'tiltX' | 'tiltY' | 'scale';

type DragSession = { pointerId: number; startX: number; startY: number; startRotation: number; dragging: boolean };

const REST: Record<Channel, number> = { rotation: 0, tiltX: 0, tiltY: 0, scale: 1 };
const CHANNELS = Object.keys(REST) as Channel[];
const MS_PER_SECOND = 1000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useFlipCard(
	rootRef: Ref<HTMLElement | null>,
	options: () => FlipCardOptions,
	onFlipChange: (flipped: boolean) => void,
) {
	const springs = reactive(
		Object.fromEntries(CHANNELS.map((channel) => [channel, { value: REST[channel], velocity: 0 }])),
	) as Record<Channel, SpringState>;
	const targets: Record<Channel, number> = { ...REST };
	const glare = reactive({ x: 50, y: 50, visible: false });
	const flipped = ref(false);

	let drag: DragSession | null = null;
	let frame: number | null = null;
	let lastTime: number | null = null;
	let reducedMotion = false;

	function stepChannels(seconds: number) {
		const config = options();
		for (const channel of CHANNELS) {
			springs[channel] = reducedMotion
				? { value: targets[channel], velocity: 0 }
				: springStep(springs[channel], targets[channel], seconds, config);
		}
	}

	function allSettled(): boolean {
		return CHANNELS.every((channel) => isSpringSettled(springs[channel], targets[channel]));
	}

	function tick(now: number) {
		frame = null;
		stepChannels((now - (lastTime ?? now)) / MS_PER_SECOND);
		lastTime = now;
		if (allSettled() && !drag) lastTime = null;
		else wake();
	}

	function wake() {
		if (frame === null) frame = window.requestAnimationFrame(tick);
	}

	function setTarget(channel: Channel, value: number) {
		targets[channel] = value;
		wake();
	}

	function commitRotation(rotation: number) {
		setTarget('rotation', rotation);
		const next = isFlipped(rotation);
		if (next === flipped.value) return;
		flipped.value = next;
		onFlipChange(next);
	}

	function toggle() {
		commitRotation(snapRotation(targets.rotation) + HALF_TURN_DEG);
	}

	function hover(event: PointerEvent) {
		const root = rootRef.value;
		if (!root) return;
		const ratio = pointerRatio(event.clientX, event.clientY, root.getBoundingClientRect());
		const { tilt, tiltMax, hoverScale } = options();
		const angles = tilt ? tiltAngles(ratio.x, ratio.y, tiltMax) : { rotateX: 0, rotateY: 0 };
		setTarget('tiltX', angles.rotateX);
		setTarget('tiltY', angles.rotateY);
		setTarget('scale', hoverScale);
		Object.assign(glare, glarePosition(ratio.x, ratio.y), { visible: options().glare });
	}

	function dragDelta(event: PointerEvent, session: DragSession): number {
		return options().axis === 'y' ? event.clientX - session.startX : event.clientY - session.startY;
	}

	function cardSize(): number {
		const bounds = rootRef.value?.getBoundingClientRect();
		return (options().axis === 'y' ? bounds?.width : bounds?.height) ?? 1;
	}

	function followDrag(event: PointerEvent, session: DragSession) {
		const delta = dragDelta(event, session);
		if (!session.dragging && Math.abs(delta) <= options().dragDistance) return;
		session.dragging = true;
		const rotation = dragRotation(session.startRotation, delta, cardSize(), options().axis);
		targets.rotation = rotation;
		springs.rotation = { value: rotation, velocity: 0 };
	}

	function travel(event: PointerEvent, session: DragSession): number {
		return Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		drag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startRotation: springs.rotation.value,
			dragging: false,
		};
		if (options().draggable) rootRef.value?.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		hover(event);
		if (drag && options().draggable && event.pointerId === drag.pointerId) followDrag(event, drag);
	}

	function onPointerUp(event: PointerEvent) {
		const session = drag;
		drag = null;
		if (!session || event.pointerId !== session.pointerId) return;
		if (rootRef.value?.hasPointerCapture(event.pointerId)) rootRef.value.releasePointerCapture(event.pointerId);
		const tapped = travel(event, session) < TAP_SLOP_PX;
		if (tapped && options().flipOnClick) toggle();
		else commitRotation(snapRotation(springs.rotation.value));
	}

	function onPointerCancel() {
		drag = null;
		commitRotation(snapRotation(springs.rotation.value));
	}

	function onPointerLeave() {
		if (drag) return;
		setTarget('tiltX', 0);
		setTarget('tiltY', 0);
		setTarget('scale', 1);
		glare.visible = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!options().flipOnClick || (event.key !== 'Enter' && event.key !== ' ')) return;
		event.preventDefault();
		toggle();
	}

	onMounted(() => {
		reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
	});

	onUnmounted(() => {
		if (frame !== null) window.cancelAnimationFrame(frame);
	});

	const pose = computed(() => ({
		rotation: springs.rotation.value,
		tiltX: springs.tiltX.value,
		tiltY: springs.tiltY.value,
		scale: springs.scale.value,
	}));

	return {
		flipped,
		pose,
		glare,
		handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave, onKeydown },
	};
}
