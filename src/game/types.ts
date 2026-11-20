export interface Player {
  x: number;
  y: number;
  /** Facing angle in radians. 0 = east, -PI/2 = north (map y grows downward). */
  a: number;
}

export interface Sprite {
  x: number;
  y: number;
  tex: string;
  /** Height in wall units (1 = full wall). */
  h: number;
  /** How far the bottom floats above the floor, in wall units. */
  lift?: number;
  /** Index into RELICS when this sprite is a collectible. */
  relic?: number;
  solid?: boolean;
  taken?: boolean;
}

export type BugState = "idle" | "chase" | "dying" | "dead";

/** A "bug": the dungeon's monster. Crawls toward you once it sees you, bites when close. */
export interface Bug extends Sprite {
  name: string;
  hp: number;
  state: BugState;
  /** Seconds left on the white hit-flash. */
  hurtT: number;
  /** Drives the two-frame leg animation. */
  animT: number;
  /** Seconds until it can bite again. */
  biteCD: number;
  deathT: number;
}

/** A fireball in flight, or a short-lived explosion when `life` is all that matters. */
export interface Projectile extends Sprite {
  dx: number;
  dy: number;
  life: number;
}

export interface Tex {
  px: Uint32Array;
  /** 1 = emissive pixel (ignores lighting). null = nothing glows. */
  em: Uint8Array | null;
  w: number;
  h: number;
}
