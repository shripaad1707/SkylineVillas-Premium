import Lenis from 'lenis';

let instance: Lenis | null = null;
let rafId = 0;
/** Number of overlays (modals, mobile menu) currently asking for a paused page. */
let locks = 0;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isPhone = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

/**
 * Whole-page inertial smooth scrolling for wheel input. Disabled entirely under
 * prefers-reduced-motion, where the browser's native scrolling is used.
 *
 * Phones opt out completely. `syncTouch` cancels the platform's own scrolling
 * and re-drives the page from JavaScript, so every frame of every swipe had to
 * wait behind React, fifteen scroll-linked parallax layers and the WebGL loop —
 * which is what made phone scrolling feel heavy and made the scroll-linked
 * animations lag behind the finger. Nothing here reads Lenis for its progress:
 * the parallax, the hero scroll-out and the 3D camera all read the real
 * document scroll position, so they run identically on native scrolling, now
 * driven by the compositor at the platform's own frame rate. Anchors fall back
 * to CSS `scroll-behavior: smooth`. Tablets and desktops are untouched.
 */
export function initLenis(): () => void {
  if (prefersReducedMotion() || isPhone()) return () => {};

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
