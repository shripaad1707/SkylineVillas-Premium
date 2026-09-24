/**
 * Fetch and decode photographs before the scroll reaches them.
 *
 * A large photo costs two things at the moment it first appears: the download,
 * and a JPEG decode. `loading="lazy"` defers both until the image is nearly in
 * view, which means both land in the middle of the scroll that revealed it —
 * and in the horizontal strip they land while that section is also running a
 * scroll-linked transform and rasterising a very wide composited layer.
 *
 * Warming them moves that work to a moment when nothing is animating. Nothing
 * about the markup or the appearance changes; the browser simply finds the
 * bytes in cache and the bitmap already decoded.
 *
 * `decode()` runs off the main thread in Chromium and Safari, and the images
 * are warmed one at a time so a slow decode can never occupy a long block.
 */

const warmed = new Set<string>();

/** Skip warming on metered or slow connections, where the bytes cost more than the jank. */
function shouldSkip(): boolean {
  const conn = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return /(^|-)2g$/.test(conn.effectiveType || '');
}

const idle = (fn: () => void) =>
  'requestIdleCallback' in window
    ? (window as any).requestIdleCallback(fn, { timeout: 2000 })
    : setTimeout(fn, 1);

export function warmImages(srcs: string[]): void {
  if (typeof window === 'undefined' || shouldSkip()) return;

  const queue = srcs.filter((src) => !warmed.has(src));
  if (!queue.length) return;
  queue.forEach((src) => warmed.add(src));

  const next = () => {
    const src = queue.shift();
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const done = () => idle(next);
    if (img.decode) {
      img.decode().then(done, done);
    } else {
      img.onload = done;
      img.onerror = done;
    }
  };

  idle(next);
}
