import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FAQ_ITEMS } from '../data.ts';
import { DUR, EASE } from '../motion/tokens.ts';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';

interface FaqSectionProps {
  onOpenEnquiry: (initialSubject?: string) => void;
}

/** A plus whose vertical bar collapses to leave a minus. */
const PlusMinus: React.FC<{ open: boolean }> = ({ open }) => (
  <span className="relative block h-4 w-4 shrink-0" aria-hidden="true">
    <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-current" />
    <motion.span
      className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-current"
      animate={{ scaleY: open ? 0 : 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    />
  </span>
);

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenEnquiry }) => {
  // Only one answer open at a time; the first is open by default.
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduced = useReducedMotion();

  const toggleFaq = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="faq" className="section-shell bg-[#FAF8F5] text-[#191715]">
      <div className="content-shell grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <Reveal as="p" className="eyebrow mb-6 text-[#736E67]">
            FAQ
          </Reveal>
          <MaskedHeading
            as="h2"
            className="font-display text-display-md text-[#191715]"
            lines={[
              'Everything you need',
              <em key="l2" className="italic">
                to know.
              </em>,
            ]}
          />
        </div>

        <div className="border-t border-[#191715]/15">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openIndex === index;
            const isPrivateViewing = index === 3;
            const isProjectInfo = index === 5;

            return (
              <Reveal key={index} delay={index * 0.05} className="border-b border-[#191715]/15">
                <button
                  type="button"
                  id={`faq-btn-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => toggleFaq(index)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-5 text-left transition-colors duration-500 ease-expo hover:text-black/80 cursor-pointer"
                >
                  <span className="min-w-0 text-sm font-medium sm:text-base text-[#191715]">
                    {faq.question}
                  </span>
                  <span className={isOpen ? 'text-black' : 'text-[#736E67]'}>
                    <PlusMinus open={isOpen} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-btn-${index}`}
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduced ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: DUR.quick, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6">
                        <p className="max-w-xl text-sm leading-6 text-[#736E67] font-light">
                          {faq.answer}
                        </p>

                        {isPrivateViewing && (
                          <div className="mt-4 pt-2">
                            <button
                              type="button"
                              onClick={() => onOpenEnquiry('Private Viewing Appointment')}
                              className="link-underline btn-label inline-flex items-center pb-1"
                            >
                              Book an appointment online →
                            </button>
                          </div>
                        )}

                        {isProjectInfo && (
                          <div className="mt-4 pt-2">
                            <button
                              type="button"
                              onClick={() => onOpenEnquiry('Complete Project Information')}
                              className="link-underline btn-label inline-flex items-center pb-1"
                            >
                              Request complete brochure &amp; floorplans →
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
