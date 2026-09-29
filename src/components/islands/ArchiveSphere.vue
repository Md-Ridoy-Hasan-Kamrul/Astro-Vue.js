<script setup lang="ts">
/**
 * Photo-sphere archive. Camera math lives in lib/showcase/archiveSphere.ts.
 */
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { getLenis } from '../../lib/smoothScroll';
import {
	ARCHIVE_FILM_URL,
	ARCHIVE_FONT_URL,
	CAM_Z_EASE,
	HEADLINE_WORDS,
	archiveShots,
	camZTarget,
	cardChrome,
	cardDim,
	cardFade,
	cardTransform,
	distributeSphere,
	headlineOpacity,
	headlineTransform,
	worldTransform,
	perspectiveForWidth,
	rotateUnit,
	sphereRadius,
	stillUrl,
	thumbUrl,
	type SpherePoint,
} from '../../lib/showcase/archiveSphere';
import { CIRCLE_BALL_PX, circleOpenState } from '../../lib/transition/scrollFlyIn';

const CLICK_SLOP_FINE = 6;
const CLICK_SLOP_COARSE = 14;
const TOUCH_CANCEL_RATIO = 1.15;
const TOUCH_START_PX = 10;
const RESIZE_IGNORE_PX = 20;
/** Atomic globe: radians per pixel, idle spin, and the eased follow. */
const GLOBE_DRAG_DEG = 0.0075 * (180 / Math.PI);
const GLOBE_IDLE_DEG_PER_SEC = 0.06 * (180 / Math.PI);
const GLOBE_FLING_DECAY = 0.94;
const GLOBE_SPIN_EASE = 0.1;
const GLOBE_TILT_EASE = 0.055;
const GLOBE_TILT_DEG = 18;
const GLOBE_TILT_LIMIT = 70;
const DEEP_PROGRESS = 0.45;
const VIEW_TOP_RATIO = 0.45;
const VIEW_BOTTOM_RATIO = 0.4;
const CARD_HOVER_SCALE = 1.06;

const rootRef = useTemplateRef<HTMLElement>('root');
const worldRef = useTemplateRef<HTMLElement>('world');
const headlineRef = useTemplateRef<HTMLElement>('headline');
const eyeFilmRef = useTemplateRef<HTMLVideoElement>('eyeFilm');

const points: SpherePoint[] = distributeSphere(archiveShots.length);
const revealed = ref(false);
const gridOpen = ref(false);
const litIndex = ref(-1);
const litSrc = ref('');
const eyeClip = ref('none');
const eyeSize = ref(CIRCLE_BALL_PX);
const eyeY = ref(0);
const eyeOpacity = ref(1);
/** Iris frame only. Past ~2s the film zooms into the pupil and the circle reads as a black screen. */
const EYE_FILM_START = 0.2;
const EYE_FILM_END = 0.31;

const motion = {
	dragX: 0,
	dragY: 0,
	fling: 0,
	showYaw: 0,
	showPitch: GLOBE_TILT_DEG,
	lastTick: 0,
	camZ: 0,
	progress: 0,
	radius: 200,
	perspective: 1150,
	dragging: false,
	inView: false,
	sequence: 0,
	film: 0,
	pointerId: -1,
	originX: 0,
	originY: 0,
	lastX: 0,
	lastY: 0,
	moved: 0,
	downIndex: -1,
	touchDecided: false,
	width: 0,
	height: 0,
};

let frame = 0;
let removeScroll: (() => void) | null = null;
let reducedMotion = false;

function onCardReady(event: Event) {
	const image = event.target;
	if (image instanceof HTMLImageElement) image.classList.add('in');
}

function loadFonts() {
	if (document.querySelector('link[data-archive-font]')) return;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = ARCHIVE_FONT_URL;
	link.dataset.archiveFont = 'true';
	document.head.appendChild(link);
}

function layoutCards() {
	const root = rootRef.value;
	if (!root) return;
	const width = root.clientWidth;
	const height = root.clientHeight;
	if (
		Math.abs(width - motion.width) < RESIZE_IGNORE_PX &&
		Math.abs(height - motion.height) < RESIZE_IGNORE_PX &&
		motion.width > 0
	) {
		return;
	}
	motion.width = width;
	motion.height = height;
	motion.radius = sphereRadius(width, height);
	motion.perspective = perspectiveForWidth(width);
	root.style.setProperty('--persp', `${motion.perspective}px`);
	const cards = root.querySelectorAll<HTMLElement>('[data-card]');
	cards.forEach((card, index) => {
		const point = points[index];
		const shot = archiveShots[index];
		if (!point || !shot) return;
		const chrome = cardChrome(motion.radius, width, Boolean(shot.tall));
		card.style.width = `${chrome.width}px`;
		card.style.height = `${chrome.height}px`;
		card.style.marginLeft = `${chrome.marginLeft}px`;
		card.style.marginTop = `${chrome.marginTop}px`;
		card.style.transform = cardTransform(point, motion.radius);
	});
}

let filmSeeking = false;

function syncEyeFilm() {
	const video = eyeFilmRef.value;
	if (!video || reducedMotion) return;
	if (!Number.isFinite(video.duration) || video.duration <= 0) return;
	if (filmSeeking) return;
	const target = motion.film * video.duration;
	const drift = target - video.currentTime;
	if (drift > 0.06) {
		video.playbackRate = 2;
		if (video.paused) video.play()?.catch(() => {});
		return;
	}
	if (drift < -0.08) {
		video.pause();
		filmSeeking = true;
		const release = () => {
			video.removeEventListener('seeked', release);
			filmSeeking = false;
			syncEyeFilm();
		};
		video.addEventListener('seeked', release);
		video.currentTime = Math.max(0, target);
		return;
	}
	if (!video.paused) video.pause();
}

function readZoom() {
	const track = rootRef.value?.closest('.archive-track');
	if (!track) return;
	const rect = track.getBoundingClientRect();
	const viewport = window.innerHeight;
	// Rise while the section comes on screen, so the eye is centered once it is pinned.
	// Expand over the next viewport. Scroll up runs the same positions backward.
	const scrolled = Math.max(0, viewport - rect.top);
	const openSpan = viewport * 2;
	const opened = reducedMotion || scrolled >= openSpan;
	const open = circleOpenState(scrolled, window.innerWidth, viewport);
	const openT = Math.min(1, scrolled / openSpan);
	motion.film = reducedMotion ? EYE_FILM_END : EYE_FILM_START + (EYE_FILM_END - EYE_FILM_START) * openT;
	motion.sequence = motion.film;
	motion.progress = reducedMotion
		? 1
		: Math.min(1, Math.max(0, (scrolled - openSpan) / (viewport * 0.16)));
	eyeSize.value = open.size;
	eyeY.value = open.yOffset;
	eyeClip.value = 'none';
	eyeOpacity.value = opened ? 0 : 1;
	syncEyeFilm();
	motion.inView = rect.top < viewport * VIEW_TOP_RATIO && rect.bottom > viewport * VIEW_BOTTOM_RATIO;
	if (motion.inView) revealed.value = true;
}

function stepCamera(frames: number, dt: number) {
	const eyeOpen = eyeOpacity.value === 0;
	const blocked = gridOpen.value || reducedMotion || !motion.inView || !eyeOpen;
	if (!motion.dragging && !blocked) {
		motion.dragX += GLOBE_IDLE_DEG_PER_SEC * dt + motion.fling * frames;
		motion.fling *= GLOBE_FLING_DECAY ** frames;
		if (Math.abs(motion.fling) < 0.0008) motion.fling = 0;
		const tiltEase = 1 - (1 - GLOBE_TILT_EASE) ** frames;
		motion.dragY += (0 - motion.dragY) * tiltEase;
	}
	motion.dragY = clampPitch(motion.dragY);
	const spinEase = 1 - (1 - GLOBE_SPIN_EASE) ** frames;
	const pitch = GLOBE_TILT_DEG + motion.dragY;
	motion.showYaw += (motion.dragX - motion.showYaw) * spinEase;
	motion.showPitch += (pitch - motion.showPitch) * spinEase;
	const targetZ = camZTarget(motion.progress, motion.radius);
	motion.camZ += (targetZ - motion.camZ) * CAM_Z_EASE;
}

function clampPitch(dragY: number) {
	const maxPitch = GLOBE_TILT_LIMIT - GLOBE_TILT_DEG;
	const minPitch = -GLOBE_TILT_LIMIT - GLOBE_TILT_DEG;
	return Math.min(maxPitch, Math.max(minPitch, dragY));
}

function paintFrame() {
	const pitch = motion.showPitch;
	const yaw = motion.showYaw;
	rootRef.value?.classList.toggle('deep', motion.progress > DEEP_PROGRESS);
	if (worldRef.value) {
		worldRef.value.style.transform = worldTransform(motion.camZ, yaw, pitch);
	}
	if (headlineRef.value) {
		headlineRef.value.style.transform = headlineTransform(pitch, yaw, motion.radius);
		headlineRef.value.style.opacity = String(headlineOpacity(motion.progress));
	}
	paintCards(yaw, pitch);
}

function paintCards(yaw: number, pitch: number) {
	const root = rootRef.value;
	if (!root) return;
	root.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
		const point = points[index];
		if (!point) return;
		const turned = rotateUnit(point, yaw, pitch);
		const focused = litIndex.value === index;
		card.style.opacity = String(
			cardFade(turned.z, motion.radius, motion.camZ, motion.perspective, focused),
		);
		card.style.setProperty('--d', cardDim(turned.z, motion.progress, focused).toFixed(3));
	});
}

function tick() {
	const now = performance.now();
	const dt = motion.lastTick ? Math.min(0.1, (now - motion.lastTick) / 1000) : 1 / 60;
	motion.lastTick = now;
	readZoom();
	stepCamera(dt * 60, dt);
	paintFrame();
	frame = requestAnimationFrame(tick);
}

function coarsePointer() {
	return window.matchMedia('(pointer: coarse)').matches;
}

let gesture = false;

function bindGesture() {
	if (gesture) return;
	gesture = true;
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);
	window.addEventListener('pointercancel', onPointerUp);
}

function unbindGesture() {
	if (!gesture) return;
	gesture = false;
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);
	window.removeEventListener('pointercancel', onPointerUp);
}

function frontCardAt(x: number, y: number) {
	const root = rootRef.value;
	if (!root) return -1;
	const yaw = motion.showYaw;
	const pitch = motion.showPitch;
	let best = -1;
	let bestDepth = -Infinity;
	root.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
		const rect = card.getBoundingClientRect();
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
		const point = points[index];
		const depth = point ? rotateUnit(point, yaw, pitch).z : -1;
		if (depth > bestDepth) {
			bestDepth = depth;
			best = Number(card.dataset.idx ?? index);
		}
	});
	return best;
}

function onPointerDown(event: PointerEvent) {
	if (gridOpen.value || litIndex.value >= 0) return;
	if (event.pointerType === 'mouse' && event.button !== 0) return;
	motion.downIndex = frontCardAt(event.clientX, event.clientY);
	motion.originX = event.clientX;
	motion.originY = event.clientY;
	motion.lastX = event.clientX;
	motion.lastY = event.clientY;
	motion.moved = 0;
	motion.fling = 0;
	motion.dragging = false;
	motion.touchDecided = event.pointerType !== 'touch';
	bindGesture();
}

function onPointerMove(event: PointerEvent) {
	if (!gesture) return;
	const dx = event.clientX - motion.lastX;
	const dy = event.clientY - motion.lastY;
	motion.moved = Math.hypot(event.clientX - motion.originX, event.clientY - motion.originY);
	const slop = coarsePointer() ? CLICK_SLOP_COARSE : CLICK_SLOP_FINE;
	if (!motion.touchDecided && event.pointerType === 'touch') {
		if (motion.moved < TOUCH_START_PX) return;
		const vertical = Math.abs(event.clientY - motion.originY);
		const horizontal = Math.abs(event.clientX - motion.originX);
		if (vertical > horizontal * TOUCH_CANCEL_RATIO) {
			motion.downIndex = -2;
			motion.dragging = false;
			unbindGesture();
			return;
		}
		motion.touchDecided = true;
	}
	if (motion.moved <= slop) return;
	motion.dragging = true;
	motion.fling = dx * GLOBE_DRAG_DEG;
	motion.dragX += motion.fling;
	motion.dragY += dy * GLOBE_DRAG_DEG;
	motion.lastX = event.clientX;
	motion.lastY = event.clientY;
}

function onPointerUp() {
	const slop = coarsePointer() ? CLICK_SLOP_COARSE : CLICK_SLOP_FINE;
	const index = motion.downIndex;
	const moved = motion.moved;
	unbindGesture();
	motion.dragging = false;
	motion.downIndex = -1;
	if (index >= 0 && moved < slop) openShot(index);
}

function openShot(index: number) {
	const shot = archiveShots[index];
	if (!shot) return;
	litIndex.value = index;
	litSrc.value = thumbUrl(shot.id);
	const full = new Image();
	const token = index;
	full.onload = () => {
		if (litIndex.value === token) litSrc.value = stillUrl(shot.id);
	};
	full.src = stillUrl(shot.id);
}

function closeShot() {
	litIndex.value = -1;
}

function toggleGrid() {
	gridOpen.value = !gridOpen.value;
}

onMounted(() => {
	reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reducedMotion) {
		eyeClip.value = 'none';
		eyeOpacity.value = 0;
	}
	const film = eyeFilmRef.value;
	if (film) {
		film.muted = true;
		film.defaultMuted = true;
		film.playsInline = true;
		const showIris = () => {
			if (motion.film < EYE_FILM_START) motion.film = EYE_FILM_START;
			syncEyeFilm();
		};
		if (film.readyState >= 2) showIris();
		else film.addEventListener('loadeddata', showIris, { once: true });
	}
	loadFonts();
	rootRef.value?.querySelectorAll<HTMLImageElement>('.card img').forEach((image) => {
		if (image.complete && image.naturalWidth > 0) image.classList.add('in');
	});
	layoutCards();
	const onScroll = () => readZoom();
	const lenis = getLenis();
	if (lenis) lenis.on('scroll', onScroll);
	else window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', layoutCards);
	removeScroll = () => {
		if (lenis) lenis.off('scroll', onScroll);
		else window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', layoutCards);
	};
	frame = requestAnimationFrame(tick);
});

onUnmounted(() => {
	cancelAnimationFrame(frame);
	unbindGesture();
	removeScroll?.();
});
</script>

<template>
	<div
		ref="root"
		class="archive"
		:class="{ revealed, gridview: gridOpen, lit: litIndex >= 0, entering: eyeOpacity > 0.05 && !gridOpen && litIndex < 0 }"
		:style="{ clipPath: gridOpen || litIndex >= 0 ? 'none' : eyeClip }"
	>
		<div
			id="stage"
			class="stage"
			:style="{
				opacity: gridOpen || litIndex >= 0 ? 1 : 1 - eyeOpacity,
				pointerEvents: eyeOpacity > 0.05 && !gridOpen && litIndex < 0 ? 'none' : 'auto',
			}"
			@pointerdown="onPointerDown"
		>
			<div class="enter">
			<div id="world" ref="world" class="world">
				<div id="orb" class="orb">
					<div
						v-for="(shot, index) in archiveShots"
						:key="shot.id"
						class="card"
						:class="{ tall: shot.tall }"
						data-card
						:data-idx="index"
					>
						<figure>
							<img
								:src="thumbUrl(shot.id)"
								:alt="shot.title"
								draggable="false"
								@load="onCardReady"
							/>
						</figure>
					</div>
				</div>
				<h1 id="headline" ref="headline" class="headline">
					<span class="inner">
						<template v-for="(word, index) in HEADLINE_WORDS" :key="word">
							<span class="word" :style="{ '--i': index }">{{ word }}</span>
							{{ ' ' }}
						</template>
					</span>
				</h1>
			</div>
			</div>
		</div>

		<div class="vig" aria-hidden="true"></div>

		<button type="button" class="gridbtn" aria-label="Toggle grid view" @click="toggleGrid">
			<b></b><b></b><b></b><b></b>
		</button>

		<p class="cue chrome"><s></s>Drag to rotate</p>

		<div id="grid" class="grid" :class="{ on: gridOpen }">
			<div class="rows">
				<figure
					v-for="(shot, index) in archiveShots"
					:key="`grid-${shot.id}`"
					@click="openShot(index)"
				>
					<img :src="thumbUrl(shot.id)" :alt="shot.title" />
					<figcaption>{{ shot.title }}</figcaption>
				</figure>
			</div>
		</div>

		<div v-if="litIndex >= 0" id="lit" class="lit">
			<div class="plate">
				<div class="shot">
					<img :src="litSrc" :alt="archiveShots[litIndex]?.title" />
					<button type="button" data-close @click="closeShot">Close</button>
				</div>
				<div class="meta">
					<div>
						<h2>{{ archiveShots[litIndex]?.title }}</h2>
						<p class="where">{{ archiveShots[litIndex]?.place }}</p>
					</div>
					<p class="note">{{ archiveShots[litIndex]?.note }}</p>
				</div>
			</div>
		</div>

		<div
			v-show="eyeOpacity > 0.01 && !gridOpen && litIndex < 0"
			class="eye-film"
			:style="{
				opacity: eyeOpacity,
				width: `${eyeSize}px`,
				height: `${eyeSize}px`,
				top: '50%',
				left: '50%',
				right: 'auto',
				bottom: 'auto',
				borderRadius: '50%',
				transform: `translate(-50%, -50%) translateY(${eyeY}px)`,
			}"
			aria-hidden="true"
		>
			<video
				ref="eyeFilm"
				class="eye-film__video"
				:src="ARCHIVE_FILM_URL"
				muted
				playsinline
				preload="auto"
				disablepictureinpicture
				@loadedmetadata="syncEyeFilm"
			></video>
		</div>
	</div>
</template>

<style scoped>
	.archive {
		--bg: #000;
		--ink: #f4f2ef;
		--dim: #8c8783;
		--pad: clamp(14px, 2.6vw, 34px);
		--hw: min(56vw, 640px);
		--persp: 1150px;
		--serif: 'Playfair Display', 'Times New Roman', serif;
		--sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
		position: relative;
		height: 100%;
		overflow: hidden;
		background: transparent;
		color: var(--ink);
		font-family: var(--sans);
		font-weight: 300;
		-webkit-font-smoothing: antialiased;
	}

	.enter {
		position: absolute;
		inset: 0;
		transform-origin: 50% 50%;
		transform-style: preserve-3d;
	}

	.stage {
		position: absolute;
		inset: 0;
		z-index: 10;
		background: #000;
		perspective: var(--persp);
		perspective-origin: 50% 50%;
		overflow: hidden;
		touch-action: none;
	}

	.world,
	.orb {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
	}

	.orb {
		top: 0;
		left: 0;
	}

	.card {
		position: absolute;
		top: 0;
		left: 0;
		transform-style: preserve-3d;
		cursor: var(--cursor-site-pointer);
	}

	.card figure {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		overflow: hidden;
		border-radius: 3px;
		background: #0a0a0a;
		transition: transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
	}

	.card:hover figure {
		transform: scale(v-bind(CARD_HOVER_SCALE));
	}

	.card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
	}

	.card img.in {
		opacity: 1;
	}

	.revealed .card img {
		transition: opacity 0.8s ease-out;
	}

	.card figure::after {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, var(--d, 0));
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
		border-radius: 3px;
		pointer-events: none;
	}

	.headline {
		position: absolute;
		top: 0;
		left: 0;
		width: var(--hw);
		margin-left: calc(var(--hw) / -2);
		text-align: center;
		font-family: var(--serif);
		font-weight: 400;
		font-size: clamp(25px, 3.7vw, 55px);
		line-height: 1.06;
		letter-spacing: -0.005em;
		color: #fff;
		text-shadow: 0 2px 34px rgba(0, 0, 0, 0.55);
		pointer-events: none;
		user-select: none;
	}

	.headline .inner {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		transform: translateY(-50%);
	}

	.word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.42em);
		filter: blur(7px);
	}

	.revealed .word {
		opacity: 1;
		transform: none;
		filter: blur(0);
		transition:
			opacity 1.05s,
			transform 1.15s,
			filter 1.05s;
		transition-delay: calc(0.9s + var(--i) * 0.085s);
	}

	.vig {
		position: absolute;
		inset: 0;
		z-index: 12;
		pointer-events: none;
		background: radial-gradient(
			ellipse 88% 92% at 50% 50%,
			transparent 48%,
			rgba(0, 0, 0, 0.26) 80%,
			rgba(0, 0, 0, 0.72) 100%
		);
	}

	.gridview .vig,
	.lit .vig,
	.gridview .stage {
		opacity: 0;
		pointer-events: none;
	}

	.chrome {
		opacity: 0;
		transition: opacity 1.2s ease 0.15s;
	}

	.revealed .chrome {
		opacity: 1;
	}

	.deep .cue,
	.gridview .cue,
	.lit .cue {
		opacity: 0;
		pointer-events: none;
	}

	.gridbtn {
		position: absolute;
		z-index: 56;
		left: var(--pad);
		bottom: var(--pad);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		width: 44px;
		height: 44px;
		padding: 5px;
		opacity: 1;
		pointer-events: auto;
		background: none;
		border: 0;
		cursor: var(--cursor-site-pointer);
	}

	.gridbtn b {
		background: #f4f2ef;
		border-radius: 2px;
	}

	.cue {
		position: absolute;
		z-index: 54;
		left: 50%;
		bottom: calc(var(--pad) + 4px);
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 0;
		transform: translateX(-50%);
		font-size: 10px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(244, 242, 239, 0.42);
		white-space: nowrap;
	}

	.cue s {
		position: relative;
		display: block;
		width: 44px;
		height: 1px;
		overflow: hidden;
		background: rgba(244, 242, 239, 0.28);
	}

	.cue s::after {
		content: '';
		position: absolute;
		inset: 0;
		background: #f4f2ef;
		animation: sweep 2.6s ease infinite;
	}

	@keyframes sweep {
		0% {
			transform: translateX(-100%);
		}
		55% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.grid {
		position: absolute;
		inset: 0;
		z-index: 20;
		overflow: auto;
		padding: calc(var(--pad) * 3.4) var(--pad) calc(var(--pad) * 4);
		background: #000;
		opacity: 0;
		pointer-events: none;
	}

	.grid.on {
		opacity: 1;
		pointer-events: auto;
	}

	.rows {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: clamp(10px, 1.4vw, 20px);
		max-width: 1680px;
		margin: 0 auto;
	}

	.rows figure {
		position: relative;
		margin: 0;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		border-radius: 3px;
		background: #0b0b0b;
		cursor: var(--cursor-site-pointer);
	}

	.rows img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.82;
	}

	.rows figcaption {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		padding: 26px 14px 12px;
		font-family: var(--serif);
		font-size: 15px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
	}

	.lit {
		position: absolute;
		inset: 0;
		z-index: 90;
		display: grid;
		place-items: center;
		padding: clamp(56px, 8vh, 84px) var(--pad);
		background: transparent;
		pointer-events: none;
	}

	.plate {
		width: min(72vw, 860px);
		pointer-events: auto;
		animation: card-grow 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
	}

	@keyframes card-grow {
		from {
			transform: scale(0.28);
			opacity: 0.35;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}

	.shot {
		position: relative;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		border-radius: 2px;
		background: #0b0b0b;
		box-shadow: 0 30px 90px rgba(0, 0, 0, 0.75);
	}

	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.shot button {
		position: absolute;
		top: 12px;
		right: 14px;
		min-width: 44px;
		min-height: 44px;
		padding: 10px 14px;
		color: #f4f2ef;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(244, 242, 239, 0.78);
		border-radius: 6px;
		cursor: var(--cursor-site-pointer);
	}

	.meta {
		display: grid;
		grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
		gap: clamp(22px, 3.2vw, 48px);
		align-items: start;
		padding: 18px 20px 20px;
		color: #f7f4ef;
		background: #141414;
		border-radius: 2px;
	}

	.meta h2 {
		margin: 0 0 6px;
		font-family: var(--serif);
		font-weight: 400;
		font-size: clamp(22px, 2.15vw, 32px);
		line-height: 1.08;
		color: #fff;
	}

	.where,
	.note {
		margin: 0;
		font-size: 13.5px;
		line-height: 1.55;
		color: #f7f4ef;
	}

	.where {
		color: rgba(247, 244, 239, 0.82);
	}

	@media (max-width: 900px) {
		.meta {
			grid-template-columns: 1fr;
			gap: 10px;
		}

		.rows {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		}
	}

	@media (max-width: 768px) {
		.headline {
			font-size: clamp(22px, 6.4vw, 34px);
		}
	}

	@media (max-width: 640px) {
		.archive {
			--hw: min(84vw, 360px);
			--pad: clamp(12px, 4vw, 18px);
		}

		.cue {
			display: none;
		}

		.rows {
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}
	}

	@media (max-width: 380px) {
		.archive {
			--hw: min(88vw, 320px);
		}

		.rows {
			grid-template-columns: 1fr;
		}
	}

	.entering .vig,
	.entering .chrome,
	.entering .gridbtn {
		opacity: 0;
		pointer-events: none;
	}

	.eye-film {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 30;
		overflow: hidden;
		border-radius: 50%;
		pointer-events: none;
		background: #06110c;
	}

	.eye-film__video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.eye-film__video::-webkit-media-controls,
	.eye-film__video::-webkit-media-controls-enclosure,
	.eye-film__video::-webkit-media-controls-start-playback-button {
		display: none !important;
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.archive * {
			animation-duration: 0.01ms !important;
			transition-duration: 0.14s !important;
		}
	}
</style>
