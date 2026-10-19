import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Reveal } from '../motion/Reveal.tsx';
import { scrollToTop } from '../motion/lenis.ts';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#100E0D] text-[#FCFAF6] border-t border-[#FCFAF6]/10 pt-16 pb-12 px-5 sm:px-8 lg:px-12">
      <div className="content-shell">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 pb-14 border-b border-[#FCFAF6]/10">
          <Reveal className="lg:col-span-5">
            <span className="font-display text-2xl uppercase tracking-[0.16em] block mb-4">
              Skyline Villas
            </span>
            <p className="max-w-sm text-xs leading-6 text-[#FCFAF6]/60 font-light">
              A concept collection of contemporary private residences shaped by architecture, landscape and light in Hyderabad, Telangana.
            </p>
            <div className="mt-6 text-xs text-[#FCFAF6]/40 font-light">
              Private presentations and site viewings by prior appointment.
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-3">
            <p className="caption text-[#FCFAF6]/50 mb-4">
              Residences
            </p>
            <ul className="space-y-2.5 text-xs text-[#FCFAF6]/75 font-light">
              <li>
                <a href="#residences" className="hover:text-white transition-colors">
                  Skyline One · Family Residence
                </a>
              </li>
              <li>
                <a href="#residences" className="hover:text-white transition-colors">
                  Skyline Two · Courtyard Residence
                </a>
              </li>
              <li>
                <a href="#residences" className="hover:text-white transition-colors">
                  Skyline Three · Signature Residence
                </a>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-2">
            <p className="caption text-[#FCFAF6]/50 mb-4">
              Explore
            </p>
            <ul className="space-y-2.5 text-xs text-[#FCFAF6]/75 font-light">
              <li>
                <a href="#philosophy" className="hover:text-white transition-colors">
                  Philosophy
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  Architecture
                </a>
              </li>
              <li>
                <a href="#amenities" className="hover:text-white transition-colors">
                  The Details
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-white transition-colors">
                  Location
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition-colors">
                  In Perspective
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.2} className="lg:col-span-2 flex flex-col justify-between items-start">
            <div>
              <p className="caption text-[#FCFAF6]/50 mb-4">
                Location
              </p>
              <address className="not-italic text-xs text-[#FCFAF6]/75 font-light leading-5">
                Financial District Corridor<br />
                Hyderabad, Telangana<br />
                India
              </address>
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Scroll back to top"
              className="mt-8 inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-[#FCFAF6]/60 hover:text-white transition-colors"
            >
              <span>Back to top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </Reveal>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.65rem] text-[#FCFAF6]/40 font-light">
          <p>© {new Date().getFullYear()} Skyline Villas. All rights reserved.</p>
          <div className="text-center sm:text-right">
            <p>Conceptual architectural showcase. Renderings and specifications for illustration purposes.</p>
            <p className="mt-1.5">
              Website, AI assistant and 3D tour by{' '}
              <a
                href="https://shripaads-agency.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="text-[#C5A880] underline-offset-4 hover:text-[#E3CBA4] hover:underline"
              >
                Shripaad Koduri
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
