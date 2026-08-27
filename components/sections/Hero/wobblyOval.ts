const OVAL_RX = 58;
const OVAL_RY = 13;
const CENTER_X = 57;
const CENTER_Y = 12;

const WOBBLE_AMOUNT_1 = 1.4;
const WOBBLE_FREQ_1 = 3.3;
const WOBBLE_AMOUNT_2 = 0.6;
const WOBBLE_FREQ_2 = 5.7;

const SEAM_ANGLE_DEG = 150;
const OVERLAP_SWEEP_DEG = 385;
const SEAM_DRIFT_PX = 2.6;
const STEPS = 160;

export const STROKE_COLOR = "currentColor";
export const STROKE_WIDTH = 0.75;
export const VIEW_BOX = "-12 -10 138 40";

function hash(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function wobble(angleDeg: number, phaseShift: number, freq1: number, freq2: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return (
    WOBBLE_AMOUNT_1 * Math.sin(rad * freq1 + phaseShift) +
    WOBBLE_AMOUNT_2 * Math.sin(rad * freq2 + phaseShift * 1.7 + 1.3)
  );
}

function smoothPathFromPoints(points: [number, number][]): string {
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q${x0.toFixed(2)},${y0.toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  d += ` L${lastX.toFixed(2)},${lastY.toFixed(2)}`;
  return d;
}

export function buildWobblyOvalPath(seed = 0): string {
  const seamAngle = SEAM_ANGLE_DEG + (hash(seed, 1) - 0.5) * 20;
  const overlapSweep = OVERLAP_SWEEP_DEG + (hash(seed, 2) - 0.5) * 16;
  const drift = SEAM_DRIFT_PX * (0.8 + hash(seed, 3) * 0.5);
  const phaseA = hash(seed, 4) * Math.PI * 2;
  const phaseB = hash(seed, 5) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 6) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 7) - 0.5) * 0.6;
  const rx = OVAL_RX + (hash(seed, 8) - 0.5) * 4;
  const ry = OVAL_RY + (hash(seed, 9) - 0.5) * 2;

  const points: [number, number][] = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const rCurrentX = rx + wobble(angleDeg, phaseA, freq1, freq2) + d;
    const rCurrentY = ry + wobble(angleDeg, phaseB, freq1, freq2) + d * (ry / rx);
    const x = CENTER_X + rCurrentX * Math.cos(rad);
    const y = CENTER_Y + rCurrentY * Math.sin(rad);
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}

const SQUIRCLE_HALF = 60;
const SQUIRCLE_CENTER = 64;
const SQUIRCLE_EXPONENT = 4;
const SQUIRCLE_SEAM_ANGLE_DEG = 150;
const SQUIRCLE_OVERLAP_SWEEP_DEG = 385;
const SQUIRCLE_SEAM_DRIFT_PX = 2.2;
const SQUIRCLE_STEPS = 200;

export const PILL_STROKE_COLOR = "currentColor";
export const PILL_STROKE_WIDTH = 1;
export const PILL_VIEW_BOX = "-14 -14 156 156";

function superellipseUnit(theta: number, n: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  return [x, y];
}

export function buildWobblyPillPath(seed = 0): string {
  const seamAngle = SQUIRCLE_SEAM_ANGLE_DEG + (hash(seed, 201) - 0.5) * 20;
  const overlapSweep = SQUIRCLE_OVERLAP_SWEEP_DEG + (hash(seed, 202) - 0.5) * 16;
  const drift = SQUIRCLE_SEAM_DRIFT_PX * (0.8 + hash(seed, 203) * 0.5);
  const phaseA = hash(seed, 204) * Math.PI * 2;
  const phaseB = hash(seed, 205) * Math.PI * 2;
  const freq1 = WOBBLE_FREQ_1 + (hash(seed, 206) - 0.5) * 0.6;
  const freq2 = WOBBLE_FREQ_2 + (hash(seed, 207) - 0.5) * 0.6;
  const rBase = SQUIRCLE_HALF + (hash(seed, 208) - 0.5) * 4;

  const points: [number, number][] = [];

  for (let i = 0; i <= SQUIRCLE_STEPS; i++) {
    const t = i / SQUIRCLE_STEPS;
    const angleDeg = seamAngle + overlapSweep * t;
    const rad = (angleDeg * Math.PI) / 180;
    const d = drift * t;
    const rCurrent = rBase + wobble(angleDeg, phaseA, freq1, freq2) + d;
    const [ux, uy] = superellipseUnit(rad, SQUIRCLE_EXPONENT);
    const x = SQUIRCLE_CENTER + ux * rCurrent;
    const y = SQUIRCLE_CENTER + uy * rCurrent;
    points.push([x, y]);
  }

  return smoothPathFromPoints(points);
}
