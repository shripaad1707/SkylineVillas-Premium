import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AMENITIES_LIST } from '../data.ts';
import { DUR, EASE, VIEWPORT } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';

export const Amenities: React.FC = () => {
  const reduced = useReducedMotion();

  return (
    <section id="amenities" className="section-shell border-y border-[#191715]/12 bg-[#F4F0E8] text-[#191715]">
      <div className="content-shell grid gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
        <div>
          <Reveal as="p" className="eyebrow mb-6 text-[#736E67]">
            The details
          </Reveal>
          <MaskedHeading
            as="h2"
            className="font-display text-display-md text-[#191715]"
            lines={[
              'Considered down to',
              <em key="l2" className="italic">
                the smallest detail.
              </em>,
            ]}
          />
          <Reveal as="p" delay={0.15} className="mt-6 max-w-sm text-xs leading-6 text-[#736E67] font-light">
            Concept features for this demonstration; final inclusions are tailored to each live development.
          </Reveal>
        </div>

        <ol className="border-t border-[#191715]/30">
          {AMENITIES_LIST.map((item, i) => (
            <motion.li
              key={item.code}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: DUR.base, delay: i * 0.05, ease: EASE }}
              className="row-rule grid grid-cols-[3rem_1fr_auto] items-center border-b border-[#191715]/12 py-5 sm:grid-cols-[5rem_1fr_auto] group hover:bg-black/[0.02] transition-colors duration-700 ease-expo"
            >
              <span className="tabular text-[0.6rem] tracking-[0.18em] text-[#736E67]">
                {item.code}
              </span>
              <div>
                <span className="row-title font-display text-xl sm:text-2xl text-[#191715] block">
                  {item.title}
                </span>
                <span className="text-xs text-[#736E67] font-light hidden sm:block mt-0.5">
                  {item.desc}
                </span>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-black"></span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
};
