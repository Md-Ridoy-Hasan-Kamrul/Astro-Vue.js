/**
 * Framer AnimatedPath geometry
 * https://framer.com/m/AnimatedPath-zpq9rv.js@POpugJ0TBxWL4GA458rY
 */
export type PathPoint = { x: number; y: number };

export const FRAMER_VIEW_WIDTH = 927;
export const FRAMER_VIEW_HEIGHT = 400;

/** One uninterrupted path: Collect → Analyze → Predict → Optimize */
export const FRAMER_PROCESS_PATH = `
    M 77 54
    C 132 2 244 8 297 118
    C 350 70 461 75 507 185
    C 571 124 698 136 757 271
`;

export const FRAMER_POINTS: PathPoint[] = [
	{ x: 77, y: 54 },
	{ x: 297, y: 118 },
	{ x: 507, y: 185 },
	{ x: 757, y: 271 },
];
