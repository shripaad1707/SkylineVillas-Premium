import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { EASE, DUR } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { useIntroDone } from '../motion/intro.ts';
import { ScrollIndicator } from '../motion/ScrollIndicator.tsx';

export const Hero: React.FC = () => {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const heroInView = useInView(heroRef);
  const introDone = useIntroDone();

  // Progress through the hero's scroll-out, from resting at the top of the
  // viewport to fully scrolled past.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // The photo lingers: the image layer moves down more slowly than the page.
  const mediaY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  // The text lifts away ahead of it.
  const copyY = useTransform(scrollYProgress, [0, 0.8], ['0%', '-18%']);
  const copyOpacity = useTransform(scrollYProgress, [0.2, 0.75], [1, 0]);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative min-h-[92svh] overflow-hidden bg-black text-[#FCFAF6] lg:min-h-screen"
    >
      {/* Image layer, extended 4% above and 10% below the hero so it can drift. */}
      <motion.div
        className="absolute -top-[4%] -bottom-[10%] left-0 right-0"
        style={reduced ? undefined : { y: mediaY, willChange: 'transform' }}
      >
        {/* Phones get a portrait crop of the same photo: the wide original has
            to lose most of its width in a tall frame, which cuts the villa off.
            Tablets and desktops keep the original file and framing. */}
        <picture className="block h-full w-full">
          <source
            media="(max-width: 767px)"
            srcSet="/images/skyline-hero-mobile.jpg"
            width={900}
            height={1600}
          />
          <motion.img
            src="/images/skyline-hero.jpg"
            alt="Skyline Villas contemporary residence at sunset"
            className="h-full w-full object-cover max-md:object-center md:object-[52%_50%] lg:object-center"
            fetchPriority="high"
            decoding="async"
            initial={reduced ? false : { scale: 1.08 }}
            animate={reduced || !introDone ? undefined : { scale: 1 }}
            transition={{ duration: DUR.settle, ease: EASE }}
          />
        </picture>
      </motion.div>

      <div className="absolute inset-0 bg-hero-shade pointer-events-none" />

      <div className="relative mx-auto flex min-h-[92svh] max-w-[94rem] flex-col justify-end px-5 pb-8 pt-28 sm:px-8 lg:min-h-screen lg:px-12 lg:pb-10">
        <motion.div
          className="mb-[10vh] max-w-4xl lg:mb-[12vh]"
          style={reduced ? undefined : { y: copyY, opacity: copyOpacity, willChange: 'transform, opacity' }}
        >
          <MaskedHeading
            as="h1"
            onLoad
            delay={0.45}
            className="font-display text-display-hero text-[#FCFAF6]"
            lines={[
              'Designed for the life',
              <em key="l2" className="font-normal italic">
                you've imagined.
              </em>,
            ]}
          />

          {/* Wrapper carries the measure; .lead's own 46ch cap is wider than
              the three-line break the design calls for. */}
          <Reveal onLoad y={16} delay={0.95} className="mt-8 max-w-[22rem] sm:max-w-[26rem]">
            <p className="lead hero-legible text-[#FCFAF6]/90">
              Contemporary private residences shaped by light, space, landscape and considered design.
            </p>
          </Reveal>

          {/* Both actions share the 48px height so their labels sit on one line;
              on phones they stack full-width as easy tap targets. */}
          <Reveal
            onLoad
            y={16}
            delay={1.1}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <a
              id="hero-explore-residences-link"
              href="#residences"
              className="group btn-solid hero-focus inline-flex items-center justify-center gap-3 border border-[#FCFAF6] bg-[#FCFAF6] text-[#191715] hover:border-white hover:bg-white"
            >
              <span>Explore residences</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
            </a>
            <a
              id="hero-discover-skyline-link"
              href="#philosophy"
              className="group btn-solid hero-focus inline-flex items-center justify-center gap-3 border border-[#FCFAF6]/45 bg-black/15 text-[#FCFAF6] backdrop-blur-sm hover:border-[#FCFAF6] hover:bg-[#FCFAF6]/10"
            >
              <span>Discover Skyline</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
            </a>
          </Reveal>
        </motion.div>

        <Reveal onLoad y={16} delay={1.5} className="self-start">
          <a
            id="hero-scroll-explore-link"
            href="#philosophy"
            className="flex items-center gap-3 caption text-[#FCFAF6]/70 hover:text-[#FCFAF6] transition-colors duration-500 ease-expo"
          >
            {/* Suspended once the hero leaves the viewport: an infinite repeat
                otherwise keeps Motion's frame loop running and writes a
                transform every frame for the whole session, long after this
                arrow is unreachable. */}
            <motion.span
              animate={reduced || !heroInView ? { y: 0 } : { y: [0, 6, 0] }}
              transition={
                heroInView && !reduced
                  ? { duration: 2, ease: 'easeInOut', repeat: Infinity }
                  : { duration: 0 }
              }
              className="inline-flex"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.span>
            <span>Scroll to explore</span>
            <ScrollIndicator className="ml-2" />
          </a>
        </Reveal>
      </div>
    </section>
  );
};
