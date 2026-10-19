import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE } from '../motion/tokens.ts';
import { getLenis } from '../motion/lenis.ts';
import { isIntroDone, markIntroDone } from '../motion/intro.ts';

const SEEN = 'sv-intro-seen';

/**
 * Opening sequence. The wordmark resolves while the hero photograph and fonts
 * load, a gold hairline tracks real progress, then the curtain lifts and the
 * hero entrance plays. Shown once per visit; skipped entirely under reduced
 * motion. It never waits longer than ~3.2s, however slow the connection.
 */
function shouldShow() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (window.sessionStorage.getItem(SEEN)) return false;
  } catch {
    /* storage blocked: show it */
  }
  return true;
}

export const Preloader: React.FC = () => {
  const [visible] = useState(shouldShow);
  const [active, setActive] = useState(visible);
  const [progress, setProgress] = useState(0);
  const target = useRef(0);

  // Without the sequence, the hero plays straight away.
  useEffect(() => {
    if (!visible && !isIntroDone()) markIntroDone();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const started = performance.now();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    // Hold Lenis still while the curtain is down.
    let stopRaf = requestAnimationFrame(function hold() {
      getLenis()?.stop();
      stopRaf = requestAnimationFrame(hold);
    });

    const isPhone = window.matchMedia('(max-width: 767px)').matches;
    const heroSrc = isPhone ? '/images/skyline-hero-mobile.jpg' : '/images/skyline-hero.jpg';
    const hero = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        target.current = Math.max(target.current, 0.7);
        (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => resolve());
      };
      img.onerror = () => resolve();
      img.src = heroSrc;
    });
    const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => {
      target.current = Math.max(target.current, 0.35);
    });

    // The displayed figure eases towards what has actually loaded, creeping
    // forward on its own so a slow connection still feels alive.
    let raf = requestAnimationFrame(function tick() {
      const elapsed = (performance.now() - started) / 1000;
      const creep = Math.min(0.9, 0.18 + elapsed * 0.32);
      const goal = Math.max(target.current, Math.min(creep, 0.9));
      setProgress((p) => p + (goal - p) * 0.12);
      raf = requestAnimationFrame(tick);
    });

    let cancelled = false;
    const minTime = new Promise((r) => setTimeout(r, 1250));
    const maxTime = new Promise((r) => setTimeout(r, 3200));
    Promise.race([Promise.all([hero, fonts, minTime]), maxTime]).then(async () => {
      if (cancelled) return;
      target.current = 1;
      await new Promise((r) => setTimeout(r, 380));
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(SEEN, '1');
      } catch {
        /* ignore */
      }
      cancelAnimationFrame(raf);
      setProgress(1);
      cancelAnimationFrame(stopRaf);
      root.style.overflow = prevOverflow;
      getLenis()?.start();
      markIntroDone();
      setActive(false);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(stopRaf);
      root.style.overflow = prevOverflow;
    };
  }, [visible]);

  if (!visible) return null;
  const pct = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="preloader"
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0B0A09] text-[#F3EFEA]"
          exit={{ y: '-100%' }}
          transition={{ duration: 1.05, ease: EASE }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,rgba(197,168,128,0.10)_0%,rgba(11,10,9,0)_70%)]" />

          <motion.div
            className="relative flex flex-col items-center px-6"
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <motion.p
              className="font-display text-[clamp(1.6rem,5vw,2.7rem)] uppercase leading-none"
              initial={{ opacity: 0, letterSpacing: '0.62em', filter: 'blur(6px)' }}
              animate={{ opacity: 1, letterSpacing: '0.24em', filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: EASE }}
              style={{ marginRight: '-0.24em' }}
            >
              Skyline Villas
            </motion.p>

            <motion.p
              className="mt-4 text-[10.5px] uppercase tracking-[0.34em] text-[#F3EFEA]/45"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.45, ease: EASE }}
            >
              Private residences · Hyderabad
            </motion.p>

            <div className="mt-10 w-[min(220px,56vw)]">
              <div className="relative h-px w-full overflow-hidden bg-[#F3EFEA]/12">
                <div
                  className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-[#8E7550] via-[#C5A880] to-[#E9D6B4]"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.24em] text-[#F3EFEA]/40">
                <span>Loading</span>
                <span className="tabular">{String(pct).padStart(2, '0')}%</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
