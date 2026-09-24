import type { Transition, Variants } from 'motion/react';

/** Single easing curve for the whole site: a slow, decelerating "expo out". */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Duration tokens, in seconds. */
export const DUR = {
  quick: 0.6,
  base: 0.9,
  slow: 1.3,
  settle: 2.6,
} as const;

/** Every scroll reveal fires once, when 25% of the element is in view. */
export const VIEWPORT = { once: true, amount: 0.25 } as const;

/** Slightly earlier trigger for the image curtain (20% in view). */
export const VIEWPORT_IMAGE = { once: true, amount: 0.2 } as const;

export const transition = (duration: number = DUR.base, delay = 0): Transition => ({
  duration,
  delay,
  ease: EASE,
});

/** Fade up: opacity 0 -> 1, y 18px -> 0. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};
