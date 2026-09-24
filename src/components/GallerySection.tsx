import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GALLERY_ITEMS } from '../data.ts';
import { GalleryItem } from '../types.ts';
import { DUR, EASE, VIEWPORT } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';
import { ParallaxImage } from '../motion/ParallaxImage.tsx';
import { lockScroll, unlockScroll } from '../motion/lenis.ts';

export const GallerySection: React.FC = () => {
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);
  const reduced = useReducedMotion();

  const openPhoto = (item: GalleryItem) => {
    setActivePhoto(item);
  };

  const closePhoto = () => {
    setActivePhoto(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!activePhoto) return;
    const currentIndex = GALLERY_ITEMS.findIndex((i) => i.id === activePhoto.id);
    if (currentIndex === -1) return;
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= GALLERY_ITEMS.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = GALLERY_ITEMS.length - 1;
    setActivePhoto(GALLERY_ITEMS[nextIndex]);
  };

  // Pause smooth scroll and lock the page while the lightbox is open.
  useEffect(() => {
    if (!activePhoto) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhoto();
      if (e.key === 'ArrowRight') navigatePhoto('next');
      if (e.key === 'ArrowLeft') navigatePhoto('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [activePhoto]);

  return (
    <section id="gallery" className="section-shell bg-[#FCFAF6] text-[#191715]">
      <div className="content-shell">
        <div className="flex items-end justify-between gap-8">
          <div>
            <Reveal as="p" className="eyebrow mb-6 text-[#736E67]">
              In perspective
            </Reveal>
            <MaskedHeading
              as="h2"
              className="font-display text-display-md text-[#191715]"
              lines={[
                'A study in',
                <em key="l2" className="italic">
                  space and stillness.
                </em>,
              ]}
            />
          </div>
          <Reveal
            as="p"
            delay={0.15}
            className="hidden max-w-xs text-right text-xs leading-5 text-[#736E67] md:block font-light"
          >
            Architecture, interiors and landscape from the Skyline world.
          </Reveal>
        </div>

        <div className="mt-14 grid auto-rows-[18rem] grid-cols-1 gap-3 md:grid-cols-4">
          {GALLERY_ITEMS.map((item, i) => (
            <motion.figure
              key={item.id}
              onClick={() => openPhoto(item)}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: DUR.slow, delay: (i % 3) * 0.08, ease: EASE }}
              className={`group relative overflow-hidden rounded-[14px] bg-[#EAE6DD] cursor-pointer ${item.spanClass}`}
            >
              <ParallaxImage
                src={item.image}
                alt={`${item.title} at Skyline Villas`}
                frameClassName="h-full w-full"
                parallax={5}
                zoom={1.04}
                zoomDuration={1600}
                width={1536}
                height={1024}
              />
              <figcaption className="caption absolute bottom-0 left-0 z-10 bg-[#FCFAF6] px-4 py-2 text-[#191715]">
                {item.title}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${activePhoto.title} — enlarged photograph`}
            onClick={closePhoto}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: DUR.quick, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
          >
            <button
              type="button"
              aria-label="Close image lightbox"
              onClick={closePhoto}
              className="absolute top-6 right-6 z-10 grid h-10 w-10 place-items-center text-white/80 hover:text-white bg-black/40 hover:bg-black/80 transition-colors duration-500 ease-expo"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Previous photograph"
              onClick={(e) => {
                e.stopPropagation();
                navigatePhoto('prev');
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 grid h-12 w-12 place-items-center text-white/80 hover:text-white bg-black/40 hover:bg-black/80 transition-colors duration-500 ease-expo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              aria-label="Next photograph"
              onClick={(e) => {
                e.stopPropagation();
                navigatePhoto('next');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 grid h-12 w-12 place-items-center text-white/80 hover:text-white bg-black/40 hover:bg-black/80 transition-colors duration-500 ease-expo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.div
              data-lenis-prevent
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? false : { opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: EASE }}
              key={activePhoto.id}
              className="max-h-[90vh] max-w-5xl flex flex-col items-center"
            >
              <img
                src={activePhoto.image}
                alt={activePhoto.title}
                className="max-h-[80vh] w-auto object-contain"
              />
              <div className="mt-4 text-center text-[#FCFAF6]">
                <span className="caption text-[#FCFAF6]/70 block">
                  {activePhoto.category}
                </span>
                <p className="text-sm font-light text-[#FCFAF6]/90 mt-1 max-w-md">
                  {activePhoto.description}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
