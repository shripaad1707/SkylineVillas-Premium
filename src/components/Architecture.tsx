import React from 'react';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { ParallaxImage } from '../motion/ParallaxImage.tsx';

export const Architecture: React.FC = () => {
  return (
    <section id="architecture" className="section-shell bg-black text-[#FCFAF6]">
      <div className="content-shell">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal as="p" className="eyebrow mb-6 text-[#FCFAF6]/65">
              01 / Architecture
            </Reveal>
            <MaskedHeading
              as="h2"
              className="max-w-2xl font-display text-display-md text-[#FCFAF6]"
              lines={[
                'Architecture shaped by',
                <em key="l2" className="italic">
                  light, proportion and material.
                </em>,
              ]}
            />
          </div>
          <Reveal as="p" delay={0.15} className="lead max-w-lg self-end text-[#FCFAF6]/70">
            Clean lines meet warm timber, natural stone and expansive glass. Every element is considered to create a home that feels contemporary without losing its sense of warmth.
          </Reveal>
        </div>

        <div className="mt-16 grid items-end gap-5 md:grid-cols-12 lg:mt-24">
          <figure className="group md:col-span-7">
            <ParallaxImage
              src="/images/skyline-facade.jpg"
              alt="Walnut and concrete facade detail"
              frameClassName="aspect-[4/3] w-full rounded-[14px] bg-[#1f1d1b]"
              curtainColor="#000000"
              width={1536}
              height={1024}
            />
            <figcaption className="caption mt-3 text-[#FCFAF6]/65">
              01 — Warm concrete / Walnut / Glass
            </figcaption>
          </figure>

          <figure className="group md:col-span-5 md:pb-16">
            <ParallaxImage
              src="/images/skyline-living.jpg"
              alt="Living room opening onto a private garden"
              frameClassName="aspect-[4/5] w-full rounded-[14px] bg-[#1f1d1b]"
              curtainColor="#000000"
              width={1536}
              height={1024}
            />
            <figcaption className="caption mt-3 text-[#FCFAF6]/65">
              02 — The garden room
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};
