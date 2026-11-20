# rpg-portfolio

Graham Rowe's portfolio: a D&D-inspired character sheet with an optional Doom-style first-person dungeon intro.

- **Astro**, static output. The sheet is plain HTML and CSS. The only client JS is small scripts for the dice and the XP bar.
- **The dungeon** is a hand-written raycaster in `src/game/`: Canvas 2D, no engine, no libraries, and every texture is drawn in code. It's code-split and only downloaded when the intro actually plays.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
npm run format    # prettier
```

Needs Node 20.3+ (22 recommended).

## Where things live

| Path | What |
| --- | --- |
| `src/data/sheet.ts` | **All content.** Edit this, not the components. |
| `src/data/avatar.ts` | The 32×32 pixel portrait (one character per pixel). The sheet header and the dungeon HUD face both draw from it. |
| `src/components/` | One component per sheet section, plus `Dungeon.astro`. `Chronicles.astro` (projects) is parked and not on the page. |
| `src/game/` | The raycaster: `map.ts` (level, doors, relics), `textures.ts`, `renderer.ts`, `melt.ts`, `main.ts` (loop + input) |
| `src/styles/` | `global.css` (sheet) and `dungeon.css` (intro) |
| `public/` | Favicon, robots.txt, sitemap.xml |

### Placeholders to set in `src/data/sheet.ts`

- Ability `score`s (self-assessed)
- Proficiency levels (`2` = expertise, `1` = proficient)
- `SLOTS.open`: how many freelance slots are open this month
- The project link for "This site" once the repo is public

## How the intro behaves

- It plays on the home page unless the URL has a section hash (`/#tavern`, `/#quest-log`, …). Deep links go straight to content.
- **Skip** and **Esc** always work. **Re-enter the dungeon** in the header replays it.
- Each door scrolls to its section: Great Door → top, Quest Log, Armory, Spellbook, Tavern.
- Four bugs (Off-By-One, Race Condition, Memory Leak, Null Pointer) chase you once they see you. Two fireballs squash one. They bite, but there's no game over: at 0 HP you respawn at the entrance and keep your relics. Tune them at the top of `src/game/main.ts` and place them in `src/game/map.ts`.
- `prefers-reduced-motion` turns off head bob, the screen melt and the dice tumble.
- Without JavaScript the intro never shows and the sheet works normally.

## Deploy

`.github/workflows/deploy.yml` uses the same release → Lightsail flow as the old site. Add the same secrets to this repo.

### Redirects from the old site

`astro.config.mjs` maps the old routes (`/my-creds`, `/projects`, `/contact`, `/about`) to sections. A static build turns those into meta-refresh pages. For real 301s, also add this to the nginx server block:

```nginx
location = /my-creds { return 301 /#quest-log; }
location = /projects { return 301 /#quest-log; }
location = /contact  { return 301 /#tavern; }
location = /about    { return 301 /; }
error_page 404 /404.html;
```

