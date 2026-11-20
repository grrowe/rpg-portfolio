/**
 * Classic grid raycaster (Wolfenstein-style DDA) with textured floor/ceiling casting,
 * billboard sprites and distance lighting. Renders into a small ImageData buffer that
 * CSS scales up with `image-rendering: pixelated`.
 */
import { TS } from "./textures";
import { cellAt } from "./map";
import type { Player, Sprite, Tex } from "./types";

export interface FrameState {
  p: Player;
  sprites: Sprite[];
  moveT: number;
  castT: number;
  flash: number;
  /** 0–1 red overlay after a bug bites. */
  hurt: number;
}
export interface Hit {
  ch: string;
  d: number;
}

const FOV = 0.66; // camera plane length, roughly 66 degrees
const RENDER_H = 225;

/** Warm torch-light tint. Inputs and output are packed ABGR (little-endian RGBA). */
function shade(c: number, l: number): number {
  const r = (c & 255) * l * 1.08;
  const g = ((c >> 8) & 255) * l * 0.95;
  const b = ((c >> 16) & 255) * l * 0.82;
  return 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
}
const lightAt = (d: number, flick: number) => Math.max(0.07, flick / (1 + d * d * 0.05));

export class Renderer {
  W = 400;
  H = RENDER_H;
  centerHit: Hit = { ch: "#", d: Infinity };
  private ctx: CanvasRenderingContext2D;
  private img!: ImageData;
  private buf!: Uint32Array;
  private zbuf!: Float32Array;

  constructor(
    private cv: HTMLCanvasElement,
    private tex: Record<string, Tex>,
    private reduceMotion: boolean,
  ) {
    const c = cv.getContext("2d");
    if (!c) throw new Error("Canvas 2D is not available");
    this.ctx = c;
    this.resize();
  }

  /** Keep a fixed 225px tall buffer and match the container's aspect ratio, so nothing stretches. */
  resize() {
    const r = this.cv.parentElement?.getBoundingClientRect();
    const aspect = r && r.height > 0 ? r.width / r.height : 16 / 9;
    this.H = RENDER_H;
    this.W = Math.max(300, Math.min(560, Math.round(this.H * aspect)));
    this.cv.width = this.W;
    this.cv.height = this.H;
    this.img = this.ctx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.zbuf = new Float32Array(this.W);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(s: FrameState, t: number) {
    const { W, H, buf, zbuf, tex } = this;
    const { p } = s;
    const dirX = Math.cos(p.a);
    const dirY = Math.sin(p.a);
    const plX = -dirY * FOV;
    const plY = dirX * FOV;
    const bob = this.reduceMotion ? 0 : Math.sin(s.moveT * 9) * 2.2;
    const hz = (H >> 1) + Math.round(bob);
    const flick = 0.94 + Math.sin(t * 0.011) * 0.03 + Math.sin(t * 0.037) * 0.03;
    const half = H / 2;

    // ── floor and ceiling, one row at a time ──
    const floorPx = tex.floor.px;
    const ceilPx = tex.ceil.px;
    const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
    for (let y = 0; y < H; y++) {
      const isFloor = y > hz;
      const rowP = isFloor ? y - hz : hz - y;
      if (rowP === 0) continue;
      const rowD = half / rowP;
      const l = lightAt(rowD, flick) * (isFloor ? 1 : 0.8);
      const sx = (rowD * (rx1 - rx0)) / W;
      const sy = (rowD * (ry1 - ry0)) / W;
      let fx = p.x + rowD * rx0;
      let fy = p.y + rowD * ry0;
      const src = isFloor ? floorPx : ceilPx;
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const tx = (TS * (fx - Math.floor(fx))) & (TS - 1);
        const ty = (TS * (fy - Math.floor(fy))) & (TS - 1);
        buf[row + x] = shade(src[ty * TS + tx], l);
        fx += sx;
        fy += sy;
      }
    }

    // ── walls (DDA per column) ──
    const torchKey = ((t / 140) | 0) % 2 ? "t1" : "t0";
    for (let x = 0; x < W; x++) {
      const cam = (2 * x) / W - 1;
      const rdx = dirX + plX * cam;
      const rdy = dirY + plY * cam;
      let mx = p.x | 0;
      let my = p.y | 0;
      const ddx = Math.abs(1 / rdx);
      const ddy = Math.abs(1 / rdy);
      let stepX: number, stepY: number, sdx: number, sdy: number;
      let side = 0;
      let ch = "#";
      if (rdx < 0) { stepX = -1; sdx = (p.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - p.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (p.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - p.y) * ddy; }
      for (let i = 0; i < 64; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
        ch = cellAt(mx, my);
        if (ch !== ".") break;
      }
      const perp = side === 0 ? sdx - ddx : sdy - ddy;
      zbuf[x] = perp;
      if (x === W >> 1) this.centerHit = { ch, d: perp };

      const wall = tex[ch === "t" ? torchKey : tex[ch] ? ch : "#"];
      let wx = side === 0 ? p.y + perp * rdy : p.x + perp * rdx;
      wx -= Math.floor(wx);
      let tx = (wx * TS) | 0;
      // Flip so text on door plaques reads left-to-right from either side.
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) tx = TS - tx - 1;
      const lh = H / perp;
      const top = hz - lh / 2;
      const y0 = Math.max(0, top | 0);
      const y1 = Math.min(H, (hz + lh / 2) | 0);
      const step = TS / lh;
      let tp = (y0 - top) * step;
      const l = lightAt(perp, flick) * (side ? 0.78 : 1);
      const { px, em } = wall;
      for (let y = y0; y < y1; y++) {
        const i = (((tp | 0) & (TS - 1)) * TS) + tx;
        tp += step;
        buf[y * W + x] = em && em[i] ? px[i] : shade(px[i], l);
      }
    }

    // ── sprites, far to near, clipped against the wall z-buffer ──
    const inv = 1 / (plX * dirY - dirX * plY);
    const list = s.sprites
      .filter((sp) => !sp.taken)
      .map((sp) => ({ sp, d: (sp.x - p.x) ** 2 + (sp.y - p.y) ** 2 }))
      .sort((a, b) => b.d - a.d);
    for (const { sp } of list) {
      const sx = sp.x - p.x;
      const sy = sp.y - p.y;
      const tX = inv * (dirY * sx - dirX * sy);
      const tY = inv * (-plY * sx + plX * sy);
      if (tY <= 0.15) continue;
      const st = tex[sp.tex];
      const unit = H / tY;
      const sh = unit * sp.h;
      const sw = (sh * st.w) / st.h;
      const lift = (sp.lift ?? 0) + (sp.relic !== undefined ? Math.sin(t * 0.004 + sp.relic) * 0.05 : 0);
      const bottom = hz + half / tY - lift * unit;
      const top = bottom - sh;
      const left = (W / 2) * (1 + tX / tY) - sw / 2;
      const xa = Math.max(0, left | 0), xb = Math.min(W, (left + sw) | 0);
      const ya = Math.max(0, top | 0), yb = Math.min(H, bottom | 0);
      const l = lightAt(tY, flick);
      for (let x = xa; x < xb; x++) {
        if (tY >= zbuf[x]) continue;
        const tx = (((x - left) / sw) * st.w) | 0;
        for (let y = ya; y < yb; y++) {
          const i = ((((y - top) / sh) * st.h) | 0) * st.w + tx;
          const c = st.px[i];
          if (c >>> 24 < 128) continue;
          buf[y * W + x] = st.em && st.em[i] ? c : shade(c, l);
        }
      }
    }

    this.ctx.putImageData(this.img, 0, 0);
    this.drawStaff(s, t, bob);
  }

  /** The player's staff, its orb, and the fireball in flight. Drawn at render resolution so it stays pixelated. */
  private drawStaff(s: FrameState, t: number, bob: number) {
    const { ctx, W, H } = this;
    const sway = this.reduceMotion ? 0 : Math.sin(s.moveT * 4.5) * 4;
    const kick = s.castT > 0 ? Math.sin((s.castT / 250) * Math.PI) * 12 : 0;
    const bx = W * 0.66 + sway;
    const by = H + 6 + bob * 2 + kick;
    const tipY = by - H * 0.42;

    ctx.fillStyle = "#3b2412";
    ctx.beginPath();
    ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 8, by); ctx.lineTo(bx - 6, tipY); ctx.lineTo(bx - 14, tipY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5c3a1d";
    ctx.beginPath();
    ctx.moveTo(bx - 2, by); ctx.lineTo(bx + 3, by); ctx.lineTo(bx - 9, tipY); ctx.lineTo(bx - 12, tipY);
    ctx.closePath();
    ctx.fill();

    const ox = bx - 11;
    const oy = by - H * 0.46;
    ctx.fillStyle = "#b8862b";
    ctx.fillRect(ox - 7, oy + 6, 13, 5);

    // gauntlet
    ctx.fillStyle = "#5d626a";
    ctx.fillRect(bx - 14, by - 34, 22, 22);
    ctx.fillStyle = "#8b9199";
    ctx.fillRect(bx - 14, by - 34, 22, 4);
    ctx.fillStyle = "#3c4046";
    ctx.fillRect(bx - 14, by - 24, 22, 2);
    ctx.fillRect(bx - 14, by - 18, 22, 2);

    // orb
    const glow = Math.min(1, 0.55 + Math.sin(t * 0.006) * 0.15 + (s.castT > 0 ? 0.6 : 0));
    const og = ctx.createRadialGradient(ox, oy, 1, ox, oy, 22);
    og.addColorStop(0, `rgba(140,230,255,${glow})`);
    og.addColorStop(1, "rgba(80,120,255,0)");
    ctx.fillStyle = og;
    ctx.fillRect(ox - 24, oy - 24, 48, 48);
    ctx.fillStyle = "#7fe4ff";
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9fdff";
    ctx.fillRect(ox - 3, oy - 4, 3, 3);

    // Muzzle flare on the orb as a fireball leaves it (the fireball itself is a world sprite).
    if (s.castT > 0) {
      const k = s.castT / 320;
      const mf = ctx.createRadialGradient(ox, oy, 0, ox, oy, 26 * k + 6);
      mf.addColorStop(0, "rgba(255,244,192,.95)");
      mf.addColorStop(0.5, "rgba(255,150,40,.6)");
      mf.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = mf;
      ctx.fillRect(ox - 34, oy - 34, 68, 68);
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,150,60,${s.flash * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (s.hurt > 0) {
      ctx.fillStyle = `rgba(190,0,0,${s.hurt * 0.38})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
