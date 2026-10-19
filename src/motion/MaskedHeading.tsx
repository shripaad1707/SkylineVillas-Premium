import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { DUR, EASE } from './tokens.ts';
import { useIntroDone } from './intro.ts';

interface MaskedHeadingProps {
  /** One entry per headline line. Each rises out of its own mask. */
  lines: React.ReactNode[];
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  /** Play on mount instead of on scroll (the hero headline). */
  onLoad?: boolean;
  /** Delay before the first line, in seconds. */
  delay?: number;
  id?: string;
}

/**
 * Masked line reveal: each line starts pushed fully below its own
 * overflow-hidden slot and rises to 0 over 1.3s, staggered by 0.1s.
 *
 * The in-view test runs on the heading, not on the inner spans: those are
 * translated outside their mask, so an observer on them would be clipped to
 * zero intersection and never fire.
 */
export const MaskedHeading: React.FC<MaskedHeadingProps> = ({
  lines,
  className,
  as = 'h2',
  onLoad = false,
  delay = 0,
  ...rest
}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.25 });
  // On-load headings wait for the opening sequence to lift.
  const introDone = useIntroDone();
  const Tag = as as React.ElementType;

  if (reduced) {
    return (
      <Tag ref={ref} className={className} {...rest}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  const play = onLoad ? introDone : inView;

  return (
    <Tag ref={ref} className={className} {...rest}>
      {lines.map((line, i) => (
        <span key={i} className="masked-line">
          <motion.span
            className="block"
            initial={{ y: '112%' }}
            animate={play ? { y: '0%' } : undefined}
            transition={{ duration: DUR.slow, delay: delay + i * 0.1, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};
