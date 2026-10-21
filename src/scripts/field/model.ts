export const chapters = ['opening', 'understand', 'build', 'refine', 'deliver', 'learn'] as const;
export type Chapter = typeof chapters[number];
export type Rect = { left: number; top: number; right: number; bottom: number };
export type Point = { x: number; y: number };
// ox/oy: remaining travel from a previous placement, decayed by a critically damped spring (ovx/ovy).
export type Particle = Point & { kind: 'star' | 'dust'; z: number; seed: number; vx: number; vy: number; ox: number; oy: number; ovx: number; ovy: number };
export type RGB = readonly [number, number, number];
export type RendererKind = 'canvas' | 'webgl2';
export interface Renderer {
  readonly kind: RendererKind;
  resize(width: number, height: number, ratio: number): void;
  draw(points: Float32Array, count: number, colour: RGB): void;
  dispose(): void;
}
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function chapterFrom(id: string): Chapter | undefined {
  return chapters.find(chapter => chapter === id);
}
export function random(seed: number): number {
  let value = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function formation(chapter: Chapter, index: number, count: number, time: number): Point {
  const t = index / Math.max(1, count - 1);
  const jitter = random(index + 51) - 0.5;
  const angle = t * Math.PI * 2;
  switch (chapter) {
    case 'opening': {
      const theta = index * 2.399963;
      const radius = Math.sqrt(t) * 0.47;
      return { x: 0.5 + Math.cos(theta) * radius, y: 0.5 + Math.sin(theta) * radius * 0.85 };
    }
    case 'understand': {
      const group = index % 3;
      const convergence = 0.7 + Math.sin(time * 0.18) * 0.12;
      if (index % 11 === 0) return { x: 0.08 + random(index + 163) * 0.84, y: 0.1 + random(index + 173) * 0.8 };
      const spread = 0.075 - convergence * 0.032;
      return { x: (group === 0 ? 0.17 : group === 1 ? 0.5 : 0.83) + (random(index + 71) + random(index + 113) - 1) * spread,
        y: (group === 0 ? 0.22 : group === 1 ? 0.78 : 0.25) + (random(index + 211) + random(index + 239) - 1) * spread * 1.7 };
    }
    case 'build': {
      const columns = Math.ceil(Math.sqrt(count * 2));
      const rows = Math.ceil(count / columns);
      return { x: 0.06 + (index % columns) / Math.max(1, columns - 1) * 0.88,
        y: 0.09 + Math.floor(index / columns) / Math.max(1, rows - 1) * 0.82 };
    }
    case 'refine': {
      const orbit = angle + time * 0.045;
      const thickness = 1 + jitter * 0.13;
      return { x: 0.5 + Math.cos(orbit) * 0.43 * thickness, y: 0.5 + Math.sin(orbit) * 0.35 * thickness };
    }
    case 'deliver': {
      const lane = index % 5;
      const progress = (Math.floor(index / 5) / Math.ceil(count / 5) + time * 0.022) % 1;
      const end = 0.1 + lane * 0.2;
      const eased = progress * progress * (3 - 2 * progress);
      return { x: 0.07 + progress * 0.85, y: 0.5 + (end - 0.5) * eased + jitter * 0.012 };
    }
    case 'learn': {
      const theta = t * Math.PI * 4.4 + time * 0.018;
      const radius = 0.43 * (1 - t) + 0.035;
      return { x: 0.5 + Math.cos(theta) * radius, y: 0.5 + Math.sin(theta) * radius * 0.86 };
    }
  }
}

export function freeRegions(width: number, height: number, exclusions: Rect[]): Rect[] {
  const cell = 16;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const clear = Array.from({ length: rows }, () => new Uint8Array(cols).fill(1));
  for (const rect of exclusions) {
    for (let y = clamp(Math.floor(rect.top / cell), 0, rows - 1); y < Math.min(rows, Math.ceil(rect.bottom / cell)); y++) {
      clear[y]?.fill(0, clamp(Math.floor(rect.left / cell), 0, cols), clamp(Math.ceil(rect.right / cell), 0, cols));
    }
  }
  const regions: Rect[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const heights = new Uint16Array(cols);
    let best = { area: 0, left: 0, right: 0, top: 0, bottom: 0 };
    for (let y = 0; y < rows; y++) {
      const stack: number[] = [];
      for (let x = 0; x <= cols; x++) {
        if (x < cols) heights[x] = clear[y]?.[x] ? (heights[x] ?? 0) + 1 : 0;
        const current = x === cols ? 0 : (heights[x] ?? 0);
        while (stack.length && (heights[stack[stack.length - 1] ?? 0] ?? 0) > current) {
          const column = stack.pop();
          if (column === undefined) break;
          const h = heights[column] ?? 0;
          const left = stack.length ? (stack[stack.length - 1] ?? 0) + 1 : 0;
          const w = x - left;
          const area = w * h;
          if (w * cell >= 120 && h * cell >= 48 && area > best.area) {
            best = { area, left, right: x, top: y - h + 1, bottom: y + 1 };
          }
        }
        stack.push(x);
      }
    }
    if (!best.area) break;
    regions.push({ left: best.left * cell, right: Math.min(width, best.right * cell), top: best.top * cell, bottom: Math.min(height, best.bottom * cell) });
    for (let y = best.top; y < best.bottom; y++) clear[y]?.fill(0, best.left, best.right);
  }
  return regions;
}

export function blocked(x: number, y: number, radius: number, exclusions: Rect[]): boolean {
  return exclusions.some(rect => x + radius >= rect.left && x - radius <= rect.right && y + radius >= rect.top && y - radius <= rect.bottom);
}
