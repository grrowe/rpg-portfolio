/**
 * Dungeon intro: game loop, input, bugs, fireballs, HUD, and the hand-off to the character sheet.
 * Loaded on demand by Dungeon.astro, so visitors who skip it never download it.
 */
import { buildTextures, makeCanvas } from "./textures";
import { BUG_COUNT, DOORS, RELICS, START, cellAt, createBugs, createSprites, lineOfSight } from "./map";
import { Renderer } from "./renderer";
import { melt } from "./melt";
import { AVATAR_EYES, AVATAR_PALETTE, paintAvatar } from "../data/avatar";
import type { Bug, Player, Projectile, Sprite } from "./types";

type Action = "fwd" | "back" | "left" | "right" | "sl" | "sr";
interface Toast {
  msg: string;
  until: number;
  fresh: boolean;
}

const KEYMAP: Record<string, Action> = {
  KeyW: "fwd", ArrowUp: "fwd", KeyS: "back", ArrowDown: "back",
  ArrowLeft: "left", ArrowRight: "right", KeyQ: "left", KeyE: "right",
  KeyA: "sl", KeyD: "sr",
};
const CAST_KEYS = ["Space", "Enter", "KeyF"];

const MOVE_SPEED = 3.1; // tiles/s
const TURN_SPEED = 2.6; // rad/s
const DOOR_REACH = 2.2;
const CAST_COST = 8;
const CAST_COOLDOWN = 0.3; // s
const FIREBALL_SPEED = 7.5; // tiles/s

const BUG_SPEED = 1.15; // a bit slower than you, so you can always back off and shoot
const BUG_SIGHT = 7;
const BUG_REACH = 0.85;
const BUG_DAMAGE = 7;
const BUG_BITE_EVERY = 0.9; // s
const REGEN_DELAY = 3; // s without being bitten before health comes back
const REGEN_RATE = 6; // HP/s

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const el = <T extends HTMLElement = HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} is missing from the page`);
  return e as T;
};

let ui: {
  dungeon: HTMLElement; view: HTMLElement; canvas: HTMLCanvasElement; title: HTMLElement;
  prompt: HTMLElement; toast: HTMLElement; hp: HTMLElement; mana: HTMLElement; relics: HTMLElement;
  bugs: HTMLElement; face: CanvasRenderingContext2D; melt: HTMLCanvasElement; skip: HTMLElement;
} | null = null;
let renderer: Renderer;

const P: Player = { ...START };
let props: Sprite[] = [];
let bugs: Bug[] = [];
let shots: Projectile[] = [];
let booms: Projectile[] = [];
let keys: Partial<Record<Action, boolean>> = {};
let started = false;
let running = false;
let leaving = false;
let hp = 100;
let mana = 100;
let found = 0;
let squashed = 0;
let castT = 0;
let castCD = 0;
let flash = 0;
let hurt = 0;
let sinceBitten = 99;
let moveT = 0;
let turnVel = 0;
let last = 0;
let doorTarget = "";
const toasts: Toast[] = [];

/* ───────── public ───────── */

/** Show the dungeon from the start. Safe to call again from "Re-enter the dungeon". */
export function enter() {
  if (!ui) init();
  const u = ui!;
  props = createSprites();
  bugs = createBugs();
  shots = [];
  booms = [];
  Object.assign(P, START);
  started = false;
  leaving = false;
  found = 0;
  squashed = 0;
  hp = 100;
  mana = 100;
  hurt = 0;
  keys = {};
  toasts.length = 0;
  paintToasts();
  paintHud();
  u.prompt.hidden = true;
  u.title.hidden = false;
  root.classList.add("in-dungeon");
  renderer.resize();
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  u.skip.focus({ preventScroll: true });
}

/* ───────── setup ───────── */

function init() {
  ui = {
    dungeon: el("dungeon"),
    view: el("view"),
    canvas: el<HTMLCanvasElement>("screen"),
    title: el("dungeon-title"),
    prompt: el("prompt"),
    toast: el("toast"),
    hp: el("hp"),
    mana: el("mana"),
    relics: el("relics"),
    bugs: el("bugs"),
    face: el<HTMLCanvasElement>("face").getContext("2d")!,
    melt: el<HTMLCanvasElement>("melt"),
    skip: el("skip"),
  };
  const labels = Object.fromEntries(Object.entries(DOORS).map(([k, d]) => [k, d.label]));
  renderer = new Renderer(ui.canvas, buildTextures(labels), reduceMotion);
  bindInput(ui);
  addEventListener("resize", () => renderer.resize());
}

function bindInput(u: NonNullable<typeof ui>) {
  const active = () => root.classList.contains("in-dungeon") && !leaving;

  addEventListener("keydown", (e) => {
    if (!active()) return;
    if (e.code === "Escape") return leave("top");
    if (!started) {
      if (e.code !== "Tab") {
        e.preventDefault();
        start();
      }
      return;
    }
    const act = KEYMAP[e.code];
    if (act) {
      keys[act] = true;
      e.preventDefault();
    }
    if (CAST_KEYS.includes(e.code)) {
      e.preventDefault();
      cast(); // holding Space keeps firing, limited by the cooldown
    }
  });
  addEventListener("keyup", (e) => {
    const act = KEYMAP[e.code];
    if (act) keys[act] = false;
  });
  addEventListener("blur", () => (keys = {}));

  u.title.addEventListener("click", start);
  u.canvas.addEventListener("click", () => {
    if (!started) return start();
    // Mouse-look is opt-in by clicking the view; browsers only allow pointer lock from a click.
    if (matchMedia("(pointer: fine)").matches && document.pointerLockElement !== u.canvas) {
      u.canvas.requestPointerLock?.()?.catch?.(() => {});
    }
    cast();
  });
  addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== u.canvas || !started || leaving) return;
    P.a += e.movementX * 0.0026;
    turnVel = Math.max(-2, Math.min(2, e.movementX * 0.15));
  });
  u.skip.addEventListener("click", () => leave("top"));

  u.dungeon.querySelectorAll<HTMLElement>("#touch [data-k]").forEach((b) => {
    const k = b.dataset.k as Action | "cast";
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!started) start();
      if (k === "cast") cast();
      else keys[k] = true;
      b.setPointerCapture?.(e.pointerId);
    });
    const up = () => {
      if (k !== "cast") keys[k] = false;
    };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
  });
}

function start() {
  if (started || !ui) return;
  started = true;
  ui.title.hidden = true;
  P.a = START.a;
  toast("Welcome, traveler. Bugs infest this hall. Squash them, or head for the glowing door.");
}

/* ───────── loop ───────── */

function frame(t: number) {
  if (!running) return;
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (started && !leaving) {
    updatePlayer(dt);
    updateBugs(dt);
    updateShots(dt);
  } else if (!started) {
    P.a = START.a + Math.sin(t * 0.0004) * 0.35; // idle look-around behind the title
  }
  renderer.render({ p: P, sprites: [...props, ...bugs, ...shots, ...booms], moveT, castT, flash, hurt }, t);
  drawFace(t);
  castT = Math.max(0, castT - dt * 1000);
  castCD = Math.max(0, castCD - dt);
  flash = Math.max(0, flash - dt * 4);
  hurt = Math.max(0, hurt - dt * 2.5);
  if (toasts.length && toasts[toasts.length - 1].until < t) {
    toasts.pop();
    paintToasts();
  }
  requestAnimationFrame(frame);
}

const wallFree = (x: number, y: number, r: number) =>
  cellAt(x - r, y - r) === "." && cellAt(x + r, y - r) === "." && cellAt(x - r, y + r) === "." && cellAt(x + r, y + r) === ".";

function playerFree(x: number, y: number) {
  if (!wallFree(x, y, 0.22)) return false;
  for (const s of props) if (s.solid && (s.x - x) ** 2 + (s.y - y) ** 2 < 0.2) return false;
  for (const b of bugs) if (b.solid && (b.x - x) ** 2 + (b.y - y) ** 2 < 0.4) return false; // keep bugs at arm's length
  return true;
}

function updatePlayer(dt: number) {
  const u = ui!;
  const fwd = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
  const strafe = (keys.sr ? 1 : 0) - (keys.sl ? 1 : 0);
  const turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  P.a += turn * TURN_SPEED * dt;
  turnVel = turnVel * 0.8 + turn * 0.8;

  const dx = Math.cos(P.a);
  const dy = Math.sin(P.a);
  const sp = MOVE_SPEED * dt;
  const nx = P.x + (dx * fwd - dy * strafe) * sp;
  const ny = P.y + (dy * fwd + dx * strafe) * sp;
  if (fwd || strafe) moveT += dt;
  // Slide along walls by resolving each axis separately.
  if (playerFree(nx, P.y)) P.x = nx;
  if (playerFree(P.x, ny)) P.y = ny;

  mana = Math.min(100, mana + dt * 12);
  sinceBitten += dt;
  if (sinceBitten > REGEN_DELAY) hp = Math.min(100, hp + dt * REGEN_RATE);
  paintHud();

  for (const s of props) {
    if (s.relic === undefined || s.taken || (s.x - P.x) ** 2 + (s.y - P.y) ** 2 > 0.35) continue;
    s.taken = true;
    found++;
    const [name, fact] = RELICS[s.relic];
    toast(`Picked up the ${name}: ${fact}`);
    if (found === RELICS.length) setTimeout(() => toast("All relics found! Your sheet will remember."), 600);
  }

  const hit = renderer.centerHit;
  const door = hit.d < DOOR_REACH ? DOORS[hit.ch] : undefined;
  doorTarget = door?.target ?? "";
  if (door) {
    u.prompt.hidden = false;
    u.prompt.replaceChildren(Object.assign(document.createElement("b"), { textContent: "[SPACE]" }), ` Enter ${door.label}`);
  } else u.prompt.hidden = true;
}

/* ───────── bugs ───────── */

function updateBugs(dt: number) {
  for (const b of bugs) {
    if (b.state === "dead") continue;

    if (b.state === "dying") {
      b.deathT += dt;
      b.tex = "bugHurt";
      b.h = 0.5 * (1 - Math.min(1, b.deathT / 0.3) * 0.7); // squash flat
      if (b.deathT > 0.3) {
        b.state = "dead";
        b.tex = "splat";
        b.h = 0.16;
      }
      continue;
    }

    b.hurtT = Math.max(0, b.hurtT - dt);
    b.biteCD = Math.max(0, b.biteCD - dt);
    const dx = P.x - b.x;
    const dy = P.y - b.y;
    const d = Math.hypot(dx, dy);

    if (b.state === "idle") {
      b.animT += dt * 0.25; // idle twitch
      if (d < BUG_SIGHT && lineOfSight(b.x, b.y, P.x, P.y)) b.state = "chase";
    }
    if (b.state === "chase") {
      if (d > BUG_REACH) {
        const step = (BUG_SPEED * dt) / d;
        const nx = b.x + dx * step;
        const ny = b.y + dy * step;
        if (wallFree(nx, b.y, 0.25) && !crowded(b, nx, b.y)) b.x = nx;
        if (wallFree(b.x, ny, 0.25) && !crowded(b, b.x, ny)) b.y = ny;
        b.animT += dt;
      } else if (b.biteCD === 0) {
        b.biteCD = BUG_BITE_EVERY;
        bitten();
      }
    }
    b.tex = b.hurtT > 0 ? "bugHurt" : ((b.animT * 8) | 0) % 2 ? "bug1" : "bug0";
  }
}

/** Keep bugs from stacking into one sprite. */
function crowded(self: Bug, x: number, y: number) {
  return bugs.some((o) => o !== self && o.solid && (o.x - x) ** 2 + (o.y - y) ** 2 < 0.3);
}

function bitten() {
  hp -= BUG_DAMAGE;
  hurt = 1;
  sinceBitten = 0;
  if (hp > 0) return;
  // No game over: you respawn at the entrance and keep your relics.
  toast("The bugs got you. Respawning at the entrance. (Happens to everyone in prod.)");
  Object.assign(P, START);
  hp = 100;
  for (const b of bugs) if (b.state === "chase") b.state = "idle";
}

/* ───────── fireballs ───────── */

function cast() {
  if (!started || leaving || castCD > 0) return;
  const target = doorTarget;
  if (mana < CAST_COST && !target) return;
  mana = Math.max(0, mana - CAST_COST);
  castT = 320;
  castCD = CAST_COOLDOWN;
  flash = 1;
  const dx = Math.cos(P.a);
  const dy = Math.sin(P.a);
  shots.push({ x: P.x + dx * 0.3, y: P.y + dy * 0.3, dx, dy, tex: "fireball", h: 0.22, lift: 0.34, life: 2 });
  if (target) setTimeout(() => leave(target), reduceMotion ? 0 : 280);
}

function updateShots(dt: number) {
  const next: Projectile[] = [];
  for (const s of shots) {
    s.life -= dt;
    let alive = s.life > 0;
    // Two sub-steps per frame so a fast fireball can't skip through a bug.
    for (let k = 0; k < 2 && alive; k++) {
      s.x += (s.dx * FIREBALL_SPEED * dt) / 2;
      s.y += (s.dy * FIREBALL_SPEED * dt) / 2;
      if (cellAt(s.x, s.y) !== ".") {
        explode(s.x - s.dx * 0.15, s.y - s.dy * 0.15);
        alive = false;
        break;
      }
      const target = bugs.find((b) => (b.state === "idle" || b.state === "chase") && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 < 0.16);
      if (target) {
        explode(s.x, s.y);
        hitBug(target, s);
        alive = false;
      }
    }
    if (alive) next.push(s);
  }
  shots = next;
  booms = booms.filter((b) => (b.life -= dt) > 0);
  for (const b of booms) b.h = 0.45 * (0.6 + b.life * 1.6);
}

function explode(x: number, y: number) {
  booms.push({ x, y, dx: 0, dy: 0, tex: "boom", h: 0.45, lift: 0.18, life: 0.25 });
}

function hitBug(b: Bug, s: Projectile) {
  b.hp--;
  b.hurtT = 0.15;
  b.state = "chase"; // anything you shoot comes for you
  const kx = b.x + s.dx * 0.18;
  const ky = b.y + s.dy * 0.18;
  if (wallFree(kx, ky, 0.25)) {
    b.x = kx;
    b.y = ky;
  }
  if (b.hp > 0) return;
  b.state = "dying";
  b.solid = false;
  squashed++;
  toast(`Squashed the ${b.name}!`);
  if (squashed === BUG_COUNT) setTimeout(() => toast("Zero open bugs. Ship it."), 600);
}

/* ───────── HUD ───────── */

function paintHud() {
  if (!ui) return;
  ui.hp.textContent = `${Math.ceil(hp)}%`;
  ui.mana.textContent = String(mana | 0);
  ui.relics.textContent = `${found}/${RELICS.length}`;
  ui.bugs.textContent = `${squashed}/${BUG_COUNT}`;
}

function toast(msg: string) {
  toasts.unshift({ msg, until: performance.now() + 4200, fresh: true });
  setTimeout(() => toasts[0] && (toasts[0].fresh = false), 900);
  while (toasts.length > 3) toasts.pop();
  paintToasts();
}
function paintToasts() {
  ui?.toast.replaceChildren(...toasts.map((t) => Object.assign(document.createElement("p"), { textContent: t.msg })));
}

/** Graham's portrait with the pupils left blank, painted once and reused every frame. */
let portrait: HTMLCanvasElement | null = null;

/** 32x32 pixel portrait. Eyes glance the way you turn, glasses glint on a pickup, everything flares red when bitten. */
function drawFace(t: number) {
  const g = ui!.face;
  if (!portrait) {
    portrait = makeCanvas(32, 32);
    paintAvatar(portrait.getContext("2d")!, false);
  }
  const jolt = hurt > 0.6 ? 1 : 0;
  g.fillStyle = hurt > 0.6 ? "#3a0d0d" : "#20180f";
  g.fillRect(0, 0, 32, 32);
  g.save();
  g.translate(jolt, 0);
  g.drawImage(portrait, 0, 0);
  const [left, right] = AVATAR_EYES;
  if (hp < 40) {
    // cracked lens when you're hurting
    g.fillStyle = "#f2f2f2";
    g.fillRect(right.x - 1, right.y - 1, 1, 1);
    g.fillRect(right.x, right.y, 1, 1);
    g.fillRect(right.x + 1, right.y - 1, 1, 1);
  }
  const blink = ((t / 2600) | 0) % 7 === 0 && t % 2600 < 120;
  if (!blink) {
    const look = Math.max(-1, Math.min(1, Math.round(turnVel * 1.2)));
    g.fillStyle = hurt > 0.3 ? "#d41f1f" : AVATAR_PALETTE.E;
    for (const e of AVATAR_EYES) g.fillRect(e.x + look, e.y, 1, 1);
  }
  if (toasts[0]?.fresh) {
    // glint across the glasses on a pickup
    g.fillStyle = "#ffe37a";
    g.fillRect(left.x - 2, left.y + 1, 1, 1);
    g.fillRect(right.x - 2, right.y + 1, 1, 1);
  }
  if (hurt > 0.3) {
    g.fillStyle = "rgba(200, 20, 20, 0.25)";
    g.fillRect(0, 0, 32, 32);
  }
  g.restore();
}

/* ───────── exit to the sheet ───────── */

function leave(target: string) {
  if (leaving || !ui) return;
  leaving = true;
  try {
    document.exitPointerLock?.();
  } catch {
    /* not locked */
  }

  // Snapshot the current frame at screen size before hiding the dungeon.
  const view = ui.view.getBoundingClientRect();
  const snap = makeCanvas(innerWidth, innerHeight);
  const sg = snap.getContext("2d")!;
  sg.imageSmoothingEnabled = false;
  sg.fillStyle = "#3d342b";
  sg.fillRect(0, 0, snap.width, snap.height);
  sg.drawImage(ui.canvas, view.left, view.top, view.width, view.height);

  running = false;
  root.classList.remove("in-dungeon");
  const badge = document.getElementById("relicBadge");
  if (badge) {
    const bits = [];
    if (found) bits.push(`relics found: ${found}/${RELICS.length}`);
    if (squashed) bits.push(`bugs squashed: ${squashed}/${BUG_COUNT}`);
    badge.textContent = bits.length ? `· Dungeon ${bits.join(", ")}` : "";
  }
  const section = document.getElementById(target);
  if (section) {
    section.scrollIntoView({ block: "start", behavior: "instant" });
    section.querySelector<HTMLElement>("h1, h2")?.focus({ preventScroll: true });
  }
  melt(snap, ui.melt, reduceMotion);
}
