/**
 * The classic screen melt: the last frame of the dungeon drips away in uneven columns,
 * revealing the character sheet already sitting underneath.
 */
export function melt(snapshot: HTMLCanvasElement, overlay: HTMLCanvasElement, reduceMotion: boolean) {
  if (reduceMotion) return;
  overlay.width = snapshot.width;
  overlay.height = snapshot.height;
  overlay.hidden = false;
  const g = overlay.getContext("2d");
  if (!g) {
    overlay.hidden = true;
    return;
  }
  g.drawImage(snapshot, 0, 0);

  const cols = 100;
  const cw = Math.ceil(snapshot.width / cols);
  const off = new Float32Array(cols);
  // Neighbouring columns start at similar heights, so the edge looks like dripping, not noise.
  off[0] = -Math.random() * 60;
  for (let i = 1; i < cols; i++) off[i] = Math.max(-90, Math.min(0, off[i - 1] + (Math.random() * 2 - 1) * 18));

  let prev = performance.now();
  const step = (now: number) => {
    const k = Math.min(3, (now - prev) / 16.7);
    prev = now;
    let done = true;
    g.clearRect(0, 0, overlay.width, overlay.height);
    for (let i = 0; i < cols; i++) {
      off[i] += off[i] < 0 ? 6 * k : Math.max(8, off[i] * 0.09) * k;
      if (off[i] < overlay.height) {
        done = false;
        g.drawImage(snapshot, i * cw, 0, cw, overlay.height, i * cw, Math.max(0, off[i]), cw, overlay.height);
      }
    }
    if (done) overlay.hidden = true;
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
