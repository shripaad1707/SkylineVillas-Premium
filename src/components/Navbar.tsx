import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { EASE, DUR } from '../motion/tokens.ts';
import { lockScroll, unlockScroll } from '../motion/lenis.ts';

interface NavbarProps {
  onOpenEnquiry: () => void;
}

/** Two bars that morph into an X: each moves 4px toward the centre and rotates 45 degrees. */
const MenuIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <span className="relative block h-4 w-5" aria-hidden="true">
    <motion.span
      className="absolute left-0 right-0 top-[4px] h-px bg-current"
      animate={open ? { y: 4, rotate: 45 } : { y: 0, rotate: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    />
    <motion.span
      className="absolute left-0 right-0 top-[12px] h-px bg-current"
      animate={open ? { y: -4, rotate: -45 } : { y: 0, rotate: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    />
  </span>
);

export const Navbar: React.FC<NavbarProps> = ({ onOpenEnquiry }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const next = window.scrollY > 60;
        setIsScrolled((prev) => (prev !== next ? next : prev));
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock the page and pause smooth scroll while the menu is open; Escape closes it.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Philosophy', href: '#philosophy' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Residences', href: '#residences' },
    // The 3D section was removed, so Experience points at Life at Skyline.
    { label: 'Experience', href: '#life' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <>
      <motion.header
        id="main-header"
        initial={reduced ? false : { y: -12, opacity: 0 }}
        animate={reduced ? undefined : { y: 0, opacity: 1 }}
        transition={{ duration: DUR.base, delay: 0.2, ease: EASE }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-expo ${
          isScrolled
            ? 'bg-[#191715]/90 backdrop-blur-md text-[#FCFAF6] shadow-sm py-4 border-b border-[#FCFAF6]/10'
            : 'bg-gradient-to-b from-black/60 to-transparent text-[#FCFAF6] py-6'
        }`}
      >
        <div className="content-shell flex items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Brand Logo */}
          <a href="#top" id="nav-brand-logo" className="group inline-flex items-center gap-2">
            <span className="font-display text-lg sm:text-xl uppercase tracking-[0.18em] transition-opacity duration-500 ease-expo group-hover:opacity-80">
              Skyline Villas
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav id="desktop-nav" className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="nav-underline btn-label text-[#FCFAF6]/75 hover:text-[#FCFAF6] transition-colors duration-500 ease-expo py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">
            <button
              id="nav-private-enquiry-btn"
              type="button"
              onClick={onOpenEnquiry}
              className="group link-underline btn-label hidden sm:inline-flex items-center gap-2.5 pb-1 text-[#FCFAF6]"
            >
              <span>Private enquiry</span>
              <ArrowRight className="h-3 w-3 transition-transform duration-700 ease-expo group-hover:translate-x-1" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid h-10 w-10 place-items-center rounded-none text-[#FCFAF6] hover:bg-white/10 transition-colors duration-500 ease-expo lg:hidden"
            >
              <MenuIcon open={mobileMenuOpen} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-drawer"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-0 z-[60] flex flex-col bg-black text-[#FCFAF6] lg:hidden"
          >
            <div className="flex h-20 items-center justify-between px-5 border-b border-[#FCFAF6]/10">
              <span className="font-display text-lg uppercase tracking-[0.16em]">Skyline Villas</span>
              <button
                id="mobile-menu-close-btn"
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="grid h-10 w-10 place-items-center text-[#FCFAF6] hover:bg-white/10"
              >
                <MenuIcon open />
              </button>
            </div>

            <nav
              data-lenis-prevent
              className="flex flex-col py-6 px-7 space-y-5 overflow-y-auto flex-1"
            >
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.base, delay: 0.08 + i * 0.06, ease: EASE }}
                  className="text-base tracking-[0.12em] uppercase font-light text-[#FCFAF6]/90 hover:text-white py-2 border-b border-[#FCFAF6]/10"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            <motion.button
              id="mobile-drawer-enquiry-btn"
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenEnquiry();
              }}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DUR.base,
                delay: 0.08 + navLinks.length * 0.06,
                ease: EASE,
              }}
              className="m-7 flex items-center justify-between border-t border-[#FCFAF6]/20 pt-5 btn-label text-[#FCFAF6] hover:text-white"
            >
              <span>Private enquiry</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
