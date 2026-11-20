import type { Bug, Sprite } from "./types";

/**
 * 16x16 level. "." is floor, everything else is a wall:
 *   #  stone      p  mossy pillar   t  torch      b  banner
 *   G  great door (character sheet)  Q A S T  side doors
 */
export const MAP = [
  "################",
  "######bGb#######",
  "###.........####",
  "##t..p...p..t###",
  "##Q.........A###",
  "##t.........t###",
  "##S..p...p..T###",
  "###.........####",
  "#######.########",
  "######t.t#######",
  "#######.########",
  "######b.b#######",
  "#######.########",
  "######t.t#######",
  "#######.########",
  "################",
];

export const START = { x: 7.5, y: 14.4, a: -Math.PI / 2 };

export interface Door {
  label: string;
  /** Section id on the character sheet. */
  target: string;
}
export const DOORS: Record<string, Door> = {
  G: { label: "THE CHARACTER SHEET", target: "top" },
  Q: { label: "THE QUEST LOG", target: "quest-log" },
  A: { label: "THE ARMORY", target: "armory" },
  S: { label: "THE SPELLBOOK", target: "spellbook" },
  T: { label: "THE TAVERN", target: "tavern" },
};

/** Each relic carries one real fact from the resume. */
export const RELICS: [string, string][] = [
  ["Relic of Six Winters", "6+ years shipping production software."],
  ["Amulet of Uptime", "120+ customer incidents resolved a week at Aptible."],
  ["Banner of Ten Thousand", "Scaled IVM's Vue frontend from 5,000 to 10,000 daily users."],
  ["Sigil of Integration", "HR, payroll and benefits integrations at Remodel Health."],
  ["Tome of TypeScript", "Legendary. Never leaves home without it."],
];

export function createSprites(): Sprite[] {
  const relic = (x: number, y: number, i: number): Sprite => ({ x, y, tex: "relic", h: 0.42, lift: 0.22, relic: i });
  return [
    { x: 3.5, y: 2.5, tex: "knight", h: 1, solid: true },
    { x: 11.5, y: 2.5, tex: "knight", h: 1, solid: true },
    relic(7.5, 10.5, 0),
    relic(4.5, 4.5, 1),
    relic(10.5, 4.5, 2),
    relic(3.5, 7.5, 3),
    relic(11.5, 7.5, 4),
  ];
}

/** One in the corridor as a first encounter, two in the hall, one guarding the great door. */
const BUG_SPAWNS: [number, number, string][] = [
  [7.5, 9.3, "Off-By-One"],
  [5.5, 5.2, "Race Condition"],
  [9.5, 5.2, "Memory Leak"],
  [7.5, 3.4, "Null Pointer"],
];
export const BUG_COUNT = BUG_SPAWNS.length;

export function createBugs(): Bug[] {
  return BUG_SPAWNS.map(([x, y, name], i) => ({
    x, y, name,
    tex: "bug0", h: 0.5, solid: true,
    hp: 2, state: "idle", hurtT: 0, animT: i * 0.3, biteCD: 0, deathT: 0,
  }));
}

/** True when nothing but floor lies between two points. Cheap ray march, plenty for a 16x16 map. */
export function lineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (cellAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) !== ".") return false;
  }
  return true;
}

export function cellAt(x: number, y: number): string {
  if (y < 0 || y >= MAP.length || x < 0 || x >= 16) return "#";
  return MAP[y | 0][x | 0];
}
