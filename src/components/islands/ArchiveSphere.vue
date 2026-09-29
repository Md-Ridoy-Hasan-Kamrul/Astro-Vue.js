<script setup lang="ts">
/**
 * Photo-sphere archive. Camera math lives in lib/showcase/archiveSphere.ts.
 */
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { getLenis, pauseSmoothScroll, resumeSmoothScroll } from '../../lib/smoothScroll';
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
	perspectiveForWidth,
	rotateUnit,
	sphereRadius,
	worldTransform,
	type SpherePoint,
} from '../../lib/showcase/archiveSphere';
import { productCatalog } from '../../lib/showcase/products';
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
const litId = ref<string | null>(null);
const openProduct = computed(() => productCatalog.find((item) => item.id === litId.value) ?? null);
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
	downId: '',
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
		const chrome = cardChrome(motion.radius, width, false);
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
		const shot = archiveShots[index];
		const focused = Boolean(shot && litId.value === shot.id);
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
	if (!root) return '';
	const yaw = motion.showYaw;
	const pitch = motion.showPitch;
	let best = '';
	let bestDepth = -Infinity;
	root.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
		const rect = card.getBoundingClientRect();
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
		const point = points[index];
		const depth = point ? rotateUnit(point, yaw, pitch).z : -1;
		if (depth > bestDepth) {
			bestDepth = depth;
			best = card.dataset.id ?? '';
		}
	});
	return best;
}

function onPointerDown(event: PointerEvent) {
	if (gridOpen.value || litId.value) return;
	if (event.pointerType === 'mouse' && event.button !== 0) return;
	motion.downId = frontCardAt(event.clientX, event.clientY);
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
			motion.downId = '';
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
	const id = motion.downId;
	const moved = motion.moved;
	unbindGesture();
	motion.dragging = false;
	motion.downId = '';
	if (id && moved < slop) openShot(id);
}

function openShot(id: string) {
	if (!productCatalog.some((item) => item.id === id)) return;
	litId.value = id;
}

function closeShot() {
	litId.value = null;
}

function toggleGrid() {
	gridOpen.value = !gridOpen.value;
}

let lockedScroll = 0;
let holdingScroll = false;

function holdPageScroll() {
	if (holdingScroll) return;
	if (Math.abs(window.scrollY - lockedScroll) < 1) return;
	holdingScroll = true;
	window.scrollTo(0, lockedScroll);
	holdingScroll = false;
}

function setPageLock(lock: boolean) {
	if (lock) {
		lockedScroll = window.scrollY;
		pauseSmoothScroll();
		document.documentElement.style.overflow = 'hidden';
		window.addEventListener('scroll', holdPageScroll, { passive: true });
		return;
	}
	window.removeEventListener('scroll', holdPageScroll);
	document.documentElement.style.overflow = '';
	resumeSmoothScroll();
}

watch([gridOpen, litId], ([grid, id]) => {
	setPageLock(Boolean(grid || id));
});

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
	setPageLock(false);
});
</script>

<template>
	<div
		ref="root"
		class="archive"
		:class="{ revealed, gridview: gridOpen, lit: openProduct, entering: eyeOpacity > 0.05 && !gridOpen && !openProduct }"
		:style="{ clipPath: gridOpen || openProduct ? 'none' : eyeClip }"
	>
		<div
			id="stage"
			class="stage"
			:style="{
				opacity: gridOpen || openProduct ? 1 : 1 - eyeOpacity,
				pointerEvents: eyeOpacity > 0.05 && !gridOpen && !openProduct ? 'none' : 'auto',
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
						data-card
						:data-id="shot.id"
					>
						<figure>
							<img
								:src="shot.src"
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

		<div id="grid" class="grid" :class="{ on: gridOpen }" data-lenis-prevent>
			<div class="rows">
				<figure
					v-for="shot in productCatalog"
					:key="`grid-${shot.id}`"
					@click="openShot(shot.id)"
				>
					<img :src="shot.src" :alt="shot.title" />
					<figcaption>{{ shot.title }}</figcaption>
				</figure>
			</div>
		</div>

		<div v-if="openProduct" id="lit" class="lit">
			<article class="plate" data-lenis-prevent>
				<div class="shot">
					<span class="shot-index">{{ openProduct.num }}</span>
					<img :src="openProduct.src" :alt="openProduct.title" />
					<button type="button" class="shot-x" aria-label="Close" @click="closeShot">×</button>
				</div>
				<div class="meta">
					<p class="kicker">{{ openProduct.kicker }}</p>
					<h2>{{ openProduct.title }}</h2>
					<p class="note">{{ openProduct.note }}</p>
					<ul class="tags">
						<li v-for="tag in openProduct.tags" :key="tag">{{ tag }}</li>
					</ul>
					<button type="button" class="close-btn" @click="closeShot">Close</button>
				</div>
			</article>
		</div>

		<div
			v-show="eyeOpacity > 0.01 && !gridOpen && !openProduct"
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
		--hw: min(68vw, 760px);
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
		height: 100%;
		opacity: 1;
		overflow: auto;
		overscroll-behavior: contain;
		pointer-events: auto;
		scrollbar-color: rgba(255, 255, 255, 0.45) transparent;
	}

	.grid.on::-webkit-scrollbar {
		width: 10px;
	}

	.grid.on::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.4);
		border-radius: 999px;
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
		width: min(92vw, 720px);
		max-height: min(88vh, 840px);
		overflow: auto;
		pointer-events: auto;
		background: #14161c;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
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
		aspect-ratio: 16 / 9;
		margin: 14px 14px 0;
		overflow: hidden;
		border-radius: 12px;
		background: #0b0b0b;
	}

	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}

	.shot-index {
		position: absolute;
		top: 12px;
		left: 14px;
		z-index: 1;
		font-size: 14px;
		font-weight: 600;
		color: #3ddc84;
	}

	.shot-x {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1;
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		color: #fff;
		font-size: 22px;
		line-height: 1;
		background: rgba(0, 0, 0, 0.45);
		border: 0;
		border-radius: 999px;
		cursor: var(--cursor-site-pointer);
	}

	.meta {
		display: block;
		padding: 18px 22px 22px;
		color: #f4f6f8;
		background: transparent;
	}

	.kicker {
		margin: 0 0 8px;
		font-size: 13px;
		color: #9aa3b2;
	}

	.meta h2 {
		margin: 0 0 10px;
		font-family: var(--sans);
		font-weight: 600;
		font-size: clamp(28px, 3vw, 40px);
		line-height: 1.05;
		color: #fff;
	}

	.note {
		margin: 0;
		max-width: 62ch;
		font-size: 15px;
		line-height: 1.55;
		color: #d5dbe3;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.tags li {
		padding: 6px 12px;
		font-size: 13px;
		color: #3ddc84;
		border: 1px solid #3ddc84;
		border-radius: 999px;
	}

	.close-btn {
		margin-top: 18px;
		min-height: 44px;
		padding: 10px 22px;
		color: #fff;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 999px;
		cursor: var(--cursor-site-pointer);
	}

	@media (max-width: 900px) {
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
