/**
 * 32x32 pixel-art portrait of Graham as a mage, hand-drawn from a photo.
 * One character per pixel; "." is transparent. Used by the sheet header (as an SVG)
 * and the dungeon HUD face (drawn to a canvas, with animated eyes).
 */
export const AVATAR_PALETTE: Record<string, string> = {
  H: "#8a3a1c", // hair
  S: "#eab996", // skin
  s: "#c98f6c", // skin shadow
  G: "#17110d", // glasses frame
  E: "#3a2618", // eye
  B: "#a8431f", // beard
  R: "#c95d2c", // beard highlight
  b: "#7a2d15", // beard shadow
  T: "#f6f1e7", // teeth
  m: "#8f3f30", // lip
  P: "#3d2a6b", // hat & robe
  p: "#2a1c4d", // hat & robe shadow
  Q: "#5a409a", // hat & robe highlight
  Y: "#e3b448", // gold trim
  y: "#b8862b", // gold shadow
  A: "#fff2b0", // star
  V: "#4fd0e8", // amulet gem
};

export const AVATAR_ROWS = [
  "....................Pp..........",
  ".................PPPp...........",
  "...............QPPPp............",
  ".............QPPAPPpp...........",
  "............QPPPPPPpp...........",
  "...........QPPPPPPPpp...........",
  "..........QQPPPAPPPPpp..........",
  ".........YYYYYYYYYYYYYY.........",
  "....pPPPPPPPPPPPPPPPPPPPPPPp....",
  ".......HHSSSSSSSSSSSSSSHH.......",
  "......sHGGGGGGGGGGGGGGGGHs......",
  "......sHGSSESSGSSGSSESSGHs......",
  "......sHGSSSSSGSSGSSSSSGHs......",
  "......sBGGGGGGGSSGGGGGGGBs......",
  ".......BSSSSSSSssSSSSSSSB.......",
  ".......BBSSSSSSssSSSSSSBB.......",
  ".......BBBBSSSSSSSSSSBBBB.......",
  ".......BBBBRRBBBBBBRRBBBB.......",
  ".......BBBBmTTTTTTTTmBBBB.......",
  ".......BBBBBBmmmmmmBBBBBB.......",
  ".......BBBBBBBBBBBBBBBBBB.......",
  ".......BBBRBBBBBBBBBBRBBB.......",
  "........BBBBBBBBBBBBBBBB........",
  "........BBBBBBRBBRBBBBBB........",
  "...PPPPPbBBBBBBBBBBBBBBbPPPPP...",
  "..PQQPPPPbBBBBBBBBBBBBbPPPPPPP..",
  ".PPPPPPPPYbBBBBBBBBBBbYPPPPPPPP.",
  ".PPPAPPPPPYbbBBBBBBbbYPPPPPPPPP.",
  "PPPPPPPPPPYppbbBBbbppYPPPPPPPPPP",
  "PPPPPPPPPPPYpppyypppYPPPPPPPPPPP",
  "PPPPPPPPPPPPYppVVppYPPPPPPPPPPPP",
  "PPPPPPPPPPPPPYpyypYPPPPPPPPPPPPP",
];

/** Where the pupils sit, so the HUD can move them. */
export const AVATAR_EYES = [
  { x: 11, y: 11 },
  { x: 20, y: 11 },
];

/** Horizontal runs of one colour: [colourKey, x, y, width]. */
function runs(rows: string[]) {
  const out: [string, number, number, number][] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; ) {
      let w = 1;
      while (r[x + w] === r[x]) w++;
      if (r[x] !== ".") out.push([r[x], x, y, w]);
      x += w;
    }
  });
  return out;
}

/** The portrait as a crisp SVG string (one path per colour). */
export function avatarSvg(): string {
  const paths: Record<string, string> = {};
  for (const [c, x, y, w] of runs(AVATAR_ROWS)) paths[c] = (paths[c] ?? "") + `M${x} ${y}h${w}v1h-${w}z`;
  const body = Object.entries(paths)
    .map(([c, d]) => `<path fill="${AVATAR_PALETTE[c]}" d="${d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>`;
}

/** Paint the portrait onto a canvas; `eyesOpen: false` fills the pupils with skin so they can be drawn per frame. */
export function paintAvatar(g: CanvasRenderingContext2D, eyesOpen = true) {
  for (const [c, x, y, w] of runs(AVATAR_ROWS)) {
    g.fillStyle = AVATAR_PALETTE[c === "E" && !eyesOpen ? "S" : c];
    g.fillRect(x, y, w, 1);
  }
}
