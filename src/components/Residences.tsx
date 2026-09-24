import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Bath, Bed, Maximize } from 'lucide-react';
import { RESIDENCES } from '../data.ts';
import { Residence } from '../types.ts';
import { DUR, EASE, VIEWPORT } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { ParallaxImage } from '../motion/ParallaxImage.tsx';

interface ResidencesProps {
  onSelectResidence: (residence: Residence) => void;
}

export const Residences: React.FC<ResidencesProps> = ({ onSelectResidence }) => {
  const reduced = useReducedMotion();

  return (
    <section id="residences" className="section-shell bg-[#FCFAF6] text-[#191715]">
      <div className="content-shell">
        {/* Editorial header: headline left, standfirst set against it on the right. */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <Reveal as="p" className="eyebrow mb-7 text-[#736E67]">
              The residences
            </Reveal>
            <MaskedHeading
              as="h2"
              className="font-display text-display-md text-[#191715]"
              lines={[
                'Spaces designed around',
                <em key="l2" className="italic">
                  the way you live.
                </em>,
              ]}
            />
          </div>
          <Reveal as="p" delay={0.15} className="lead self-start text-[#736E67] lg:pt-3">
            Three distinct expressions of Skyline, each balancing openness with privacy. Specifications shown are conceptual demo content.
          </Reveal>
        </div>

        <div className="mt-20 grid gap-16 md:grid-cols-3 md:gap-10 lg:mt-28 lg:gap-14">
          {RESIDENCES.map((residence, i) => (
            <motion.article
              key={residence.id}
              id={`residence-card-${residence.id}`}
              onClick={() => onSelectResidence(residence)}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: DUR.slow, delay: i * 0.08, ease: EASE }}
              className="group flex flex-col border-t border-[#191715]/15 pt-7 cursor-pointer text-left"
            >
              <ParallaxImage
                src={residence.image}
                alt={`${residence.title} conceptual residence`}
                frameClassName="aspect-[4/3] w-full rounded-[14px] bg-[#EAE6DD]"
                curtainColor="#FCFAF6"
                zoom={1.04}
                zoomDuration={1600}
                width={1536}
                height={1024}
              />

              {/* Index line and the open affordance share a row. */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <p className="caption text-[#736E67]">
                  {residence.code} / Concept residence
                </p>
                <button
                  type="button"
                  aria-label={`View details for ${residence.title}`}
                  className="shrink-0 p-1 text-[#191715] transition-transform duration-700 ease-expo group-hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-3 font-display text-display-sm text-[#191715] transition-opacity duration-700 ease-expo group-hover:opacity-80">
                {residence.title}
              </h3>
              <p className="mt-1.5 text-sm text-[#736E67] font-light">
                {residence.category}
              </p>

              <p className="mt-5 text-sm leading-7 text-[#736E67] font-light line-clamp-3">
                {residence.description}
              </p>

              <ul className="tabular mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#191715]/12 pt-6 text-xs font-light text-[#191715]">
                <li className="flex items-center gap-2">
                  <Bed className="h-4 w-4 shrink-0 stroke-[1.25] text-[#736E67]" />
                  <span>{residence.bedrooms} Bedrooms</span>
                </li>
                <li className="flex items-center gap-2">
                  <Bath className="h-4 w-4 shrink-0 stroke-[1.25] text-[#736E67]" />
                  <span>{residence.bathrooms} Bathrooms</span>
                </li>
                <li className="flex items-center gap-2">
                  <Maximize className="h-4 w-4 shrink-0 stroke-[1.25] text-[#736E67]" />
                  <span>{residence.area}</span>
                </li>
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
