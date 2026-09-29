/**
 * Photo sphere camera and headline math.
 * Pure functions only. The Vue island applies the results.
 */
import { sphereProducts } from './products';

export type { Product } from './products';

export const SPHERE_COUNT = 21;
export const ARCHIVE_CDN =
	'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
export const ARCHIVE_FILM_URL =
	'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_195107_ed3f055a-3a13-4a71-b743-e10310454246.mp4';
export const ARCHIVE_FONT_URL =
	'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap';
export const HEADLINE_COPY = 'Web Application Design';
export const HEADLINE_WORDS = ['Web', 'Application', 'Design'] as const;

export const TILT_DEG = -4;
export const PITCH_LIMIT_DEG = 32;
export const SCROLL_ZOOM_VIEWPORTS = 0.16;
/** Sticky track: the eye window opens, then zooms inward, then the photo circle. */
export const TRACK_HEIGHT_VH = 350;
export const EYE_WINDOW_END = 0.46;
export const EYE_ZOOM_END = 0.78;
export const EYE_INSET_START = 45;
export const EYE_ROUND_START = 1000;
export const EYE_ROUND_END = 16;
export const EYE_ZOOM_MAX = 1.22;
export const HEADLINE_Z_RATIO = 0.62;
export const CAM_Z_CAP = 64;
export const CAM_Z_RADIUS_RATIO = 0.12;
export const CAM_Z_EASE = 0.075;
export const VELOCITY_DECAY = 0.94;
export const DRAG_DEG_PER_PX = 0.13;
/** Visible slow yaw per frame while the archive is on screen. */
export const HOVER_SPIN_DEG = 0.22;
export const RADIUS_CAP = 480;
export const HEADLINE_FADE = 0.55;

const PHONE_MAX = 380;
const TABLET_MAX = 640;
const LAPTOP_MAX = 900;
const RADIUS_FLOOR_PHONE = 108;
const RADIUS_FLOOR_TABLET = 120;
const RADIUS_FLOOR_DESKTOP = 155;
const CARD_SCALE_PHONE = 0.44;
const CARD_SCALE_TABLET = 0.46;
const CARD_SCALE_DESKTOP = 0.47;
const CARD_MIN_PX = 72;
const WIDE_ASPECT = 1.5;
const TALL_HEIGHT_RATIO = 1.25;
const TALL_MARGIN_RATIO = 0.625;
const LANDSCAPE_MARGIN_Y_RATIO = 1 / 3;
const PERSP_PHONE = 620;
const PERSP_TABLET = 760;
const PERSP_LAPTOP = 920;
const PERSP_DESKTOP = 1150;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEPTH_BASE = 0.14;
const DEPTH_RANGE = 0.86;
const DEPTH_POWER = 0.85;
const SHADE_SCROLL = 1.6;
const OPEN_DIM_BOOST = 0.78;
const NEAR_RATIO = 0.66;
const FADE_SPAN = 190;

export const archiveShots = sphereProducts;

export function thumbUrl(id: string): string {
	return `${ARCHIVE_CDN}${id}_min.webp`;
}

export function stillUrl(id: string): string {
	return `${ARCHIVE_CDN}${id}.png`;
}

export function clamp01(value: number): number {
	if (value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
}

/**
 * ContainerScroll offset ["start center", "end end"].
 * The eye stays closed until the section reaches the middle of the screen.
 */
export function containerScrollProgress(
	targetTop: number,
	targetHeight: number,
	viewportHeight: number,
): number {
	const startTop = viewportHeight / 2;
	const endTop = viewportHeight - targetHeight;
	const span = startTop - endTop;
	if (span <= 0) return targetTop <= startTop ? 1 : 0;
	return clamp01((startTop - targetTop) / span);
}

/** Rounded window grows from a small eye to full frame. Never shrinks. */
export function eyeClipPath(progress: number): string {
	const t = clamp01(progress / EYE_WINDOW_END);
	const inset = EYE_INSET_START * (1 - t);
	const round = EYE_ROUND_START + (EYE_ROUND_END - EYE_ROUND_START) * t;
	return `inset(${inset}% ${inset}% ${inset}% ${inset}% round ${round}px)`;
}

/** After the window is open, scroll zooms into the eye. */
export function eyeZoomScale(progress: number): number {
	if (progress <= EYE_WINDOW_END) return 1;
	const t = clamp01((progress - EYE_WINDOW_END) / (EYE_ZOOM_END - EYE_WINDOW_END));
	return 1 + (EYE_ZOOM_MAX - 1) * t;
}

/** 0..1 through the eye film while the window opens and the zoom finishes. */
export function eyeFilmProgress(progress: number): number {
	return clamp01(progress / EYE_ZOOM_END);
}

export function eyeLayerOpacity(progress: number): number {
	if (progress <= EYE_ZOOM_END) return 1;
	return clamp01(1 - (progress - EYE_ZOOM_END) / (1 - EYE_ZOOM_END));
}

/** Dolly starts only after the eye zoom has finished. */
export function circleDolly(progress: number): number {
	return clamp01((progress - EYE_ZOOM_END) / (1 - EYE_ZOOM_END));
}

export function distributeSphere(count: number): SpherePoint[] {
	const last = Math.max(1, count - 1);
	return Array.from({ length: count }, (_, index) => {
		const y = 1 - (index / last) * 2;
		const ring = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = index * GOLDEN_ANGLE;
		const x = Math.cos(theta) * ring;
		const z = Math.sin(theta) * ring;
		return {
			x,
			y,
			z,
			lat: (Math.asin(y) * 180) / Math.PI,
			lon: (Math.atan2(x, z) * 180) / Math.PI,
		};
	});
}

export function sphereRadius(width: number, height: number): number {
	const phone = width <= PHONE_MAX;
	const tablet = width <= TABLET_MAX;
	const heightRatio = phone ? 0.33 : tablet ? 0.36 : 0.4;
	const widthRatio = phone ? 0.42 : tablet ? 0.46 : 0.5;
	const floor = phone ? RADIUS_FLOOR_PHONE : tablet ? RADIUS_FLOOR_TABLET : RADIUS_FLOOR_DESKTOP;
	return Math.max(floor, Math.min(RADIUS_CAP, height * heightRatio, width * widthRatio));
}

export function perspectiveForWidth(width: number): number {
	if (width <= PHONE_MAX) return PERSP_PHONE;
	if (width <= TABLET_MAX) return PERSP_TABLET;
	if (width <= LAPTOP_MAX) return PERSP_LAPTOP;
	return PERSP_DESKTOP;
}

export function cardChrome(
	radius: number,
	viewportWidth: number,
	tall: boolean,
): { width: number; height: number; marginLeft: number; marginTop: number } {
	const scale =
		viewportWidth <= PHONE_MAX
			? CARD_SCALE_PHONE
			: viewportWidth <= TABLET_MAX
				? CARD_SCALE_TABLET
				: CARD_SCALE_DESKTOP;
	const width = Math.round(Math.max(CARD_MIN_PX, radius * scale));
	if (tall) {
		return {
			width,
			height: width * TALL_HEIGHT_RATIO,
			marginLeft: -width / 2,
			marginTop: width * -TALL_MARGIN_RATIO,
		};
	}
	return {
		width,
		height: width / WIDE_ASPECT,
		marginLeft: -width / 2,
		marginTop: -width * LANDSCAPE_MARGIN_Y_RATIO,
	};
}

export function cardTransform(point: SpherePoint, radius: number): string {
	const x = point.x * radius;
	const y = -point.y * radius;
	const z = point.z * radius;
	return `translate3d(${x}px, ${y}px, ${z}px) rotateY(${point.lon}deg) rotateX(${point.lat}deg)`;
}

export function scrollZoomProgress(scrollY: number, viewportHeight: number): number {
	const span = viewportHeight * SCROLL_ZOOM_VIEWPORTS;
	if (span <= 0) return 0;
	return clamp01(scrollY / span);
}

export function camZTarget(progress: number, radius: number): number {
	return progress * Math.min(CAM_Z_CAP, radius * CAM_Z_RADIUS_RATIO);
}

export function hoverYaw(yaw: number, hovering: boolean, dragging: boolean, blocked: boolean): number {
	if (dragging || blocked || !hovering) return yaw;
	return yaw + HOVER_SPIN_DEG;
}

export function worldTransform(camZ: number, yaw: number, pitch: number): string {
	return `translateZ(${camZ}px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
}

export function headlineTransform(pitch: number, yaw: number, radius: number): string {
	return `rotateY(${-yaw}deg) rotateX(${-pitch}deg) translateZ(${radius * HEADLINE_Z_RATIO}px)`;
}

export function headlineOpacity(progress: number): number {
	return Math.max(0, 1 - progress * HEADLINE_FADE);
}

export function cardDim(depth: number, progress: number, shotOpen: boolean): number {
	const base = DEPTH_BASE + DEPTH_RANGE * ((depth + 1) / 2) ** DEPTH_POWER;
	const shade = 1 - Math.min(1, progress * SHADE_SCROLL);
	const dim = shade * (1 - base);
	if (!shotOpen) return dim;
	return Math.min(1, dim + OPEN_DIM_BOOST);
}

export function cardFade(depth: number, radius: number, camZ: number, perspective: number, focused: boolean): number {
	if (focused) return 0;
	const absZ = depth * radius + camZ;
	const near = perspective * NEAR_RATIO;
	if (absZ <= near) return 1;
	return Math.max(0, 1 - (Math.abs(absZ) - near) / FADE_SPAN);
}

export function rotateUnit(point: SpherePoint, yawDeg: number, pitchDeg: number): SpherePoint {
	const pitch = (pitchDeg * Math.PI) / 180;
	const yaw = (yawDeg * Math.PI) / 180;
	const cosY = Math.cos(yaw);
	const sinY = Math.sin(yaw);
	const x1 = point.x * cosY + point.z * sinY;
	const z1 = -point.x * sinY + point.z * cosY;
	const cosP = Math.cos(pitch);
	const sinP = Math.sin(pitch);
	return {
		...point,
		x: x1,
		y: point.y * cosP - z1 * sinP,
		z: point.y * sinP + z1 * cosP,
	};
}
