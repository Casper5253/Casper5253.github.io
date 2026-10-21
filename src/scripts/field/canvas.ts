import type { Renderer, RGB } from './model';

export function canvasRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;
  let width = 0;
  let height = 0;
  let colourKey = '';
  let sprites: HTMLCanvasElement[] = [];
  function colourSprites(colour: RGB) {
    const key = colour.join(',');
    if (key === colourKey) return;
    colourKey = key;
    sprites = Array.from({ length: 8 }, (_, band) => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 128;
      const context = sprite.getContext('2d');
      if (!context) return sprite;
      const z = band / 7;
      const rgb = colour.map(value => Math.round(value + (255 - value) * (1 - z) * 0.32));
      const coreRgb = rgb.map(value => Math.round(value + (255 - value) * z * z * 0.78));
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      const core = 0.09 + z * 0.055;
      gradient.addColorStop(0, `rgba(${coreRgb},1)`);
      gradient.addColorStop(core, `rgba(${coreRgb},.98)`);
      gradient.addColorStop(core * 2, `rgba(${rgb},.25)`);
      gradient.addColorStop(0.62, `rgba(${rgb},.055)`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      return sprite;
    });
  }
  return {
    kind: 'canvas',
    resize(w, h, ratio) {
      width = w; height = h;
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    },
    draw(points, count, colour) {
      colourSprites(colour);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count * 5; i += 5) {
        const size = points[i + 4] ?? 0;
        const sprite = sprites[Math.round((points[i + 2] ?? 0) * 7)];
        if (!sprite) continue;
        ctx.globalAlpha = points[i + 3] ?? 0;
        ctx.drawImage(sprite, (points[i] ?? 0) - size / 2, (points[i + 1] ?? 0) - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    },
    dispose() { sprites = []; },
  };
}
