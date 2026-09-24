import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/**
 * A 1px x 40px vertical track at 20% opacity. Inside it a segment half its
 * height, at 80% opacity, travels from -100% to 200% over 2.4s, then repeats
 * after a 0.6s pause. Hidden on mobile; the loop is disabled under reduced motion.
 *
 * The loop is also suspended whenever the indicator is off screen. It is an
 * infinite repeat, so left alone it kept Motion's frame loop awake and did
 * style work every frame for the whole session — including while the reader
 * was several sections further down and the hero was nowhere near the
 * viewport. It resumes on its own when the hero comes back.
 */
export const ScrollIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`hidden sm:block relative h-10 w-px overflow-hidden bg-current/20 ${className}`}
    >
      {!reduced && (
        <motion.span
          className="absolute inset-x-0 top-0 h-1/2 bg-current/80"
          initial={{ y: '-100%' }}
          animate={inView ? { y: '200%' } : { y: '-100%' }}
          transition={
            inView
              ? { duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }
              : { duration: 0 }
          }
        />
      )}
    </span>
  );
};
