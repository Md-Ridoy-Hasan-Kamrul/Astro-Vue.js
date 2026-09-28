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
	DRAG_DEG_PER_PX,
	HEADLINE_WORDS,
	PITCH_LIMIT_DEG,
	TILT_DEG,
	VELOCITY_DECAY,
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
	scrollZoomProgress,
	sphereRadius,
	stillUrl,
	thumbUrl,
	type SpherePoint,
} from '../../lib/showcase/archiveSphere';

const AVATAR_ID = 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c';
const CLICK_SLOP_FINE = 6;
const CLICK_SLOP_COARSE = 14;
const TOUCH_CANCEL_RATIO = 1.15;
const TOUCH_START_PX = 10;
const VELOCITY_SNAP = 0.002;
const RESIZE_IGNORE_PX = 20;
const DEEP_PROGRESS = 0.45;

const rootRef = useTemplateRef<HTMLElement>('root');
const worldRef = useTemplateRef<HTMLElement>('world');
const headlineRef = useTemplateRef<HTMLElement>('headline');
const filmRef = useTemplateRef<HTMLVideoElement>('film');

const points: SpherePoint[] = distributeSphere(archiveShots.length);
const filmOpen = ref(true);
const revealed = ref(false);
const gridOpen = ref(false);
const menuOpen = ref(false);
const litIndex = ref(-1);
const litSrc = ref('');

const motion = {
	dragX: 0,
	dragY: 0,
	velX: 0,
	velY: 0,
	camZ: 0,
	progress: 0,
	radius: 200,
	perspective: 1150,
	dragging: false,
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

function readZoom() {
	const track = rootRef.value?.closest('.archive-track');
	if (!track) return;
	const top = track.getBoundingClientRect().top;
	motion.progress = scrollZoomProgress(-top, window.innerHeight);
}

function stepCamera() {
	if (!motion.dragging && litIndex.value < 0) decayDrag();
	motion.dragY = clampPitch(motion.dragY);
	const targetZ = camZTarget(motion.progress, motion.radius);
	motion.camZ += (targetZ - motion.camZ) * CAM_Z_EASE;
}

function decayDrag() {
	motion.dragX += motion.velX;
	motion.dragY += motion.velY;
	motion.velX *= VELOCITY_DECAY;
	motion.velY *= VELOCITY_DECAY;
	if (Math.abs(motion.velX) < VELOCITY_SNAP) motion.velX = 0;
	if (Math.abs(motion.velY) < VELOCITY_SNAP) motion.velY = 0;
}

function clampPitch(dragY: number) {
	const maxPitch = PITCH_LIMIT_DEG - TILT_DEG;
	const minPitch = -PITCH_LIMIT_DEG - TILT_DEG;
	return Math.min(maxPitch, Math.max(minPitch, dragY));
}

function paintFrame() {
	const pitch = TILT_DEG + motion.dragY;
	const yaw = motion.dragX;
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
	const open = litIndex.value >= 0;
	root.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
		const point = points[index];
		if (!point) return;
		const turned = rotateUnit(point, yaw, pitch);
		card.style.opacity = String(
			cardFade(turned.z, motion.radius, motion.camZ, motion.perspective, index === litIndex.value),
		);
		card.style.setProperty('--d', cardDim(turned.z, motion.progress, open).toFixed(3));
	});
}

function tick() {
	readZoom();
	stepCamera();
	paintFrame();
	frame = requestAnimationFrame(tick);
}

function coarsePointer() {
	return window.matchMedia('(pointer: coarse)').matches;
}

function onPointerDown(event: PointerEvent) {
	if (litIndex.value >= 0 || menuOpen.value) return;
	const card = (event.target as HTMLElement).closest<HTMLElement>('[data-card]');
	motion.downIndex = card ? Number(card.dataset.idx) : -1;
	motion.originX = event.clientX;
	motion.originY = event.clientY;
	motion.lastX = event.clientX;
	motion.lastY = event.clientY;
	motion.moved = 0;
	motion.touchDecided = event.pointerType !== 'touch';
	motion.dragging = event.pointerType !== 'touch';
	motion.velX = 0;
	motion.velY = 0;
	if (motion.dragging) {
		rootRef.value?.setPointerCapture(event.pointerId);
		motion.pointerId = event.pointerId;
	}
}

function onPointerMove(event: PointerEvent) {
	if (motion.downIndex < -1) return;
	const dx = event.clientX - motion.lastX;
	const dy = event.clientY - motion.lastY;
	motion.moved = Math.hypot(event.clientX - motion.originX, event.clientY - motion.originY);
	if (!motion.touchDecided && event.pointerType === 'touch' && motion.moved > TOUCH_START_PX) {
		const vertical = Math.abs(event.clientY - motion.originY);
		const horizontal = Math.abs(event.clientX - motion.originX);
		if (vertical > horizontal * TOUCH_CANCEL_RATIO) {
			motion.downIndex = -2;
			return;
		}
		motion.touchDecided = true;
		motion.dragging = true;
		rootRef.value?.setPointerCapture(event.pointerId);
	}
	if (!motion.dragging) return;
	motion.dragX += dx * DRAG_DEG_PER_PX;
	motion.dragY += dy * DRAG_DEG_PER_PX;
	motion.velX = dx * DRAG_DEG_PER_PX;
	motion.velY = dy * DRAG_DEG_PER_PX;
	motion.lastX = event.clientX;
	motion.lastY = event.clientY;
}

function onPointerUp() {
	const slop = coarsePointer() ? CLICK_SLOP_COARSE : CLICK_SLOP_FINE;
	if (motion.downIndex >= 0 && motion.moved < slop) openShot(motion.downIndex);
	motion.dragging = false;
	motion.downIndex = -1;
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
	if (gridOpen.value) menuOpen.value = false;
}

function toggleMenu() {
	menuOpen.value = !menuOpen.value;
}

function openGridFromMenu() {
	menuOpen.value = false;
	gridOpen.value = true;
}

function revealFromFilm() {
	filmOpen.value = false;
	revealed.value = true;
}

function onFilmPlay(event: Event) {
	const video = event.target;
	if (video instanceof HTMLVideoElement) video.playbackRate = 2;
}

onMounted(() => {
	loadFonts();
	layoutCards();
	revealed.value = true;
	const video = filmRef.value;
	if (video) {
		video.muted = true;
		video.defaultMuted = true;
		video.playsInline = true;
		video.playbackRate = 2;
		void video.play().catch(() => {
			filmOpen.value = false;
		});
	} else {
		filmOpen.value = false;
	}
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
	removeScroll?.();
});
</script>

<template>
	<div
		ref="root"
		class="archive"
		:class="{ revealed, gridview: gridOpen, lit: litIndex >= 0 }"
	>
		<div
			id="stage"
			class="stage"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
		>
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
							<img :src="thumbUrl(shot.id)" :alt="shot.title" draggable="false" />
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

		<div class="vig" aria-hidden="true"></div>

		<header class="chrome bar">
			<a class="wordmark" href="#showcase" aria-label="Ethan Vale">Ethan<em>Vale</em></a>
			<button
				type="button"
				class="menu-btn"
				:aria-expanded="menuOpen"
				aria-controls="archive-menu"
				:aria-label="menuOpen ? 'Close menu' : 'Open menu'"
				@click="toggleMenu"
			>
				<span class="menu-label" :class="{ gone: menuOpen }">Menu</span>
				<span class="bars" :class="{ open: menuOpen }" aria-hidden="true">
					<i></i>
					<i></i>
				</span>
			</button>
		</header>

		<aside class="bio chrome">
			<div class="who">
				<img :src="thumbUrl(AVATAR_ID)" alt="Ethan Vale" width="52" height="52" />
				<b>Ethan Vale</b>
			</div>
			<p>
				Wildlife photography is less about taking pictures and more about learning when not to
				move. Every frame in this archive was captured in natural conditions without intervention.
			</p>
		</aside>

		<p class="colophon chrome">Field Notes 2026</p>

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

		<div v-if="litIndex >= 0" id="lit" class="lit" @click.self="closeShot">
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

		<div id="archive-menu" class="menu" :class="{ open: menuOpen }">
			<nav>
				<a href="#showcase" @click.prevent="openGridFromMenu">The Archive</a>
				<a href="#showcase" @click.prevent="menuOpen = false">Field Notes</a>
				<a href="#showcase" @click.prevent="menuOpen = false">Studio</a>
				<a href="#showcase" @click.prevent="menuOpen = false">Contact</a>
			</nav>
			<p class="addr">
				Nairobi · Cape Town · Reykjavík<br />
				studio@ethanvale.photo
			</p>
		</div>

		<div v-if="filmOpen" id="intro" class="intro">
			<video
				id="film"
				ref="film"
				:src="ARCHIVE_FILM_URL"
				autoplay
				muted
				playsinline
				preload="auto"
				disablepictureinpicture
				@playing="onFilmPlay"
				@ended="revealFromFilm"
				@error="revealFromFilm"
			></video>
			<button id="skip" type="button" class="skip" @click="revealFromFilm">Skip</button>
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
		background: var(--bg);
		color: var(--ink);
		font-family: var(--sans);
		font-weight: 300;
		-webkit-font-smoothing: antialiased;
	}

	.stage {
		position: absolute;
		inset: 0;
		z-index: 10;
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
	}

	.card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
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

	.bar {
		position: absolute;
		z-index: 60;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: calc(4.5rem + var(--pad) * 0.35) var(--pad) calc(var(--pad) * 0.35);
		mix-blend-mode: difference;
	}

	@media (min-width: 768px) {
		.bar {
			padding-top: calc(5rem + var(--pad) * 0.35);
		}
	}

	@media (min-width: 1021px) {
		.bar {
			padding-top: calc(5.25rem + var(--pad) * 0.35);
		}
	}

	.wordmark {
		font-family: var(--serif);
		font-size: clamp(19px, 2.1vw, 27px);
		letter-spacing: 0.005em;
		line-height: 1;
		color: #fff;
		text-decoration: none;
		white-space: nowrap;
	}

	.wordmark em {
		font-style: normal;
	}

	.menu-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 5px;
		min-width: 44px;
		min-height: 44px;
		padding: 8px 0 4px;
		color: inherit;
		background: none;
		border: 0;
		cursor: var(--cursor-site-pointer);
	}

	.menu-label {
		font-size: clamp(12px, 1.25vw, 15px);
		color: #fff;
	}

	.menu-label.gone {
		opacity: 0;
	}

	.bars {
		position: relative;
		width: clamp(42px, 4.4vw, 62px);
		height: clamp(16px, 2vw, 22px);
	}

	.bars i {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: #fff;
	}

	.bars i:first-child {
		transform: translateY(-5px);
	}

	.bars i:last-child {
		width: clamp(34px, 3.6vw, 50px);
		transform: translateY(5px);
	}

	.bars.open i {
		width: 100%;
		transform: translateY(0) rotate(45deg);
	}

	.bars.open i:last-child {
		transform: translateY(0) rotate(-45deg);
	}

	.bio {
		position: absolute;
		z-index: 55;
		left: var(--pad);
		bottom: var(--pad);
		max-width: min(320px, 46vw);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 14px;
	}

	.who img {
		width: 52px;
		height: 52px;
		border-radius: 3px;
		object-fit: cover;
		filter: grayscale(0.15);
	}

	.who b {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 19px;
	}

	.bio p {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.62;
		color: rgba(244, 242, 239, 0.72);
	}

	.deep .bio,
	.gridview .bio,
	.lit .bio,
	.deep .cue,
	.gridview .cue,
	.lit .cue {
		opacity: 0;
		pointer-events: none;
	}

	.colophon {
		position: absolute;
		z-index: 55;
		right: var(--pad);
		bottom: var(--pad);
		margin: 0;
		font-size: 12.5px;
		color: rgba(244, 242, 239, 0.72);
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
		opacity: 0;
		pointer-events: none;
		background: none;
		border: 0;
		cursor: var(--cursor-site-pointer);
	}

	.gridbtn b {
		background: #f4f2ef;
		border-radius: 2px;
	}

	.deep .gridbtn,
	.gridview .gridbtn {
		opacity: 1;
		pointer-events: auto;
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
		display: block;
		width: 44px;
		height: 1px;
		background: rgba(244, 242, 239, 0.28);
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
		background: rgba(0, 0, 0, 0.2);
	}

	.plate {
		width: min(72vw, 860px);
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
		padding-top: 16px;
	}

	.meta h2 {
		margin: 0 0 6px;
		font-family: var(--serif);
		font-weight: 400;
		font-size: clamp(22px, 2.15vw, 32px);
		line-height: 1.08;
	}

	.where,
	.note {
		margin: 0;
		font-size: 13.5px;
		line-height: 1.55;
	}

	.where {
		color: rgba(244, 242, 239, 0.62);
	}

	.menu {
		position: absolute;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		background: #050505;
		clip-path: inset(0 0 100% 0);
		pointer-events: none;
		transition: clip-path 0.85s cubic-bezier(0.22, 0.61, 0.36, 1);
	}

	.menu.open {
		clip-path: inset(0);
		pointer-events: auto;
	}

	.menu nav {
		display: flex;
		flex-direction: column;
		gap: clamp(4px, 1vw, 10px);
		text-align: center;
	}

	.menu a {
		font-family: var(--serif);
		font-size: clamp(34px, 7.6vw, 78px);
		line-height: 1.08;
		color: #f4f2ef;
		text-decoration: none;
		opacity: 0.55;
	}

	.addr {
		position: absolute;
		right: var(--pad);
		bottom: var(--pad);
		left: var(--pad);
		margin: 0;
		font-size: 12.5px;
		line-height: 1.7;
		color: var(--dim);
	}

	.intro {
		position: absolute;
		inset: 0;
		z-index: 200;
		background: #000;
	}

	.intro video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.skip {
		position: absolute;
		right: var(--pad);
		bottom: var(--pad);
		min-height: 44px;
		padding: 10px 18px;
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(244, 242, 239, 0.6);
		background: transparent;
		border: 1px solid rgba(244, 242, 239, 0.25);
		border-radius: 999px;
		cursor: var(--cursor-site-pointer);
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
		.colophon {
			display: none;
		}

		.headline {
			font-size: clamp(22px, 6.4vw, 34px);
		}

		.menu a {
			font-size: clamp(28px, 9vw, 54px);
		}
	}

	@media (max-width: 640px) {
		.archive {
			--hw: min(84vw, 360px);
			--pad: clamp(12px, 4vw, 18px);
		}

		.who img {
			width: 42px;
			height: 42px;
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

		.bio p {
			display: none;
		}

		.rows {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.archive * {
			animation-duration: 0.01ms !important;
			transition-duration: 0.14s !important;
		}
	}
</style>
