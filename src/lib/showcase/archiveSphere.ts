/**
 * Ethan Vale archive — Fibonacci sphere, camera, and headline math.
 * Pure functions only. The Vue island applies the results.
 */

export const SPHERE_COUNT = 21;
export const ARCHIVE_CDN =
	'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
export const ARCHIVE_FILM_URL =
	'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_195107_ed3f055a-3a13-4a71-b743-e10310454246.mp4';
export const ARCHIVE_FONT_URL =
	'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap';
export const HEADLINE_COPY = 'I See Through the Wild';
export const HEADLINE_WORDS = ['I', 'See', 'Through', 'the', 'Wild'] as const;

export const TILT_DEG = -4;
export const PITCH_LIMIT_DEG = 32;
export const SCROLL_ZOOM_VIEWPORTS = 0.16;
export const TRACK_HEIGHT_VH = 116;
export const HEADLINE_Z_RATIO = 0.62;
export const CAM_Z_CAP = 64;
export const CAM_Z_RADIUS_RATIO = 0.12;
export const CAM_Z_EASE = 0.075;
export const VELOCITY_DECAY = 0.94;
export const DRAG_DEG_PER_PX = 0.13;
/** Degrees of yaw added each frame while the pointer rests on the sphere. */
export const HOVER_SPIN_DEG = 0.42;
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

export type Shot = {
	id: string;
	title: string;
	place: string;
	note: string;
	tall?: boolean;
};

export type SpherePoint = {
	x: number;
	y: number;
	z: number;
	lat: number;
	lon: number;
};

export const archiveShots: readonly Shot[] = [
	{
		id: 'hf_20260922_194349_26ffdbfd-ac5e-49e9-a07d-c06d3f7cb4cb',
		title: 'Before the Dust Settled',
		place: 'South Africa · Limpopo Province',
		note: 'Wildlife photography is rarely about pressing the shutter. Most of the work happens earlier — waiting, staying still, and accepting that nature decides if the frame exists. This encounter lasted less than a minute.',
	},
	{
		id: 'hf_20260922_194350_5546ea3d-6336-42c7-a59f-06165c5802be',
		title: 'The Long Walk Home',
		place: 'Kenya · Maasai Mara',
		note: 'A matriarch leading her herd across open grass at the end of the day. I stayed low and let them close the distance on their own terms.',
	},
	{
		id: 'hf_20260922_194349_b4533691-cb49-41d4-b56c-51f0fdcbe250',
		title: 'Something Understood',
		place: 'Botswana · Okavango Delta',
		note: 'He held the look for about four seconds. Long enough to be certain neither of us intended to move first.',
	},
	{
		id: 'hf_20260922_194349_e588abd3-1bfa-4918-894f-05632cc51ccc',
		title: 'Nine Hours of Nothing',
		place: 'Finland · Lapland',
		note: 'A full day in a hide for a single turn of the head. That ratio is normal and I have stopped resenting it.',
	},
	{
		id: 'hf_20260922_194350_28d92c80-de66-41cb-911e-b3b44aebe1f5',
		title: 'Borrowed Trust',
		place: 'Scotland · Cairngorms',
		note: 'She had learned the shape of a person and decided it was uninteresting. That indifference is the rarest thing in this work.',
	},
	{
		id: 'hf_20260922_194349_04e89718-4214-4aff-bac5-490462bbfe2f',
		title: 'Small Weather',
		place: 'Costa Rica · Osa Peninsula',
		note: 'Rain had just stopped. Everything on that branch was the size of a thumbnail and lit like a stage.',
	},
	{
		id: 'hf_20260922_194417_2c031e22-2fad-4c81-a544-83cd6bba1c33',
		title: 'Against the Weather',
		place: 'Alaska · Chilkat Valley',
		note: 'Shot at a thousandth of a second into a rising storm. The light lasted eleven minutes.',
	},
	{
		id: 'hf_20260922_194349_a39c3226-7848-4b15-b840-98ad8aec467b',
		title: 'The Pale Edge',
		place: 'India · Bandhavgarh',
		note: 'Almost entirely hidden. I only found the frame because the foliage stopped moving in the wrong place.',
	},
	{
		id: 'hf_20260922_194417_555e4d90-f35f-4a1a-8c75-def1e8b71988',
		title: 'Perfect Arithmetic',
		place: 'Indonesia · Raja Ampat',
		note: 'Coiled with a precision that looks designed. Nothing about it is — it is just the cheapest way to hold heat.',
	},
	{
		id: 'hf_20260922_194417_e525a243-03c8-454b-83b4-60f541baf70a',
		title: 'Shallow Water',
		place: 'French Polynesia · Fakarava',
		note: 'Three metres down on a single breath. It passed close enough that I stopped composing and simply held the camera still.',
	},
	{
		id: 'hf_20260922_194349_ec830e6f-b8e6-4569-8540-ee7f33902c53',
		title: 'Two of Nine',
		place: 'India · Ranthambore',
		note: 'Siblings resting out the afternoon heat. The second one never opened its eyes.',
	},
	{
		id: 'hf_20260922_194417_35a9af5f-bd07-45a7-bb73-08b47d19d530',
		title: 'Low Ground',
		place: 'Nepal · Chitwan',
		note: 'Flat on the ground at her eye level, which is the only honest angle for an animal that hunts from there.',
	},
	{
		id: 'hf_20260922_194416_30e307a9-1265-45c3-a1a0-5c6fa5bb9f8d',
		title: 'Everything at Once',
		place: 'Iceland · Southern Coast',
		note: 'Free horses on a black beach at dusk. I panned and accepted whatever the frame gave back.',
	},
	{
		id: 'hf_20260922_194417_ff5cb9f8-8eed-4bfb-bb08-11256da92eae',
		title: 'White on White',
		place: 'Canada · Ellesmere Island',
		note: 'Snow removes every reference for exposure. The only reliable meter left is the eyes.',
	},
	{
		id: 'hf_20260922_194418_1d9bff4a-4971-4944-9e49-d72e755ceeb0',
		title: 'Census',
		place: 'Namibia · Etosha',
		note: 'Two of roughly sixteen thousand left. The number is the reason the frame exists.',
	},
	{
		id: 'hf_20260922_194349_75e53821-0807-4ebc-992d-34bae0ec2ce6',
		title: 'The Whole Field',
		place: 'France · Provence',
		note: 'Four millimetres of animal. At this magnification a breath of wind is an earthquake.',
	},
	{
		id: 'hf_20260922_194417_5a227847-3796-4438-805d-7e66e9538205',
		title: 'First Season',
		place: 'Germany · Bavarian Forest',
		note: 'Days old and already still enough to disappear. Stillness is the first thing anything here learns.',
	},
	{
		id: 'hf_20260922_194350_b49aa67e-0401-4029-af4f-f6ac3ee83398',
		title: 'Listening Posture',
		place: 'Tanzania · Serengeti',
		note: 'Ears forward, weight on the back legs. She heard something I never did.',
	},
	{
		id: 'hf_20260922_194349_89b82779-3a46-4c55-b7c5-f4a0fd955874',
		title: 'A Line of Red',
		place: 'Spain · Fuente de Piedra',
		note: 'Underexposed by two stops until only the shape survived.',
	},
	{
		id: 'hf_20260922_194416_47e18c62-253a-42e1-97a9-9e5f6a6b8d59',
		title: 'Left Behind',
		place: 'Studio · Reykjavík',
		note: 'Found beneath a roost at first light. The only frame in this archive an animal agreed to in advance.',
		tall: true,
	},
	{
		id: 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c',
		title: 'The Other Side',
		place: 'Uganda · Kibale Forest',
		note: 'Taken by a colleague between two long waits. Proof, mostly, that someone is holding the camera.',
	},
] as const;

export function thumbUrl(id: string): string {
	return `${ARCHIVE_CDN}${id}_min.webp`;
}

export function stillUrl(id: string): string {
	return `${ARCHIVE_CDN}${id}.png`;
}

export function clamp01(value: number): number {
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
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
	const heightRatio = phone ? 0.38 : tablet ? 0.42 : 0.46;
	const widthRatio = phone ? 0.48 : tablet ? 0.52 : 0.58;
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
	return `translateZ(${camZ}px) rotateY(${yaw}deg) rotateX(${pitch}deg)`;
}

export function headlineTransform(pitch: number, yaw: number, radius: number): string {
	return `rotateX(${-pitch}deg) rotateY(${-yaw}deg) translateZ(${radius * HEADLINE_Z_RATIO}px)`;
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
	const cosP = Math.cos(pitch);
	const sinP = Math.sin(pitch);
	const y1 = point.y * cosP - point.z * sinP;
	const z1 = point.y * sinP + point.z * cosP;
	const cosY = Math.cos(yaw);
	const sinY = Math.sin(yaw);
	return {
		...point,
		x: point.x * cosY + z1 * sinY,
		y: y1,
		z: -point.x * sinY + z1 * cosY,
	};
}
