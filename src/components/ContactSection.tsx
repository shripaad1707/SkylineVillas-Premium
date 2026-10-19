import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../motion/Reveal.tsx';
import { MaskedHeading } from '../motion/MaskedHeading.tsx';

interface ContactSectionProps {
  onOpenEnquiry: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenEnquiry }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.12, 1]);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative flex min-h-[80svh] items-center justify-center overflow-hidden px-5 py-24 text-center text-[#FCFAF6]"
    >
      <motion.div
        className="absolute -top-[10%] -bottom-[10%] left-0 right-0"
        style={reduced ? undefined : { y, scale }}
      >
        <img
          src="/images/skyline-aerial.jpg"
          alt="Skyline Villas illuminated at dusk"
          loading="lazy"
          width="1536"
          height="1024"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-cta-shade pointer-events-none" />

      <div className="relative max-w-3xl">
        <Reveal as="p" className="eyebrow mb-6 justify-center text-[#FCFAF6]/65">
          Private viewings
        </Reveal>
        <MaskedHeading
          as="h2"
          className="font-display text-display-lg text-[#FCFAF6]"
          lines={[
            'Find a place that feels',
            <em key="l2" className="italic">
              made for you.
            </em>,
          ]}
        />
        <Reveal as="p" delay={0.25} className="lead mx-auto mt-6 text-[#FCFAF6]/75">
          Discover Skyline Villas and experience a different way of living.
        </Reveal>

        <Reveal delay={0.35} className="mt-9 flex flex-wrap justify-center gap-7">
          <button
            id="contact-request-viewing-btn"
            type="button"
            onClick={onOpenEnquiry}
            className="group link-underline btn-label inline-flex items-center gap-3 pb-2 text-[#FCFAF6]"
          >
            <span>Request a private viewing</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
          </button>

          <button
            id="contact-chat-concierge-btn"
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('concierge:open'))}
            className="group link-underline btn-label inline-flex items-center gap-3 pb-2 text-[#FCFAF6]"
          >
            <span>Chat with the assistant</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
          </button>

          <a
            id="contact-explore-residences-link"
            href="#residences"
            className="group link-underline btn-label inline-flex items-center gap-3 pb-2 text-[#FCFAF6]"
          >
            <span>Explore residences</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
          </a>
        </Reveal>
      </div>
    </section>
  );
};
