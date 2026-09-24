import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { EASE, VIEWPORT_IMAGE } from './tokens.ts';

interface ParallaxImageProps {
  src: string;
  alt: string;
  /** Classes for the frame: aspect ratio, column spans, background. */
  frameClassName?: string;
  /** Solid panel colour that collapses upward to unveil the image. */
  curtainColor?: string;
  /** Parallax travel in percent, +/- around centre. 6 by default, 5 for very wide images. */
  parallax?: number;
  /** Hover zoom target scale. 0 disables the hover zoom. */
  zoom?: number;
  /** Hover zoom duration in ms. */
  zoomDuration?: number;
  /** Object-position helper for the inner image. */
  objectClassName?: string;
  loading?: 'lazy' | 'eager';
  width?: number | string;
  height?: number | string;
}

interface LayerProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  parallax: number;
  children: React.ReactNode;
}

/** The frame is 9% taller top and bottom; this drifts it as the frame passes. */
const ParallaxLayer: React.FC<LayerProps> = ({ targetRef, parallax, children }) => {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`]);

  return (
    <motion.div
      className="absolute inset-x-0 -top-[9%] -bottom-[9%]"
      style={{ y, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
};

/** Same box, no scroll tracking, for parallax={0} and reduced motion. */
const StaticLayer: React.FC<LayerProps> = ({ children }) => (
  <div className="absolute inset-x-0 -top-[9%] -bottom-[9%]">{children}</div>
);

/**
 * An editorial image in an overflow-hidden frame. Combines:
 *  - curtain reveal: a solid panel collapses upward (scaleY 1 -> 0) over 1.25s
 *  - settle: the image eases from scale 1.14 to 1 over 1.9s
 *  - parallax: the image is 9% taller top and bottom and drifts as the frame passes
 *  - hover zoom: a slow, subtle scale, driven by CSS so parent `group` hover works
 */
export const ParallaxImage: React.FC<ParallaxImageProps> = ({
  src,
  alt,
  frameClassName = '',
  curtainColor,
  parallax = 6,
  zoom = 1.035,
  zoomDuration = 1400,
  objectClassName = 'object-cover',
  loading = 'lazy',
  width,
  height,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const zoomEnabled = Boolean(zoom) && !reduced;
  const hasParallax = Boolean(parallax) && !reduced;

  // The drifting layer lives in its own component so that `useScroll` is only
  // mounted for frames that actually drift. It measures its target against the
  // viewport on every scroll frame, and the page has fifteen of these — seven
  // of which pass parallax={0} and were paying for a measurement that moved
  // nothing.
  const Drifter = hasParallax ? ParallaxLayer : StaticLayer;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${zoomEnabled ? 'zoom-frame' : ''} ${frameClassName}`}
      style={
        zoomEnabled
          ? ({
              '--zoom-scale': String(zoom),
              '--zoom-duration': `${zoomDuration}ms`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <Drifter targetRef={ref} parallax={parallax}>
        <motion.div
          className="h-full w-full"
          initial={reduced ? false : { scale: 1.14 }}
          whileInView={reduced ? undefined : { scale: 1 }}
          viewport={VIEWPORT_IMAGE}
          transition={{ duration: 1.9, ease: EASE }}
        >
          <img
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            width={width}
            height={height}
            className={`h-full w-full ${objectClassName} ${zoomEnabled ? 'zoom-img' : ''}`}
          />
        </motion.div>
      </Drifter>

      {curtainColor && !reduced && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 origin-top pointer-events-none"
          style={{ backgroundColor: curtainColor }}
          initial={{ scaleY: 1 }}
          whileInView={{ scaleY: 0 }}
          viewport={VIEWPORT_IMAGE}
          transition={{ duration: 1.25, ease: EASE }}
        />
      )}
    </div>
  );
};
