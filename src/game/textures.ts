/**
 * Every texture and sprite is drawn here with Canvas 2D at startup.
 * No image files, and nothing borrowed from any real game.
 */
import type { Tex } from "./types";

export const TS = 128; // wall/floor texture size (power of two, used as a bitmask)

type Rng = () => number;
type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function ctx2d(c: HTMLCanvasElement): Ctx {
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("Canvas 2D is not available");
  return g;
}
/** Seeded so the dungeon looks the same on every visit. */
const rng = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

function noise(c: HTMLCanvasElement, amt: number, r: Rng) {
  const g = ctx2d(c);
  const d = g.getImageData(0, 0, c.width, c.height);
  const a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 10) continue;
    const n = (r() - 0.5) * amt;
    a[i] += n;
    a[i + 1] += n;
    a[i + 2] += n;
  }
  g.putImageData(d, 0, 0);
}

function bake(c: HTMLCanvasElement, mask: HTMLCanvasElement | null = null, allEmissive = false): Tex {
  const px = new Uint32Array(ctx2d(c).getImageData(0, 0, c.width, c.height).data.buffer);
  let em: Uint8Array | null = null;
  if (mask || allEmissive) {
    em = new Uint8Array(c.width * c.height);
    if (allEmissive) em.fill(1);
    else if (mask) {
      const m = ctx2d(mask).getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < em.length; i++) em[i] = m[i * 4 + 3] > 60 ? 1 : 0;
    }
  }
  return { px, em, w: c.width, h: c.height };
}

function stone(g: Ctx, r: Rng, base: [number, number, number] = [80, 72, 62]) {
  g.fillStyle = "#241f1a";
  g.fillRect(0, 0, TS, TS);
  const bh = 32;
  const bw = 64;
  for (let row = 0; row < TS / bh; row++) {
    const off = (row % 2) * 32;
    for (let col = -1; col <= TS / bw; col++) {
      const x = col * bw + off;
      const y = row * bh;
      const v = (r() - 0.5) * 28;
      g.fillStyle = `rgb(${(base[0] + v) | 0},${(base[1] + v) | 0},${(base[2] + v * 0.8) | 0})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = "rgba(255,236,200,.10)";
      g.fillRect(x + 2, y + 2, bw - 4, 3);
      g.fillStyle = "rgba(0,0,0,.28)";
      g.fillRect(x + 2, y + bh - 6, bw - 4, 4);
      if (r() < 0.35) {
        g.strokeStyle = "rgba(0,0,0,.4)";
        g.lineWidth = 1;
        g.beginPath();
        let cx = x + 10 + r() * (bw - 20);
        let cy = y + 4;
        g.moveTo(cx, cy);
        for (let k = 0; k < 4; k++) {
          cx += (r() - 0.5) * 10;
          cy += 5;
          g.lineTo(cx, cy);
        }
        g.stroke();
      }
    }
  }
}

function texStone(seed: number): Tex {
  const c = makeCanvas(TS, TS);
  const r = rng(seed);
  stone(ctx2d(c), r);
  noise(c, 22, r);
  return bake(c);
}

function texMoss(): Tex {
  const c = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const r = rng(41);
  stone(g, r, [70, 74, 60]);
  for (let k = 0; k < 70; k++) {
    const y = TS - Math.pow(r(), 1.8) * TS;
    const x = r() * TS;
    const rad = 2 + r() * 6;
    g.fillStyle = `rgba(${(50 + r() * 20) | 0},${(88 + r() * 30) | 0},34,.6)`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  noise(c, 20, r);
  return bake(c);
}

function texTorch(frame: 0 | 1): Tex {
  const c = makeCanvas(TS, TS);
  const m = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const q = ctx2d(m);
  const r = rng(11); // same seed for both frames so only the flame moves
  stone(g, r);
  const gl = g.createRadialGradient(64, 44, 4, 64, 50, 70);
  gl.addColorStop(0, `rgba(255,170,70,${frame ? 0.6 : 0.5})`);
  gl.addColorStop(1, "rgba(255,120,40,0)");
  g.fillStyle = gl;
  g.fillRect(0, 0, TS, TS);
  g.fillStyle = "#1b1714";
  g.fillRect(60, 68, 8, 34);
  g.fillRect(50, 98, 28, 6);
  g.beginPath();
  g.moveTo(48, 58);
  g.lineTo(80, 58);
  g.lineTo(73, 70);
  g.lineTo(55, 70);
  g.closePath();
  g.fill();
  const j = frame ? 4 : -3;
  for (const [cc, col] of [[g, "#ff7a14"], [q, "#fff"]] as [Ctx, string][]) {
    cc.fillStyle = col;
    cc.beginPath();
    cc.moveTo(52, 58);
    cc.quadraticCurveTo(50 + j, 36, 64 + j, frame ? 14 : 20);
    cc.quadraticCurveTo(78 + j, 36, 76, 58);
    cc.closePath();
    cc.fill();
  }
  g.fillStyle = "#ffd65a";
  g.beginPath();
  g.ellipse(64 + j * 0.5, 48, 6, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff6d0";
  g.beginPath();
  g.ellipse(64 + j * 0.3, 52, 3, 5, 0, 0, Math.PI * 2);
  g.fill();
  noise(c, 10, r);
  return bake(c, m);
}

function texBanner(): Tex {
  const c = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const r = rng(21);
  stone(g, r);
  g.fillStyle = "#3b2615";
  g.fillRect(26, 6, 76, 6);
  g.fillStyle = "#d4a640";
  g.fillRect(22, 4, 7, 10);
  g.fillRect(99, 4, 7, 10);
  const poly = (pts: [number, number][], col: string) => {
    g.fillStyle = col;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  };
  poly([[34, 12], [94, 12], [94, 118], [64, 102], [34, 118]], "#d4a640");
  poly([[38, 12], [90, 12], [90, 110], [64, 96], [38, 110]], "#7c1515");
  g.fillStyle = "rgba(0,0,0,.18)";
  for (let x = 44; x < 90; x += 10) g.fillRect(x, 12, 3, 90);
  g.fillStyle = "#e3b448";
  g.font = "bold 24px monospace";
  g.textAlign = "center";
  g.fillText("</>", 64, 62);
  g.fillRect(50, 72, 28, 3);
  noise(c, 12, r);
  return bake(c);
}

function texDoor(label: string, great: boolean, seed: number): Tex {
  const c = makeCanvas(TS, TS);
  const m = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const q = ctx2d(m);
  const r = rng(seed);
  stone(g, r);
  const arch = (cc: Ctx, inset: number) => {
    cc.beginPath();
    cc.moveTo(14 + inset, 128);
    cc.lineTo(14 + inset, 52);
    cc.arc(64, 52, 50 - inset, Math.PI, 0);
    cc.lineTo(114 - inset, 128);
    cc.closePath();
  };
  g.fillStyle = "#1d1915";
  arch(g, 0);
  g.fill();
  g.save();
  arch(g, 6);
  g.clip();
  for (let i = 0; i < 6; i++) {
    const x = 20 + i * 15;
    g.fillStyle = great ? (i % 2 ? "#3a2a4a" : "#33243f") : i % 2 ? "#5e3d20" : "#4f331b";
    g.fillRect(x, 0, 15, 128);
    g.fillStyle = "rgba(0,0,0,.5)";
    g.fillRect(x, 0, 1.5, 128);
    g.fillStyle = "rgba(0,0,0,.15)";
    for (let k = 0; k < 5; k++) g.fillRect(x + 2 + r() * 11, 0, 1, 128);
  }
  g.restore();
  g.fillStyle = "#24211f";
  g.fillRect(20, 44, 88, 6);
  g.fillRect(20, 106, 88, 6);
  g.fillStyle = "#7d766f";
  for (let x = 24; x < 106; x += 14) {
    g.fillRect(x, 46, 2, 2);
    g.fillRect(x, 108, 2, 2);
  }
  g.strokeStyle = "#151311";
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(94, 88, 5, 0, Math.PI * 2);
  g.stroke();

  if (great) {
    // Glowing arch and compass-rose sigil, drawn on the mask too so they ignore lighting.
    for (const [cc, col, w] of [[g, "#5fe3ff", 2.5], [q, "#fff", 4]] as [Ctx, string, number][]) {
      cc.strokeStyle = col;
      cc.lineWidth = w;
      cc.beginPath();
      cc.arc(64, 52, 47, Math.PI, 0);
      cc.stroke();
      cc.beginPath();
      cc.arc(64, 80, 15, 0, Math.PI * 2);
      cc.stroke();
      cc.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 8;
        const rr = k % 4 === 0 ? 13 : k % 2 === 0 ? 7 : 3.5;
        const x = 64 + Math.cos(a) * rr;
        const y = 80 + Math.sin(a) * rr;
        if (k) cc.lineTo(x, y);
        else cc.moveTo(x, y);
      }
      cc.closePath();
      cc.stroke();
      cc.fillStyle = col;
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k * Math.PI) / 8;
        cc.fillRect(64 + Math.cos(a) * 47 - 2, 52 + Math.sin(a) * 47 - 2, 4, 4);
      }
    }
  } else {
    g.fillStyle = "#7a5a22";
    g.fillRect(26, 62, 76, 20);
    g.fillStyle = "#d9b45a";
    g.fillRect(28, 64, 72, 16);
    g.fillStyle = "#2b1d10";
    g.textAlign = "center";
    const text = label.replace("THE ", "");
    let fs = 12;
    do g.font = `bold ${fs}px monospace`;
    while (g.measureText(text).width > 66 && --fs > 6);
    g.fillText(text, 64, 76);
  }
  noise(c, 12, r);
  return bake(c, great ? m : null);
}

function texFloor(): Tex {
  const c = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const r = rng(51);
  g.fillStyle = "#17130f";
  g.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const v = (r() - 0.5) * 22;
      g.fillStyle = `rgb(${(66 + v) | 0},${(60 + v) | 0},${(52 + v) | 0})`;
      g.fillRect(i * 32 + 2 + ((r() * 2) | 0), j * 32 + 2 + ((r() * 2) | 0), 27, 27);
      g.fillStyle = "rgba(255,240,210,.07)";
      g.fillRect(i * 32 + 3, j * 32 + 3, 25, 2);
    }
  noise(c, 26, r);
  return bake(c);
}

function texCeiling(): Tex {
  const c = makeCanvas(TS, TS);
  const g = ctx2d(c);
  const r = rng(61);
  for (let y = 0; y < TS; y += 16) {
    g.fillStyle = (y / 16) % 2 ? "#3a2819" : "#33231a";
    g.fillRect(0, y, TS, 16);
    g.fillStyle = "rgba(0,0,0,.5)";
    g.fillRect(0, y, TS, 1.5);
  }
  g.fillStyle = "#1d140d";
  g.fillRect(0, 0, TS, 14);
  g.fillRect(0, 64, TS, 14);
  noise(c, 18, r);
  return bake(c);
}

function sprRelic(): Tex {
  const c = makeCanvas(64, 96);
  const g = ctx2d(c);
  const gr = g.createLinearGradient(16, 8, 48, 88);
  gr.addColorStop(0, "#d6fbff");
  gr.addColorStop(0.5, "#58c8f0");
  gr.addColorStop(1, "#6a2fd6");
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(32, 6);
  g.lineTo(50, 40);
  g.lineTo(32, 90);
  g.lineTo(14, 40);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(255,255,255,.55)";
  g.beginPath();
  g.moveTo(32, 6);
  g.lineTo(32, 90);
  g.lineTo(14, 40);
  g.closePath();
  g.fill();
  g.strokeStyle = "#e8fdff";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(14, 40);
  g.lineTo(50, 40);
  g.stroke();
  g.fillStyle = "#fff";
  for (const [x, y] of [[8, 20], [56, 28], [10, 66], [54, 72]]) {
    g.fillRect(x - 1, y - 3, 2, 6);
    g.fillRect(x - 3, y - 1, 6, 2);
  }
  return bake(c, null, true);
}

function sprKnight(): Tex {
  const c = makeCanvas(80, 128);
  const g = ctx2d(c);
  const r = rng(71);
  const steel = (x0: number, x1: number) => {
    const s = g.createLinearGradient(x0, 0, x1, 0);
    s.addColorStop(0, "#aeb4bc");
    s.addColorStop(0.5, "#6d727a");
    s.addColorStop(1, "#3e4248");
    return s;
  };
  g.fillStyle = "#4a443c";
  g.fillRect(8, 112, 64, 16);
  g.fillStyle = "#5c554b";
  g.fillRect(8, 112, 64, 3);
  g.fillStyle = steel(24, 56);
  g.fillRect(27, 74, 11, 38);
  g.fillRect(42, 74, 11, 38);
  g.fillStyle = steel(18, 62);
  g.beginPath();
  g.moveTo(22, 38);
  g.lineTo(58, 38);
  g.lineTo(54, 78);
  g.lineTo(26, 78);
  g.closePath();
  g.fill();
  g.fillStyle = steel(10, 30);
  g.beginPath();
  g.ellipse(20, 42, 10, 8, 0, 0, Math.PI * 2);
  g.ellipse(60, 42, 10, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = steel(28, 52);
  g.beginPath();
  g.moveTo(29, 14);
  g.quadraticCurveTo(40, 4, 51, 14);
  g.lineTo(51, 36);
  g.lineTo(29, 36);
  g.closePath();
  g.fill();
  g.fillStyle = "#0b0b0b";
  g.fillRect(31, 22, 18, 3);
  g.fillRect(39, 25, 2, 8);
  g.fillStyle = "#9a1c1c";
  g.beginPath();
  g.moveTo(40, 8);
  g.quadraticCurveTo(52, -2, 62, 12);
  g.quadraticCurveTo(50, 6, 42, 12);
  g.fill();
  g.fillStyle = "#cfd5dc";
  g.fillRect(38, 40, 4, 66);
  g.fillStyle = "#b8862b";
  g.fillRect(30, 58, 20, 4);
  g.fillRect(37, 48, 6, 10);
  noise(c, 10, r);
  return bake(c);
}

/**
 * Giant beetle seen head-on: shell behind, head in front, three legs a side.
 * Two walk frames swap which legs are raised; the hurt frame is a white flash.
 */
function sprBug(frame: 0 | 1, hurt = false): Tex {
  const c = makeCanvas(64, 48);
  const m = makeCanvas(64, 48);
  const g = ctx2d(c);
  const q = ctx2d(m);
  const ink = hurt ? "#ffffff" : "#140d0a";

  // legs
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const y = 22 + i * 6;
    const up = (i % 2 === frame ? -1 : 1) * 3;
    g.beginPath();
    g.moveTo(20, y); g.lineTo(8, y - 3 + up); g.lineTo(3, 45 + up * 0.5);
    g.moveTo(44, y); g.lineTo(56, y - 3 - up); g.lineTo(61, 45 - up * 0.5);
    g.stroke();
  }

  // shell
  const sh = g.createRadialGradient(26, 12, 2, 32, 20, 24);
  sh.addColorStop(0, hurt ? "#ffffff" : "#a368c9");
  sh.addColorStop(0.55, hurt ? "#ffe0e0" : "#5b2a7d");
  sh.addColorStop(1, hurt ? "#ffb0b0" : "#26102f");
  g.fillStyle = sh;
  g.beginPath();
  g.ellipse(32, 22, 21, 15, 0, 0, Math.PI * 2);
  g.fill();
  if (!hurt) {
    g.strokeStyle = "rgba(0,0,0,.55)";
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(32, 8); g.lineTo(32, 34); g.stroke();
    g.fillStyle = "rgba(200,160,255,.35)";
    for (const [x, y] of [[22, 16], [41, 15], [25, 26], [39, 27]]) {
      g.beginPath(); g.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // antennae
  g.strokeStyle = ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(28, 30); g.quadraticCurveTo(20, 14, 13, 6 + frame * 2);
  g.moveTo(36, 30); g.quadraticCurveTo(44, 14, 51, 6 + (1 - frame) * 2);
  g.stroke();

  // head + mandibles
  g.fillStyle = hurt ? "#ffffff" : "#1d0f24";
  g.beginPath();
  g.ellipse(32, 34, 11, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = hurt ? "#ffffff" : "#c9a24a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(27, 40); g.quadraticCurveTo(25, 46, 30, 46);
  g.moveTo(37, 40); g.quadraticCurveTo(39, 46, 34, 46);
  g.stroke();

  // glowing eyes (emissive)
  for (const cc of [g, q]) {
    cc.fillStyle = cc === g ? (hurt ? "#ff7070" : "#ff3b2f") : "#fff";
    cc.beginPath();
    cc.arc(27, 33, 2.6, 0, Math.PI * 2);
    cc.arc(37, 33, 2.6, 0, Math.PI * 2);
    cc.fill();
  }
  return bake(c, m);
}

/** What's left of a squashed bug. */
function sprSplat(): Tex {
  const c = makeCanvas(64, 20);
  const g = ctx2d(c);
  const r = rng(91);
  g.fillStyle = "#3d7a2a";
  g.beginPath();
  g.ellipse(32, 13, 26, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#26102f";
  for (let k = 0; k < 7; k++) {
    g.beginPath();
    g.ellipse(14 + r() * 36, 9 + r() * 8, 2 + r() * 5, 1.5 + r() * 2, r(), 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#7fcf4a";
  for (let k = 0; k < 6; k++) g.fillRect(6 + r() * 52, 4 + r() * 14, 2, 2);
  return bake(c);
}

function sprFireball(): Tex {
  const c = makeCanvas(32, 32);
  const g = ctx2d(c);
  const f = g.createRadialGradient(16, 16, 0, 16, 16, 15);
  f.addColorStop(0, "#fffbe0");
  f.addColorStop(0.35, "#ffd04a");
  f.addColorStop(0.75, "#ff7a14");
  f.addColorStop(1, "rgba(200,40,0,0)");
  g.fillStyle = f;
  g.beginPath();
  g.arc(16, 16, 15, 0, Math.PI * 2);
  g.fill();
  return bake(c, null, true);
}

function sprBoom(): Tex {
  const c = makeCanvas(48, 48);
  const g = ctx2d(c);
  const r = rng(101);
  for (const [rad, col] of [[23, "#ff6a10"], [15, "#ffc23a"], [7, "#fff7d0"]] as [number, string][]) {
    g.fillStyle = col;
    g.beginPath();
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      const rr = k % 2 ? rad : rad * (0.45 + r() * 0.2);
      const x = 24 + Math.cos(a) * rr;
      const y = 24 + Math.sin(a) * rr;
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  }
  return bake(c, null, true);
}

/** Keys match map characters, plus torch frames, floor, ceiling and sprite names. */
export function buildTextures(doorLabels: Record<string, string>): Record<string, Tex> {
  return {
    "#": texStone(1),
    p: texMoss(),
    t0: texTorch(0),
    t1: texTorch(1),
    b: texBanner(),
    G: texDoor("", true, 81),
    Q: texDoor(doorLabels.Q, false, 82),
    A: texDoor(doorLabels.A, false, 83),
    S: texDoor(doorLabels.S, false, 84),
    T: texDoor(doorLabels.T, false, 85),
    floor: texFloor(),
    ceil: texCeiling(),
    relic: sprRelic(),
    knight: sprKnight(),
    bug0: sprBug(0),
    bug1: sprBug(1),
    bugHurt: sprBug(0, true),
    splat: sprSplat(),
    fireball: sprFireball(),
    boom: sprBoom(),
  };
}
