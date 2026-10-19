import Lenis from 'lenis';

let instance: Lenis | null = null;
let rafId = 0;
/** Number of overlays (modals, mobile menu) currently asking for a paused page. */
let locks = 0;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whole-page smooth scrolling on every screen size. Disabled entirely under
 * prefers-reduced-motion, where the browser's native scrolling is used.
 *
 * Mouse wheels and trackpads get Lenis's inertial easing. Touch keeps the
 * phone's own momentum scrolling (`syncTouch: false`): that is driven by the
 * compositor at the screen's full frame rate, so it stays smoother than any
 * JavaScript-driven touch scroll, and the scroll-linked parallax, hero
 * scroll-out and 3D camera follow the finger exactly. On phones Lenis still
 * glides in-page anchor links and programmatic scrolls on the same curve as
 * desktop, and pauses the page under menus and dialogs.
 */
export function initLenis(): () => void {
  if (prefersReducedMotion()) return () => {};

  instance = new Lenis({
    duration: 1.15,
    easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
    smoothWheel: true,
    anchors: true,
    syncTouch: false,
  });

  const raf = (time: number) => {
    instance?.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);

  return () => {
    cancelAnimationFrame(rafId);
    instance?.destroy();
    instance = null;
    locks = 0;
  };
}

export const getLenis = () => instance;

/** Pause smooth scroll and lock the page while an overlay is open. */
export function lockScroll() {
  locks += 1;
  if (locks === 1) {
    instance?.stop();
    document.body.style.overflow = 'hidden';
  }
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    instance?.start();
    document.body.style.overflow = '';
  }
}

export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0, { duration: 1.4 });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
