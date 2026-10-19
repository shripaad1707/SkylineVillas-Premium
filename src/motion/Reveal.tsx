import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, VIEWPORT } from './tokens.ts';
import { useIntroDone } from './intro.ts';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Vertical travel in px. 18 for prose blocks, 24/28 for larger cards. */
  y?: number;
  delay?: number;
  duration?: number;
  as?: 'div' | 'p' | 'span' | 'li' | 'ul' | 'ol' | 'figure' | 'article' | 'section' | 'nav' | 'header';
  /** Play immediately on mount rather than on scroll (hero entrance). */
  onLoad?: boolean;
  id?: string;
  'aria-label'?: string;
}

/**
 * Fade-up reveal: opacity 0 -> 1 and y -> 0 over 0.9s, once, at 25% in view.
 *
 * No hand-written `will-change` or `translateZ(0)`: this plays once and then
 * never moves again, so Motion's own promotion for the duration of the
 * animation is exactly right. Declaring it in `style` instead held a layer for
 * every reveal on the page — dozens of them — for the whole session.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  y = 18,
  delay = 0,
  duration = DUR.base,
  as = 'div',
  onLoad = false,
  ...rest
}) => {
  const reduced = useReducedMotion();
  const introDone = useIntroDone();
  const Tag = (motion as unknown as Record<string, React.ElementType>)[as];

  if (reduced) {
    const Plain = as as React.ElementType;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const target = { opacity: 1, y: 0 };

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      {...(onLoad
        ? { animate: introDone ? target : undefined }
        : { whileInView: target, viewport: VIEWPORT })}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
};
