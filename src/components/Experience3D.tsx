import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Box, ArrowRight } from 'lucide-react';
import { DUR, EASE, VIEWPORT } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';

interface Experience3DProps {
  onOpen3DViewer: () => void;
}

export const Experience3D: React.FC<Experience3DProps> = ({ onOpen3DViewer }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  });
  // The showcase image drifts gently as the frame passes through the viewport.
  const y = useTransform(scrollYProgress, [0, 1], ['-3%', '3%']);

  return (
    <section id="experience" className="bg-[#191715] px-3 py-3 sm:px-5 sm:py-5">
      <motion.div
        ref={frameRef}
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.base, ease: EASE }}
        className="relative min-h-[78svh] overflow-hidden"
      >
        <motion.div
          className="absolute -top-[9%] -bottom-[9%] left-0 right-0"
          style={reduced ? undefined : { y }}
        >
          <img
            src="/images/skyline-aerial.jpg"
            alt="Architectural visualization of Skyline Villas"
            loading="lazy"
            width="1536"
            height="1024"
            className="h-full w-full object-cover"
          />
        </motion.div>

        <div className="absolute inset-0 bg-experience-shade pointer-events-none" />

        <div className="relative flex min-h-[78svh] flex-col justify-between p-6 text-[#FCFAF6] sm:p-10 lg:p-14">
          <div className="flex items-center justify-between">
            <Reveal as="p" className="eyebrow text-[#FCFAF6]/65">
              The Skyline experience
            </Reveal>
            <Reveal as="span" delay={0.1} className="caption hidden text-[#FCFAF6]/65 sm:block">
              Interactive model / Live viewer
            </Reveal>
          </div>

          <div className="max-w-2xl my-auto py-12">
            <Reveal className="mb-8">
              <Box className="h-8 w-8 stroke-1 text-[#FCFAF6]" />
            </Reveal>
            <MaskedHeading
              as="h2"
              className="font-display text-display-lg text-[#FCFAF6]"
              lines={[
                'Step inside before',
                <em key="l2" className="italic">
                  you arrive.
                </em>,
              ]}
            />
            <Reveal as="p" delay={0.2} className="lead mt-6 max-w-lg text-[#FCFAF6]/75">
              Explore the architecture from every angle. Walk through spaces, discover materials and understand how each residence comes together.
            </Reveal>
            <Reveal delay={0.3} className="mt-8">
              <button
                id="explore-3d-btn"
                type="button"
                onClick={onOpen3DViewer}
                className="group link-underline btn-label inline-flex items-center gap-3 pb-2 text-[#FCFAF6]"
              >
                <span>Explore in 3D</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
              </button>
            </Reveal>
          </div>

          <Reveal as="div" delay={0.35} className="caption text-[#FCFAF6]/50">
            Real-time geometry · Lighting simulations · Floorplan cutaways
          </Reveal>
        </div>
      </motion.div>
    </section>
  );
};
