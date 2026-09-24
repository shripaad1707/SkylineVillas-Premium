import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Bed, Bath, Maximize, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { Residence } from '../types.ts';
import { DUR, EASE } from '../motion/tokens.ts';
import { lockScroll, unlockScroll } from '../motion/lenis.ts';

interface ResidenceModalProps {
  residence: Residence | null;
  onClose: () => void;
  onEnquire: (residenceTitle: string) => void;
}

export const ResidenceModal: React.FC<ResidenceModalProps> = ({
  residence,
  onClose,
  onEnquire,
}) => {
  const reduced = useReducedMotion();
  const isOpen = Boolean(residence);

  // Pause smooth scroll and lock the page while the dialog is open; Escape closes it.
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {residence && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={residence.title}
          onClick={onClose}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: DUR.quick, ease: EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 18 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-full max-w-3xl bg-[#FCFAF6] text-[#191715] border border-[#191715]/15 shadow-2xl my-8 max-h-[90vh] flex flex-col"
          >
        {/* Header with image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#EAE6DD] shrink-0">
          <img
            src={residence.image}
            alt={residence.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center text-white/80 hover:text-white bg-black/40 hover:bg-black/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <span className="text-[0.62rem] uppercase tracking-[0.22em] text-white/70 block mb-1">
              {residence.code} / Concept Residence
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-white">
              {residence.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-light">
              {residence.category}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div data-lenis-prevent className="overflow-y-auto p-6 sm:p-8 space-y-7">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-[#191715]/15 py-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#736E67] mb-1">
                <Bed className="h-3.5 w-3.5" />
                <span>Bedrooms</span>
              </div>
              <p className="tabular font-display text-xl font-normal text-black">{residence.bedrooms} Suites</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#736E67] mb-1">
                <Bath className="h-3.5 w-3.5" />
                <span>Bathrooms</span>
              </div>
              <p className="tabular font-display text-xl font-normal text-black">{residence.bathrooms} Baths</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#736E67] mb-1">
                <Maximize className="h-3.5 w-3.5" />
                <span>Built-Up</span>
              </div>
              <p className="tabular font-display text-xl font-normal text-black">{residence.area}</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#736E67] mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Levels</span>
              </div>
              <p className="tabular font-display text-xl font-normal text-black">{residence.levels}</p>
            </div>
          </div>

          {/* Architectural Overview */}
          <div>
            <h4 className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold text-[#736E67] mb-2">
              Architectural Rationale
            </h4>
            <p className="text-sm leading-7 text-[#191715] font-light">
              {residence.longDescription}
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold text-[#736E67] mb-3">
              Spatial Highlights & Amenities
            </h4>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {residence.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[#191715] font-light">
                  <CheckCircle2 className="h-3.5 w-3.5 text-black shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Material & Climate Highlights */}
          <div className="bg-[#F4F0E8] p-5 border border-[#191715]/10">
            <h4 className="text-[0.62rem] uppercase tracking-[0.2em] font-semibold text-[#736E67] mb-2">
              Material Palette & Engineering
            </h4>
            <ul className="space-y-1.5 text-xs text-[#191715]/80 font-light">
              {residence.keyHighlights.map((highlight, idx) => (
                <li key={idx}>— {highlight}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#191715]/15 p-5 sm:p-6 bg-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#736E67] font-light text-center sm:text-left">
            Request private pricing, customizable interior palettes, and floorplans.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEnquire(residence.title);
            }}
            className="btn-solid w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-black text-[#FCFAF6] hover:bg-black/90"
          >
            <span>Enquire about {residence.title}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
