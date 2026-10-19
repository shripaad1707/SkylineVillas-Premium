import React, { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { Philosophy } from './components/Philosophy.tsx';
import { Architecture } from './components/Architecture.tsx';
import { Residences } from './components/Residences.tsx';
import { VillaShowcase } from './components/VillaShowcase.tsx';
import { LifeAtSkyline } from './components/LifeAtSkyline.tsx';
import { Amenities } from './components/Amenities.tsx';
import { LocationSection } from './components/LocationSection.tsx';
import { GallerySection } from './components/GallerySection.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { ContactSection } from './components/ContactSection.tsx';
import { Footer } from './components/Footer.tsx';
import { EnquiryModal } from './components/EnquiryModal.tsx';
import { ResidenceModal } from './components/ResidenceModal.tsx';
import { Preloader } from './components/Preloader.tsx';
import { Concierge } from './components/concierge/Concierge.tsx';
import { RESIDENCES } from './data.ts';
import { Residence } from './types.ts';
import { initLenis } from './motion/lenis.ts';

export default function App() {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquirySubject, setEnquirySubject] = useState('Private Viewing Appointment');
  const [enquiryResidence, setEnquiryResidence] = useState('Any Residence');

  const [selectedResidence, setSelectedResidence] = useState<Residence | null>(null);

  // Whole-page inertial smooth scrolling; a no-op under prefers-reduced-motion.
  useEffect(() => initLenis(), []);

  const handleOpenEnquiry = (subject = 'Private Viewing Appointment', residence = 'Any Residence') => {
    setEnquirySubject(subject);
    setEnquiryResidence(residence);
    setIsEnquiryOpen(true);
  };

  const handleResidenceEnquire = (residenceTitle: string) => {
    handleOpenEnquiry(`Enquiry for ${residenceTitle}`, residenceTitle);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#FCFAF6] text-[#191715] flex flex-col selection:bg-black selection:text-white">
      {/* Opening sequence: covers the first paint while the hero loads */}
      <Preloader />

      {/* Fixed Navigation Header */}
      <Navbar onOpenEnquiry={() => handleOpenEnquiry('Private Viewing Appointment')} />

      {/* Main Page Sections */}
      <main className="overflow-x-clip flex-1">
        <Hero />
        <Philosophy />
        <Architecture />
        <Residences onSelectResidence={(res) => setSelectedResidence(res)} />
        <VillaShowcase />
        <LifeAtSkyline />
        <Amenities />
        <LocationSection />
        <GallerySection />
        <FaqSection onOpenEnquiry={(subj) => handleOpenEnquiry(subj || 'Project Information')} />
        <ContactSection onOpenEnquiry={() => handleOpenEnquiry('Private Viewing Appointment')} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <EnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        initialSubject={enquirySubject}
        initialResidence={enquiryResidence}
      />

      <ResidenceModal
        residence={selectedResidence}
        onClose={() => setSelectedResidence(null)}
        onEnquire={handleResidenceEnquire}
      />

      {/* AI assistant: answers questions, books viewings, captures leads */}
      <Concierge onOpenResidence={(id) => setSelectedResidence(RESIDENCES.find((r) => r.id === id) ?? null)} />
    </div>
    </MotionConfig>
  );
}
