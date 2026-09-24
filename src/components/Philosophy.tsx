import React from 'react';
import { Reveal } from '../motion/Reveal.tsx';
import { ScrollWords } from '../motion/ScrollWords.tsx';

export const Philosophy: React.FC = () => {
  return (
    <section id="philosophy" className="section-shell bg-[#FCFAF6] text-[#191715]">
      <div className="content-shell flex flex-col items-center text-center">
        <Reveal>
          <p className="eyebrow-pill text-[#736E67]">Our philosophy</p>
        </Reveal>

        {/* Animation unchanged: the words brighten in reading order, scrubbed
            by scroll position. */}
        <ScrollWords
          as="h2"
          className="mt-8 max-w-4xl font-display text-display-lg text-[#191715]"
          lines={[
            { text: 'Thoughtfully designed villas for' },
            { text: 'a more meaningful life.', italic: true },
          ]}
        />

        <Reveal as="p" delay={0.15} className="lead mx-auto mt-7 text-[#736E67]">
          At Skyline Villas, we blend contemporary architecture, natural surroundings and modern comfort to create homes that feel private, peaceful and truly yours.
        </Reveal>
      </div>
    </section>
  );
};
