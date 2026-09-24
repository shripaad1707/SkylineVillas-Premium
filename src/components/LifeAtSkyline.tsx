import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { ParallaxImage } from '../motion/ParallaxImage.tsx';
import { warmImages } from '../motion/warmImages.ts';

const STRIP = [
  {
    src: '/images/skyline-pool.jpg',
    alt: 'Quiet morning beside the private pool',
    width: 'w-[min(86vw,50rem)]',
  },
  {
    src: '/images/skyline-kitchen.jpg',
    alt: 'Warm timber kitchen',
    width: 'w-[min(64vw,25rem)]',
  },
  {
    src: '/images/skyline-dining.jpg',
    alt: 'Dining room opening onto the garden at sunset',
    width: 'w-[min(64vw,25rem)]',
  },
  {
    src: '/images/skyline-terrace.jpg',
    alt: 'Rooftop lounge around a fire table at dusk',
    width: 'w-[min(86vw,50rem)]',
  },
  {
    src: '/images/skyline-bedroom.jpg',
    alt: 'Calm bedroom overlooking greenery',
    width: 'w-[min(64vw,25rem)]',
  },
  {
    src: '/images/skyline-pool-evening.jpg',
    alt: 'Evening by the pool with the living room lit behind',
    width: 'w-[min(64vw,25rem)]',
  },
];

const TitleBlock: React.FC = () => (
  <>
    <Reveal as="p" className="eyebrow mb-6 text-[#736E67]">
      Life at Skyline
    </Reveal>
    <MaskedHeading
      as="h2"
      className="font-display text-display-md text-[#191715]"
      lines={[
        'A home should change',
        <em key="l2" className="italic">
          how your days feel.
        </em>,
      ]}
    />
    <Reveal as="p" delay={0.15} className="lead mt-7 max-w-sm text-[#736E67]">
      Morning light across the terrace. Quiet evenings beneath the trees. Spaces that move naturally between indoors and out.
    </Reveal>
  </>
);

export const LifeAtSkyline: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** Present in both the pinned and the swipe-row layout, unlike sectionRef. */
  const warmRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const [pinned, setPinned] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  // How far the row overflows the viewport, and the height of one screen.
  const [distance, setDistance] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 0,
  );

  // Pinning is a desktop affordance and it is scroll-linked, so it is off
  // below 1024px and under prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setPinned(mq.matches && !reduced);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [reduced]);

  // Measure the row so the section reserves exactly enough scroll length.
  useEffect(() => {
    if (!pinned) {
      setDistance(0);
      return;
    }
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const newDist = Math.max(0, track.scrollWidth - window.innerWidth);
      const newVh = window.innerHeight;
      setDistance((prev) => (prev !== newDist ? newDist : prev));
      setViewportH((prev) => (prev !== newVh ? newVh : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pinned]);

  // Decode the strip's photographs before the scroll arrives at them. This row
  // is the heaviest paint on the page — a very wide composited layer holding
  // six full-bleed photos — and lazy-decoding them on arrival put six JPEG
  // decodes in the same frames as the scroll-linked horizontal transform. The
  // margin starts the warm roughly two screens out, while the section above is
  // still on screen, so it is finished by the time the row is reached.
  useEffect(() => {
    const el = warmRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warmImages(STRIP.map((item) => item.src));
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px 200% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pinned]);

  // 0 when the section top meets the viewport top, 1 when its bottom meets the
  // viewport bottom, so the row moves 1:1 with the scroll the section reserves.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  // Below 1024px, or under reduced motion: a plain swipe row with scroll-snap.
  if (!pinned) {
    return (
      <section ref={warmRef} id="life" className="section-shell bg-[#FCFAF6] text-[#191715]">
        <div className="content-shell">
          <TitleBlock />
        </div>
        <div
          data-lenis-prevent
          className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-4 sm:px-8"
        >
          {STRIP.map((item) => (
            <figure
              key={item.src}
              className={`group shrink-0 snap-start ${item.width} max-w-[80vw]`}
            >
              {/* No curtain here: items waiting off-screen would read as blank
                  gaps, losing the peek that invites the swipe. */}
              <ParallaxImage
                src={item.src}
                alt={item.alt}
                frameClassName="aspect-[4/3] w-full rounded-[14px] bg-[#EAE6DD]"
                parallax={0}
                width={1536}
                height={1024}
              />
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={(node) => {
        sectionRef.current = node;
        warmRef.current = node;
      }}
      id="life"
      className="relative bg-[#FCFAF6] text-[#191715]"
      style={{ height: distance + viewportH }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div
          ref={trackRef}
          style={{ x, willChange: 'transform' }}
          className="flex w-max items-center gap-6 px-12"
        >
          {/* The section title block is the first item in the row. */}
          <div className="w-[min(70vw,30rem)] shrink-0 pr-6">
            <TitleBlock />
          </div>

          {STRIP.map((item) => (
            <figure key={item.src} className={`group shrink-0 ${item.width}`}>
              <ParallaxImage
                src={item.src}
                alt={item.alt}
                frameClassName="h-[64vh] w-full rounded-[14px] bg-[#EAE6DD]"
                curtainColor="#FCFAF6"
                parallax={0}
                width={1536}
                height={1024}
              />
            </figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
