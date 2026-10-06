<script setup lang="ts">
/**
 * FAQ accordion matching the premium open card:
 * orange fill, answer, tilted photo, arrow turns up-right.
 * Desktop opens on hover. Narrow screens tap to expand.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { FaqItem } from '../../lib/faq/faq';

const props = defineProps<{
	title: string;
	searchPlaceholder: string;
	emptyMessage: string;
	items: FaqItem[];
}>();

const query = ref('');
const openId = ref<string | null>(null);
const isMobile = ref(false);
const shift = ref({ x: 0, y: 0 });
const searchFocused = ref(false);

let media: MediaQueryList | null = null;

function onMedia() {
	isMobile.value = media?.matches ?? false;
	if (isMobile.value) shift.value = { x: 0, y: 0 };
}

onMounted(() => {
	media = window.matchMedia('(max-width: 768px)');
	onMedia();
	media.addEventListener('change', onMedia);
});

onBeforeUnmount(() => {
	media?.removeEventListener('change', onMedia);
});

function visibleItems() {
	const needle = query.value.trim().toLowerCase();
	if (!needle) return props.items;
	return props.items.filter((item) => {
		if (item.question.toLowerCase().includes(needle)) return true;
		return item.answer.some((paragraph) => paragraph.toLowerCase().includes(needle));
	});
}

function padIndex(index: number) {
	return String(index + 1).padStart(2, '0');
}

function openItem(id: string) {
	if (openId.value === id) return;
	openId.value = id;
	shift.value = { x: 0, y: 0 };
}

function toggle(id: string) {
	openId.value = openId.value === id ? null : id;
	shift.value = { x: 0, y: 0 };
}

function onEnter(id: string) {
	if (isMobile.value) return;
	openItem(id);
}

function onRowClick(event: MouseEvent, id: string) {
	if (isMobile.value || event.detail === 0) toggle(id);
}

function onListLeave() {
	if (isMobile.value) return;
	openId.value = null;
	shift.value = { x: 0, y: 0 };
}

function onMove(event: MouseEvent, id: string) {
	if (isMobile.value || openId.value !== id) return;
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
	const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
	shift.value = { x: dx * 25, y: dy * 25 };
}

function onSearch(event: Event) {
	query.value = (event.target as HTMLInputElement).value;
	const items = visibleItems();
	if (openId.value && !items.some((item) => item.id === openId.value)) {
		openId.value = null;
	}
}

function shotStyle(index: number) {
	const even = index % 2 === 0;
	return {
		'--x': `${shift.value.x}px`,
		'--y': `${shift.value.y}px`,
		'--rot': even ? '-3deg' : '3deg',
		'--rot-from': even ? '-6deg' : '6deg',
	};
}
</script>

<template>
	<div class="faq-shell">
		<h2 id="faq-title" class="faq-title">{{ title }}</h2>

		<label class="faq-search">
			<span class="sr-only">{{ searchPlaceholder }}</span>
			<span class="faq-search-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" stroke-linecap="round" />
				</svg>
			</span>
			<input
				type="search"
				:placeholder="searchPlaceholder"
				:value="query"
				:style="{ borderColor: searchFocused ? '#ff8a00' : 'rgba(255, 255, 255, 0.08)' }"
				@input="onSearch"
				@focus="searchFocused = true"
				@blur="searchFocused = false"
			/>
		</label>

		<p v-if="visibleItems().length === 0" class="faq-empty" role="status">{{ emptyMessage }}</p>

		<div v-else class="faq-list" @mouseleave="onListLeave">
			<article
				v-for="(item, index) in visibleItems()"
				:key="item.id"
				class="faq-row"
				:class="{ 'is-open': openId === item.id }"
				data-faq-item
				@mouseenter="onEnter(item.id)"
				@mousemove="onMove($event, item.id)"
			>
				<button
					type="button"
					class="faq-trigger"
					:aria-expanded="openId === item.id"
					:aria-controls="`faq-panel-${item.id}`"
					:id="`faq-trigger-${item.id}`"
					@click="onRowClick($event, item.id)"
				>
					<span class="faq-index">{{ padIndex(index) }}</span>
					<span class="faq-copy">
						<span class="faq-question">{{ item.question }}</span>
					</span>
					<span class="faq-arrow" :class="{ 'is-open': openId === item.id }" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14" stroke-linecap="round" />
							<path d="m12 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</span>
				</button>

				<div
					:id="`faq-panel-${item.id}`"
					role="region"
					:aria-labelledby="`faq-trigger-${item.id}`"
					class="faq-panel"
					:class="{ 'is-open': openId === item.id }"
				>
					<div class="faq-panel-clip">
						<p
							v-for="(paragraph, paragraphIndex) in item.answer"
							:key="paragraphIndex"
							:class="{ 'is-follow': paragraphIndex > 0 }"
						>
							{{ paragraph }}
						</p>
						<img class="faq-shot-mobile" :src="item.image" :alt="item.question" />
					</div>
				</div>

				<Transition name="shot">
					<img
						v-if="openId === item.id"
						class="faq-shot"
						:src="item.image"
						:alt="item.question"
						:style="shotStyle(index)"
					/>
				</Transition>
			</article>
		</div>
	</div>
</template>

<style scoped>
.faq-shell {
	width: 100%;
	max-width: 1000px;
	margin: 0 auto;
	background: #0a0a0a;
	padding: 20px 20px 80px;
	color: #fff;
	font-family: var(--font-body);
}

.faq-title {
	margin: 0 0 2rem;
	color: #fff;
	font-family: var(--font-display);
	font-size: clamp(1.85rem, 4.2vw, 3.15rem);
	font-weight: 800;
	letter-spacing: -0.03em;
	line-height: 1.05;
}

.faq-search {
	position: relative;
	display: block;
	margin-bottom: 32px;
	animation: faq-search-in 0.45s ease both;
}

.faq-search-icon {
	position: absolute;
	top: 50%;
	left: 20px;
	color: #fff;
	opacity: 0.5;
	transform: translateY(-50%);
	pointer-events: none;
}

.faq-search input {
	width: 100%;
	padding: 18px 20px 18px 52px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 16px;
	background: transparent;
	color: #fff;
	font: 400 16px/1.6 var(--font-body);
	outline: none;
	transition: border-color 0.2s ease;
}

.faq-search input::placeholder {
	color: rgba(255, 255, 255, 0.45);
}

.faq-empty {
	margin: 0;
	padding: 40px;
	color: #fff;
	font-size: 16px;
	line-height: 1.6;
	text-align: center;
	opacity: 0.5;
}

.faq-row {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	padding: 36px 32px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 0;
	background: transparent;
	cursor: pointer;
	transition:
		background-color 0.3s ease-out,
		border-radius 0.3s ease-out,
		border-color 0.3s ease-out;
}

.faq-row.is-open {
	z-index: 10;
	border-bottom-color: transparent;
	border-radius: 24px;
	background: #ff8a00;
}

.faq-trigger {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: flex-start;
	width: 100%;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.faq-index {
	flex: none;
	width: 2.5rem;
	margin-top: 6px;
	color: #fff;
	font-size: 20px;
	font-weight: 500;
	line-height: 1;
	opacity: 0.5;
	transition:
		color 0.3s ease,
		opacity 0.3s ease;
}

.faq-row.is-open .faq-index {
	color: #0a0a0a;
	opacity: 1;
}

.faq-copy {
	flex: 1;
	min-width: 0;
	margin-left: 40px;
}

.faq-question {
	flex: 1;
	color: #fff;
	font-size: 32px;
	font-weight: 600;
	letter-spacing: -0.03em;
	line-height: 1.2;
	transition: color 0.3s ease;
}

.faq-row.is-open .faq-question {
	color: #0a0a0a;
}

.faq-arrow {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	margin-left: 16px;
	border: 1px solid #fff;
	border-radius: 999px;
	color: #fff;
	transition:
		transform 0.45s cubic-bezier(0.34, 1.35, 0.64, 1),
		color 0.3s ease,
		border-color 0.3s ease;
}

.faq-arrow svg {
	width: 20px;
	height: 20px;
}

.faq-arrow.is-open {
	border-color: #0a0a0a;
	color: #0a0a0a;
	transform: rotate(-45deg);
}

.faq-panel {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.faq-panel.is-open {
	grid-template-rows: 1fr;
}

.faq-panel-clip {
	min-height: 0;
	overflow: hidden;
}

.faq-panel p {
	max-width: 480px;
	margin: 16px 280px 0 calc(2.5rem + 40px);
	color: #0a0a0a;
	font-size: 16px;
	font-weight: 400;
	line-height: 1.6;
	opacity: 0.85;
}

.faq-panel p.is-follow {
	margin-top: 16px;
}

.faq-shot-mobile {
	display: none;
}

.faq-shot {
	position: absolute;
	top: 50%;
	right: 100px;
	z-index: 1;
	width: 170px;
	height: 210px;
	margin-top: -105px;
	border-radius: 16px;
	object-fit: cover;
	box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
	pointer-events: none;
	transform: translate(var(--x), var(--y)) rotate(var(--rot)) scale(1);
}

.shot-enter-active {
	transition:
		opacity 0.35s ease,
		transform 0.5s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.shot-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
}

.shot-enter-from {
	opacity: 0;
	transform: translate(20px, 0) rotate(var(--rot-from)) scale(0.8);
}

.shot-leave-to {
	opacity: 0;
	transform: translate(var(--x), var(--y)) rotate(var(--rot)) scale(0.9);
}

@keyframes faq-search-in {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (max-width: 768px) {
	.faq-shell {
		padding: 20px 10px 60px;
	}

	.faq-search {
		margin-bottom: 24px;
	}

	.faq-search input {
		font-size: 14.4px;
	}

	.faq-row {
		padding: 24px 20px;
	}

	.faq-trigger {
		align-items: center;
	}

	.faq-index {
		width: 2rem;
		margin-top: 2px;
		font-size: 16px;
	}

	.faq-copy {
		margin-left: 20px;
	}

	.faq-question {
		font-size: 24px;
	}

	.faq-arrow {
		width: 36px;
		height: 36px;
	}

	.faq-arrow svg {
		width: 16px;
		height: 16px;
	}

	.faq-panel p {
		max-width: none;
		margin: 16px 0 0 calc(2rem + 20px);
		font-size: 14.4px;
	}

	.faq-shot {
		display: none;
	}

	.faq-shot-mobile {
		display: block;
		width: 100%;
		height: 200px;
		margin: 20px 0 0;
		border-radius: 12px;
		object-fit: cover;
	}
}

@media (prefers-reduced-motion: reduce) {
	.faq-search,
	.faq-row,
	.faq-index,
	.faq-question,
	.faq-arrow,
	.faq-panel,
	.faq-shot,
	.shot-enter-active,
	.shot-leave-active {
		animation: none;
		transition: none;
	}
}
</style>
