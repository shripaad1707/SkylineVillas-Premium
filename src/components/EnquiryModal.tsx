import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Check, Calendar, Phone, Mail, User } from 'lucide-react';
import { DUR, EASE } from '../motion/tokens.ts';
import { lockScroll, unlockScroll } from '../motion/lenis.ts';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialResidence?: string;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  onClose,
  initialSubject = 'Private Viewing Appointment',
  initialResidence = 'Any Residence',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedResidence, setSelectedResidence] = useState(initialResidence);
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const reduced = useReducedMotion();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={initialSubject}
          onClick={onClose}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: DUR.quick, ease: EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 18 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-full max-w-xl bg-[#FCFAF6] text-[#191715] p-6 sm:p-10 border border-[#191715]/15 shadow-2xl my-8"
          >
        <button
          type="button"
          aria-label="Close enquiry form"
          onClick={onClose}
          className="absolute top-5 right-5 grid h-9 w-9 place-items-center text-[#191715]/60 hover:text-black hover:bg-black/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-black text-[#FCFAF6]">
              <Check className="h-6 w-6 stroke-[2.5]" />
            </div>
            <p className="text-[0.62rem] uppercase tracking-[0.25em] text-[#736E67] font-semibold mb-2">
              Appointment Requested
            </p>
            <h3 className="font-display text-3xl sm:text-4xl text-[#191715] font-normal mb-4">
              Thank you, {name || 'valued guest'}.
            </h3>
            <p className="text-sm leading-6 text-[#736E67] font-light max-w-md mx-auto mb-8">
              Your request for <strong className="text-black font-medium">{selectedResidence}</strong> has been received. Our senior residential advisor will connect with you shortly to coordinate your private presentation.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="btn-solid inline-flex items-center justify-center bg-black text-[#FCFAF6] hover:bg-black/80"
            >
              Return to Showcase
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.25em] text-[#736E67] font-semibold mb-2">
              Skyline Villas · Private Advisory
            </p>
            <h3 className="font-display text-2xl sm:text-3xl text-[#191715] font-normal mb-2">
              {initialSubject}
            </h3>
            <p className="text-xs text-[#736E67] font-light mb-7">
              Schedule a bespoke walkthrough or receive complete architectural plans, specifications and investment details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#736E67]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#FAF8F5] border border-[#191715]/20 pl-10 pr-4 py-2.5 text-sm text-[#191715] focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#736E67]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-[#FAF8F5] border border-[#191715]/20 pl-10 pr-4 py-2.5 text-sm text-[#191715] focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#736E67]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FAF8F5] border border-[#191715]/20 pl-10 pr-4 py-2.5 text-sm text-[#191715] focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                    Residence of Interest
                  </label>
                  <select
                    value={selectedResidence}
                    onChange={(e) => setSelectedResidence(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#191715]/20 px-3.5 py-2.5 text-sm text-[#191715] focus:outline-none focus:border-black"
                  >
                    <option value="Any Residence">All Villa Collections</option>
                    <option value="Skyline One">Skyline One (4 Beds, 4,200 sq.ft.)</option>
                    <option value="Skyline Two">Skyline Two (4 Beds, 3,800 sq.ft.)</option>
                    <option value="Skyline Three">Skyline Three (5 Beds, 5,000 sq.ft.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                    Preferred Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#736E67]" />
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#191715]/20 pl-10 pr-4 py-2.5 text-sm text-[#191715] focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] uppercase tracking-[0.18em] text-[#736E67] font-medium mb-1.5">
                  Specific Inquiries or Requirements
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your preferred schedule, spatial interests or customization questions..."
                  className="w-full bg-[#FAF8F5] border border-[#191715]/20 p-3 text-sm text-[#191715] focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="btn-solid w-full inline-flex items-center justify-center bg-black text-[#FCFAF6] hover:bg-black/90 shadow-sm"
                >
                  Submit Private Request
                </button>
                <p className="text-[0.6rem] text-center text-[#736E67] mt-3 font-light">
                  Your privacy is respected. Information is held in strict confidence.
                </p>
              </div>
            </form>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
