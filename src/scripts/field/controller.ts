import type { Field } from '../field';
import { canvasRenderer } from './canvas';
import { blocked, chapterFrom, clamp, formation, freeRegions, random, type Chapter, type Particle, type Point, type Rect, type Renderer, type RendererKind, type RGB } from './model';

export type FrameSample = { timestamp: number; work: number; drawn: number; renderer: RendererKind };
export type FieldOptions = { renderer?: RendererKind; onFrame?: (sample: FrameSample) => void };
const exclusionSelector = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figure,img,svg,video,a,button,label,input,textarea,select,pre,table,[data-field-exclude],[data-artifact-plane],.site-header';
const empty: Field = { setChapter() {}, measure() {} };
const scrollPace = 3000;
const area = (rect: Rect) => (rect.right - rect.left) * (rect.bottom - rect.top);
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

export function createField(options: FieldOptions = {}): Field {
  if (typeof document === 'undefined') return empty;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let canvas = makeCanvas();
  let renderer: Renderer | null = null;
  let chapter: Chapter = 'opening';
  let width = 0;
  let height = 0;
  let ratio = 1;
  let points: Particle[] = [];
  let starCount = 0;
  let heroDepth = 1;
  let packed = new Float32Array(0);
  let exclusions: Rect[] = [];
  let regions: Rect[] = [];
  let placedChapter: Chapter | null = null;
  let lastScrollX = 0;
  let lastScrollY = 0;
  let scrolled = 0;
  let colour: RGB = [0, 0, 0];
  let raf = 0;
  let measureTimer = 0;
  let last = 0;
  let phase = 0;
  let inView = true;
  let disposed = false;
  let pointer: Point | null = null;
  let parallaxX = 0;
  let parallaxY = 0;
  let targetX = 0;
  let targetY = 0;
  let slowFrames = 0;
  let density = navigator.hardwareConcurrency <= 4 ? 0.6 : 1;
  let still: HTMLCanvasElement | null = null;
  let fade: Animation | null = null;
  let fadeIn: Animation | null = null;
  const ro = new ResizeObserver(scheduleMeasure);
  const io = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    if (inView) wake(); else stop();
  });

  function makeCanvas() {
    const element = document.createElement('canvas');
    element.className = 'depth-field';
    element.setAttribute('aria-hidden', 'true');
    element.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block';
    document.body.prepend(element);
    return element;
  }

  function readColour(): RGB {
    const element = document.querySelector(`[data-tone="${chapter}"]`);
    const probe = document.createElement('span');
    probe.dataset.tone = chapter;
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.append(probe);
    let accent = getComputedStyle(element || probe).getPropertyValue('--accent').trim();
    if (chapter === 'opening') {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && /:root\[data-chapter=['"]?opening/.test(rule.selectorText)) accent = rule.style.getPropertyValue('--accent').trim() || accent;
          }
        } catch { /* Cross-origin styles cannot supply local tokens. */ }
      }
    }
    probe.style.color = accent || 'white';
    const channels = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number);
    probe.remove();
    return channels && channels.length >= 3 ? [channels[0] ?? 255, channels[1] ?? 255, channels[2] ?? 255] : [255, 255, 255];
  }

  function stop() {
    cancelAnimationFrame(raf); raf = 0; last = 0; pointer = null;
  }
  function clearFade() {
    fade?.cancel(); fade = null; fadeIn?.cancel(); fadeIn = null; still?.remove();
  }
  function preserveStill() {
    clearFade();
    if (!renderer || document.hidden || !inView) return;
    // One reused layer: allocating a full-resolution canvas per chapter change dominated reduced-motion scrolling.
    if (!still) {
      still = document.createElement('canvas');
      still.setAttribute('aria-hidden', 'true');
      still.className = 'depth-field-crossfade';
    }
    if (still.width !== canvas.width || still.height !== canvas.height) { still.width = canvas.width; still.height = canvas.height; }
    still.style.cssText = canvas.style.cssText;
    const context = still.getContext('2d');
    context?.clearRect(0, 0, still.width, still.height);
    context?.drawImage(canvas, 0, 0);
    canvas.after(still);
    fadeIn = canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    const current = still.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    fade = current;
    current.finished.then(() => { if (fade === current) clearFade(); }).catch(() => {});
  }
  function target(index: number, time: number): Point {
    const split = regions.length > 1 && (chapter !== 'understand' || points[index]?.kind === 'dust');
    const slot = split && index % 5 === 0 ? 1 : 0;
    const rect = regions[slot];
    if (!rect) return { x: 0, y: 0 };
    const localIndex = slot ? Math.floor(index / 5) : index - Math.floor(index / 5) - 1;
    const localCount = split ? Math.ceil(starCount * (slot ? 0.2 : 0.8)) : starCount;
    const normal = points[index]?.kind === 'dust' ? { x: 0.04 + random(index + 811) * 0.92, y: 0.04 + random(index + 941) * 0.92 }
      : formation(chapter, split ? Math.max(0, localIndex) : index, localCount, time);
    const margin = Math.min(22, (rect.bottom - rect.top) * 0.16);
    return { x: rect.left + margin + normal.x * Math.max(1, rect.right - rect.left - margin * 2),
      y: rect.top + margin + normal.y * Math.max(1, rect.bottom - rect.top - margin * 2) };
  }
  function settle() {
    points.forEach((point, i) => { const at = target(i, 0); point.x = at.x; point.y = at.y; point.vx = point.vy = point.ox = point.oy = point.ovx = point.ovy = 0; });
  }
  function freeWithin(bounds: Rect, masks: Rect[] = exclusions): Rect | undefined {
    const rect = { left: Math.max(0, bounds.left), right: Math.min(width, bounds.right), top: Math.max(0, bounds.top), bottom: Math.min(height, bounds.bottom) };
    if (rect.right <= rect.left || rect.bottom <= rect.top) return undefined;
    const local = masks.filter(mask => overlap(mask, rect) > 0).map(mask => ({
      left: mask.left - rect.left, right: mask.right - rect.left, top: mask.top - rect.top, bottom: mask.bottom - rect.top,
    }));
    const safe = freeRegions(rect.right - rect.left, rect.bottom - rect.top, local)[0];
    return safe && { left: rect.left + safe.left, right: rect.left + safe.right, top: rect.top + safe.top, bottom: rect.top + safe.bottom };
  }
  function measureNow(snap = false) {
    if (!renderer || disposed) return;
    const previousTargets = points.map((_, i) => target(i, phase));
    exclusions = [...document.querySelectorAll(exclusionSelector)].flatMap(element => {
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || element.closest('[hidden]')) return [];
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom < 0 || rect.right < 0 || rect.top > height || rect.left > width) return [];
      const padding = element.matches('[data-artifact-plane]') ? 22 : 30;
      return [{ left: clamp(rect.left - padding, 0, width), right: clamp(rect.right + padding, 0, width),
        top: clamp(rect.top - padding, 0, height), bottom: clamp(rect.bottom + padding, 0, height) }];
    });
    const section = document.getElementById(chapter);
    const zones = [...document.querySelectorAll('[data-field-zone]')].flatMap(element => {
      const owner = element.getAttribute('data-field-zone');
      if (owner ? owner !== chapter : !section?.contains(element)) return [];
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return [];
      const bounds = element.getBoundingClientRect();
      if (Math.min(width, bounds.right) - Math.max(0, bounds.left) < 120 || Math.min(height, bounds.bottom) - Math.max(0, bounds.top) < 72) return [];
      const safe = freeWithin(bounds);
      return safe ? [safe] : [];
    }).sort((a, b) => area(b) - area(a));
    const placement = zones[0] ? 'zone' : 'free';
    const fresh = zones[0] ? [zones[0]] : freeRegions(width, height, exclusions);
    // Content moves by the scroll delta, so the current placement travels with it.
    const dx = lastScrollX - scrollX;
    const dy = lastScrollY - scrollY;
    lastScrollX = scrollX; lastScrollY = scrollY;
    scrolled += Math.hypot(dx, dy);
    const shift = (rect: Rect): Rect => ({ left: rect.left + dx, right: rect.right + dx, top: rect.top + dy, bottom: rect.bottom + dy });
    const hadRegions = regions.length > 0;
    const carried = regions.map(shift);
    const kept = !snap && chapter === placedChapter && carried[0] ? freeWithin(carried[0]) : undefined;
    // Hysteresis: hold the current space until a clearly larger, separate one appears.
    const keep = kept && carried[0] && fresh[0] && overlap(fresh[0], carried[0]) < area(kept) / 2 && area(fresh[0]) < area(kept) * 1.6;
    if (keep) {
      const second = carried[1] && (freeWithin(carried[1], [...exclusions, kept]) || freeRegions(width, height, [...exclusions, kept])[0]);
      regions = second ? [kept, second] : [kept];
    } else {
      regions = fresh;
      canvas.dataset.placement = placement;
    }
    placedChapter = chapter;
    // A formation whose space continues moves with its content; a relocated one leaves from where it is on screen.
    // Either way, particles then travel smoothly over the remaining distance to their new targets.
    const continues = carried[0] && regions[0] && overlap(carried[0], regions[0]) > 0;
    const carryX = continues ? dx : 0;
    const carryY = continues ? dy : 0;
    points.forEach((point, i) => {
      const previous = previousTargets[i];
      if (!previous) return;
      const next = target(i, phase);
      const resting = Math.abs(point.ox) + Math.abs(point.oy) < 1;
      point.x += carryX; point.y += carryY;
      point.ox += previous.x + carryX - next.x;
      point.oy += previous.y + carryY - next.y;
      // A star already out of sight when its formation leaves starts at the destination.
      if (resting && !onScreen(point)) { point.x -= point.ox; point.y -= point.oy; point.ox = point.oy = point.ovx = point.ovy = 0; }
    });
    if (reduced.matches || snap || !hadRegions) settle();
    draw(); wake();
  }
  function scheduleMeasure() {
    if (measureTimer || disposed) return;
    measureTimer = window.setTimeout(() => { measureTimer = 0; measureNow(); }, 40);
  }
  function resize() {
    if (!renderer) return;
    width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 3);
    renderer.resize(width, height, ratio);
    starCount = Math.round(clamp(width * height / 5700, 72, 264) * density);
    const count = Math.min(width < 600 ? 100 : 344, starCount + Math.round(starCount * 0.3));
    points = Array.from({ length: count }, (_, i): Particle => ({ kind: i < starCount ? 'star' : 'dust', x: 0, y: 0, vx: 0, vy: 0, ox: 0, oy: 0, ovx: 0, ovy: 0,
      z: random(i + 401) * (i < starCount ? 1 : 0.25), seed: i + 1 }));
    heroDepth = points.filter(point => point.kind === 'star').map(point => point.z).sort((a, b) => b - a)[3] ?? 1;
    packed = new Float32Array(count * 5);
    measureNow(true);
  }
  function onScreen(point: Particle) {
    const size = point.kind === 'dust' ? 1.4 + point.z * 2 : (3 + point.z * point.z * 34) * (chapter === 'opening' && point.z >= heroDepth ? 1.4 : 1);
    const x = point.x + parallaxX * (3 + point.z * 17);
    const y = point.y + parallaxY * (3 + point.z * 17);
    return blocked(x, y, size / 2 + 1, exclusions) || x < 0 || y < 0 || x > width || y > height ? null : { x, y, size };
  }
  function draw() {
    if (!renderer) return;
    let count = 0;
    if (regions.length) for (const point of points) {
      const at = onScreen(point);
      if (!at) continue;
      const i = count++ * 5;
      packed[i] = at.x; packed[i + 1] = at.y; packed[i + 2] = point.z;
      packed[i + 3] = point.kind === 'dust' ? 0.1 + point.z * 0.2 : 0.5 + point.z * 0.5; packed[i + 4] = at.size;
    }
    renderer.draw(packed, count, colour);
    if (count && !canvas.dataset.firstFrameAt) canvas.dataset.firstFrameAt = String(performance.now());
    return count;
  }
  function frame(now: number) {
    raf = 0;
    if (!canAnimate()) return;
    const frameStart = performance.now();
    const elapsed = last ? (now - last) / 1000 : 1 / 60;
    const delta = Math.min(elapsed, 0.04);
    last = now; phase += delta;
    parallaxX += (targetX - parallaxX) * (1 - Math.exp(-5.5 * delta));
    parallaxY += (targetY - parallaxY) * (1 - Math.exp(-5.5 * delta));
    const damping = Math.exp(-4.2 * delta);
    // Relocation also advances with scroll distance, so the field keeps up when the page moves fast.
    const clock = delta + scrolled / scrollPace;
    scrolled = 0;
    points.forEach((point, i) => {
      // Relocation is an exact critically damped spring, 95% of the way in 220-450ms, staggered so the move reads as a flow.
      const travel = 10.5 + random(point.seed + 577) * 11;
      const decay = Math.exp(-travel * clock);
      const kickX = (point.ovx + travel * point.ox) * clock;
      const kickY = (point.ovy + travel * point.oy) * clock;
      const fromX = point.ox; const fromY = point.oy;
      point.ox = (point.ox + kickX) * decay; point.ovx = (point.ovx - travel * kickX) * decay;
      point.oy = (point.oy + kickY) * decay; point.ovy = (point.ovy - travel * kickY) * decay;
      point.x += point.ox - fromX; point.y += point.oy - fromY;
      const at = target(i, phase);
      const drift = 0.5 + point.z * 0.8;
      const stiffness = 10 + point.z * 2;
      point.vx = (point.vx + (at.x + point.ox + Math.sin(phase * 0.62 + point.seed) * drift - point.x) * stiffness * delta) * damping;
      point.vy = (point.vy + (at.y + point.oy + Math.cos(phase * 0.49 + point.seed) * drift - point.y) * stiffness * delta) * damping;
      const speed = Math.hypot(point.vx, point.vy);
      if (speed > 220) { point.vx *= 220 / speed; point.vy *= 220 / speed; }
      point.x += point.vx * delta; point.y += point.vy * delta;
    });
    const drawn = draw() || 0;
    const work = performance.now() - frameStart;
    options.onFrame?.({ timestamp: now, work, drawn, renderer: renderer?.kind || 'canvas' });
    slowFrames = work > 20 || elapsed > 0.02 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 15 && density > 0.45) { density *= 0.7; slowFrames = 0; resize(); }
    raf = requestAnimationFrame(frame);
  }
  function canAnimate() { return !!renderer && !disposed && !document.hidden && inView && regions.length > 0 && !reduced.matches; }
  function wake() { if (!raf && canAnimate()) { last = 0; raf = requestAnimationFrame(frame); } }
  function move(event: PointerEvent) {
    if (reduced.matches || event.pointerType === 'touch' || !canAnimate()) return;
    const current = { x: event.clientX, y: event.clientY };
    const previous = pointer;
    if (previous) {
      const dx = current.x - previous.x; const dy = current.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (distance) for (const point of points) {
        const segment = clamp(((point.x - previous.x) * dx + (point.y - previous.y) * dy) / (distance * distance), 0, 1);
        const ax = point.x - previous.x - dx * segment; const ay = point.y - previous.y - dy * segment;
        const near = Math.hypot(ax, ay);
        if (near >= 126) continue;
        const falloff = 1 - near / 126;
        const strength = falloff * falloff * (3 - 2 * falloff) * (38 + point.z * 62);
        point.vx += (dx / distance * 0.56 + (near ? ax / near : -dy / distance) * 0.72) * strength;
        point.vy += (dy / distance * 0.56 + (near ? ay / near : dx / distance) * 0.72) * strength;
        const speed = Math.hypot(point.vx, point.vy);
        if (speed > 220) { point.vx *= 220 / speed; point.vy *= 220 / speed; }
      }
    }
    pointer = current;
    targetX = clamp((current.x / width - 0.5) * 2, -1, 1);
    targetY = clamp((current.y / height - 0.5) * 2, -1, 1);
  }
  async function initialise() {
    if (disposed) return;
    if (options.renderer === 'webgl2') {
      const { webglRenderer } = await import('./webgl');
      if (disposed) return;
      renderer = webglRenderer(canvas);
      if (!renderer) { const old = canvas; canvas = makeCanvas(); old.remove(); }
    }
    renderer ||= canvasRenderer(canvas);
    if (!renderer) { canvas.remove(); return; }
    canvas.dataset.renderer = renderer.kind;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); stop(); clearFade(); io.unobserve(canvas);
      renderer?.dispose();
      const old = canvas; canvas = makeCanvas(); old.remove();
      renderer = canvasRenderer(canvas); canvas.dataset.renderer = 'canvas';
      io.observe(canvas); resize();
    }, { signal: events.signal });
    colour = readColour(); resize(); io.observe(canvas); ro.observe(document.body);
    document.fonts.ready.then(scheduleMeasure);
  }

  addEventListener('pointermove', move, { passive: true, signal: events.signal });
  addEventListener('pointerout', event => { if (!event.relatedTarget) { pointer = null; targetX = targetY = 0; } }, { passive: true, signal: events.signal });
  addEventListener('scroll', () => {
    clearFade();
    measureNow();
  }, { passive: true, signal: events.signal });
  addEventListener('resize', () => { clearFade(); resize(); }, { passive: true, signal: events.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); clearFade(); } else measureNow(); }, { signal: events.signal });
  reduced.addEventListener('change', () => {
    stop(); clearFade(); pointer = null; parallaxX = parallaxY = targetX = targetY = 0;
    if (reduced.matches) { phase = 0; settle(); draw(); } else wake();
  }, { signal: events.signal });
  addEventListener('pagehide', event => {
    stop(); clearFade();
    if (!event.persisted) {
      disposed = true; events.abort(); ro.disconnect(); io.disconnect();
      clearTimeout(measureTimer); renderer?.dispose(); canvas.remove();
    }
  }, { signal: events.signal });
  addEventListener('pageshow', () => { measureNow(); }, { signal: events.signal });
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => { void initialise(); }, { timeout: 250 });
    else setTimeout(() => { void initialise(); }, 0);
  });
  return {
    setChapter(id) {
      const next = chapterFrom(id);
      if (!next || next === chapter || disposed) return;
      if (reduced.matches) preserveStill();
      chapter = next; phase = 0; colour = readColour(); measureNow();
    },
    measure: scheduleMeasure,
  };
}
