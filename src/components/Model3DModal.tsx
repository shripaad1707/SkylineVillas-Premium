import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Sun, Sunset, Moon, RotateCcw, Eye, Compass, Layers } from 'lucide-react';
import { DUR, EASE } from '../motion/tokens.ts';
import { lockScroll, unlockScroll } from '../motion/lenis.ts';

interface Model3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnquire: () => void;
}

export const Model3DModal: React.FC<Model3DModalProps> = ({ isOpen, onClose, onEnquire }) => {
  const [viewMode, setViewMode] = useState<'facade' | 'courtyard' | 'pool' | 'interior'>('facade');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'golden' | 'dusk'>('golden');
  const [level, setLevel] = useState<'ground' | 'upper' | 'terrace'>('ground');
  const [showWireframe, setShowWireframe] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const reduced = useReducedMotion();

  // Pause smooth scroll and lock the page while the viewer is open; Escape closes it.
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setRotationAngle((prev) => prev - 15);
      if (e.key === 'ArrowRight') setRotationAngle((prev) => prev + 15);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [isOpen, onClose]);

  const views = [
    {
      id: 'facade',
      label: 'Main Facade',
      image: '/images/skyline-facade.jpg',
      hotspots: [
        { x: '35%', y: '40%', label: 'Smoked Walnut Louvers', desc: 'Passive solar shielding' },
        { x: '65%', y: '60%', label: 'Honed Travertine', desc: 'Hand-selected Portuguese stone' }
      ]
    },
    {
      id: 'courtyard',
      label: 'Courtyard Garden',
      image: '/images/skyline-living.jpg',
      hotspots: [
        { x: '45%', y: '50%', label: 'Reflecting Water Pool', desc: 'Natural evaporative cooling' },
        { x: '75%', y: '45%', label: 'Zero-Threshold Sliders', desc: 'Seamless floor continuity' }
      ]
    },
    {
      id: 'pool',
      label: 'Pool Pavilion',
      image: '/images/skyline-pool.jpg',
      hotspots: [
        { x: '40%', y: '65%', label: 'Heated Lap Pool', desc: 'Surrounded by basalt stone' },
        { x: '70%', y: '35%', label: 'Perimeter Foliage', desc: 'Native shaded canopy' }
      ]
    },
    {
      id: 'interior',
      label: 'Living Pavilion',
      image: '/images/skyline-kitchen.jpg',
      hotspots: [
        { x: '50%', y: '45%', label: 'Bespoke Timber Joinery', desc: 'Concealed storage systems' },
        { x: '25%', y: '60%', label: 'Honed Marble Island', desc: 'Monolithic quartz center' }
      ]
    }
  ];

  const currentView = views.find((v) => v.id === viewMode) || views[0];

  const timeFilters = {
    morning: 'brightness(1.05) saturate(0.95)',
    golden: 'sepia(0.2) saturate(1.15) brightness(0.95)',
    dusk: 'brightness(0.75) contrast(1.1) hue-rotate(-15deg)'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Skyline Villas 3D experience"
          onClick={onClose}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: DUR.quick, ease: EASE }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-6"
        >
          <motion.div
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 18 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-full max-w-6xl h-[92vh] bg-[#121110] text-[#FCFAF6] border border-[#FCFAF6]/15 flex flex-col overflow-hidden shadow-2xl"
          >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#FCFAF6]/10 bg-black/40">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg uppercase tracking-[0.16em]">
              Skyline Villas · 3D Experience
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[0.6rem] uppercase tracking-[0.15em] bg-[#FCFAF6]/10 text-[#FCFAF6]/80">
              Interactive Model Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnquire();
              }}
              className="hidden sm:inline-flex text-[0.65rem] uppercase tracking-[0.16em] font-semibold border-b border-[#FCFAF6]/40 pb-0.5 hover:border-white text-[#FCFAF6]"
            >
              Private Enquiry →
            </button>
            <button
              type="button"
              aria-label="Close 3D viewer"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center text-[#FCFAF6]/70 hover:text-white bg-white/5 hover:bg-white/15 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Interactive Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none">
          {/* Main Visual Image with Dynamic Filter & Rotation */}
          <div
            className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-expo"
            style={{
              filter: timeFilters[timeOfDay],
              transform: `scale(${1 + Math.abs(rotationAngle) * 0.0005}) rotate(${rotationAngle * 0.05}deg)`
            }}
          >
            <img
              src={currentView.image}
              alt={currentView.label}
              className="w-full h-full object-cover sm:object-contain"
            />

            {/* Simulated Wireframe Overlay */}
            {showWireframe && (
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            )}

            {/* Hotspots */}
            {currentView.hotspots.map((spot, i) => (
              <motion.div
                key={i}
                style={{ left: spot.x, top: spot.y }}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.quick, delay: 0.15 + i * 0.08, ease: EASE }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-6 w-6 rounded-full bg-white/30 animate-ping" />
                  <span className="h-4 w-4 rounded-full bg-white border-2 border-black flex items-center justify-center text-[8px] font-bold text-black shadow-lg">
                    +
                  </span>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-3 bg-black/90 backdrop-blur-md border border-[#FCFAF6]/20 text-left text-[#FCFAF6] pointer-events-none z-30 shadow-xl">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] font-semibold text-[#FCFAF6]">
                      {spot.label}
                    </p>
                    <p className="text-[0.68rem] text-[#FCFAF6]/70 mt-1 font-light">
                      {spot.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compass and View HUD */}
          <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-sm border border-white/10 text-xs text-[#FCFAF6]/75 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="h-3.5 w-3.5" />
              <span className="uppercase tracking-[0.18em] text-[0.6rem] font-semibold">
                Camera: {currentView.label}
              </span>
            </div>
            <div className="text-[0.58rem] text-[#FCFAF6]/50">
              Level: {level.toUpperCase()} · Lighting: {timeOfDay.toUpperCase()}
            </div>
          </div>

          {/* Orbit / Rotation Quick Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm p-1.5 border border-white/10">
            <button
              type="button"
              onClick={() => setRotationAngle((prev) => prev - 15)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-xs"
              title="Rotate Left"
            >
              ⟲
            </button>
            <button
              type="button"
              onClick={() => setRotationAngle(0)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Reset Angle"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRotationAngle((prev) => prev + 15)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-xs"
              title="Rotate Right"
            >
              ⟳
            </button>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 sm:p-5 border-t border-[#FCFAF6]/10 bg-black/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Perspective Views */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[0.6rem] uppercase tracking-[0.18em] text-[#FCFAF6]/50 mr-1 hidden md:inline">
              Perspectives:
            </span>
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id as any)}
                className={`px-3 py-1.5 text-[0.64rem] uppercase tracking-[0.16em] border transition-colors ${
                  viewMode === v.id
                    ? 'border-white bg-white text-black font-semibold'
                    : 'border-white/20 text-[#FCFAF6]/70 hover:border-white/50 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Lighting and Architectural Controls */}
          <div className="flex items-center gap-4">
            {/* Lighting Time */}
            <div className="flex items-center gap-1 border border-white/20 p-1">
              <button
                type="button"
                onClick={() => setTimeOfDay('morning')}
                title="Morning Sun"
                className={`p-1.5 ${timeOfDay === 'morning' ? 'bg-white text-black' : 'text-[#FCFAF6]/70 hover:text-white'}`}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('golden')}
                title="Golden Hour Dusk"
                className={`p-1.5 ${timeOfDay === 'golden' ? 'bg-white text-black' : 'text-[#FCFAF6]/70 hover:text-white'}`}
              >
                <Sunset className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('dusk')}
                title="Night Illumination"
                className={`p-1.5 ${timeOfDay === 'dusk' ? 'bg-white text-black' : 'text-[#FCFAF6]/70 hover:text-white'}`}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Wireframe toggle */}
            <button
              type="button"
              onClick={() => setShowWireframe(!showWireframe)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[0.62rem] uppercase tracking-[0.16em] transition-colors ${
                showWireframe ? 'border-white bg-white/20 text-white' : 'border-white/20 text-[#FCFAF6]/70 hover:text-white'
              }`}
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">CAD Grid</span>
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
