import React from 'react';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { ParallaxImage } from '../motion/ParallaxImage.tsx';

export const LocationSection: React.FC = () => {
  return (
    <section id="location" className="bg-black text-[#FCFAF6]">
      <div className="grid min-h-[80svh] lg:grid-cols-[1.35fr_0.65fr]">
        <ParallaxImage
          src="/images/skyline-aerial.jpg"
          alt="Elevated view of Skyline Villas in a green Hyderabad setting"
          frameClassName="h-full min-h-[52svh] w-full bg-black"
          curtainColor="#000000"
          parallax={5}
          zoom={0}
          width={1536}
          height={1024}
        />

        <div className="flex flex-col justify-between p-7 sm:p-12 lg:p-14">
          <div>
            <Reveal as="p" className="eyebrow mb-6 text-[#FCFAF6]/65">
              The location
            </Reveal>
            <MaskedHeading
              as="h2"
              className="font-display text-display-md text-[#FCFAF6]"
              lines={[
                'Connected to',
                'the city.',
                <em key="l3" className="italic">
                  Removed from
                </em>,
                <em key="l4" className="italic">
                  the noise.
                </em>,
              ]}
            />
            <Reveal as="p" delay={0.15} className="lead mt-6 text-[#FCFAF6]/70 max-w-md">
              Positioned in one of Hyderabad's most tranquil residential corridors, surrounded by verdant preserves while maintaining immediate connectivity to the financial district.
            </Reveal>
          </div>

          <div className="mt-16">
            <Reveal as="p" className="caption mb-4 text-[#FCFAF6]/65">
              Location
            </Reveal>
            <MaskedHeading
              as="h3"
              delay={0.1}
              className="font-display text-3xl sm:text-4xl text-[#FCFAF6]"
              lines={['Hyderabad,', 'Telangana']}
            />
            <Reveal
              as="div"
              delay={0.2}
              className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-[#FCFAF6]/20 pt-6 text-xs text-[#FCFAF6]/75 font-light"
            >
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FCFAF6]/50"></span>
                City Centre
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FCFAF6]/50"></span>
                Business District
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FCFAF6]/50"></span>
                International Airport
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FCFAF6]/50"></span>
                Schools
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FCFAF6]/50"></span>
                Dining &amp; Retail
              </span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};
