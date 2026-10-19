import { RESIDENCES } from '../data.ts';
import type { Residence } from '../types.ts';

/**
 * Everything the concierge is allowed to state as fact. Skyline Villas is a
 * concept project, so prices here are indicative demo figures. Anything not
 * covered below (approvals, possession dates, exact plots) is handed to the
 * sales team instead of being guessed.
 *
 * The serverless AI route keeps its own copy of these facts in api/chat.js;
 * update both together.
 */

export type ResidenceId = 'skyline-one' | 'skyline-two' | 'skyline-three';

export interface ResidenceFacts {
  id: ResidenceId;
  /** Indicative starting price in crore INR. */
  fromCr: number;
  short: string;
  bestFor: string;
  facing: string;
}

export const RESIDENCE_FACTS: Record<ResidenceId, ResidenceFacts> = {
  'skyline-one': {
    id: 'skyline-one',
    fromCr: 6.2,
    short: '4 bedrooms · 5 baths · approx. 4,200 sq.ft. · 2 levels + terrace garden',
    bestFor: 'families who want open living, private gardens and lots of natural light',
    facing: 'east-facing, so the living spaces catch the morning light',
  },
  'skyline-two': {
    id: 'skyline-two',
    fromCr: 5.4,
    short: '4 bedrooms · 5 baths · approx. 3,800 sq.ft. · 2 levels',
    bestFor: 'buyers who want privacy and calm, built around a central courtyard',
    facing: 'planned around an inward-facing courtyard that shields wind and street noise',
  },
  'skyline-three': {
    id: 'skyline-three',
    fromCr: 8.6,
    short: '5 bedrooms · 6 baths · approx. 5,000 sq.ft. · 3 levels with private lift',
    bestFor: 'entertaining: 12 m heated lap pool, private cinema, wine cellar and a sky lounge',
    facing: 'set on a wider plot with a landscaped buffer on all four sides',
  },
};

export const PROJECT = {
  name: 'Skyline Villas',
  city: 'Hyderabad, Telangana',
  location:
    "the Financial District corridor in west Hyderabad, close to the Financial District and HITEC City offices, with Outer Ring Road access",
  airport: 'roughly 35 to 40 minutes to Rajiv Gandhi International Airport via the Outer Ring Road, depending on traffic',
  viewingHours: 'every day, 10 AM to 7 PM, by appointment',
  payment:
    'a booking amount followed by a construction-linked payment plan, and home loans are available through leading banks',
  nri: 'Many of our buyers live abroad. We do live video walkthroughs, share documents digitally, and paperwork can be completed remotely through a power of attorney. NRI home loans are also available.',
  amenities: [
    'Private landscaped gardens',
    'Indoor–outdoor living with sliding glass walls',
    'Premium materials: teak, natural stone, brushed brass',
    'Private parking with fast EV charging',
    'Smart-home climate, lighting and motorised louvres',
    'Gated community with landscaped walkways',
  ],
  whatsapp: '917893155092',
  builtBy: 'Shripaad Koduri',
  builtByUrl: 'https://shripaads-agency.vercel.app',
};

export const ORDER: ResidenceId[] = ['skyline-two', 'skyline-one', 'skyline-three'];

export function residence(id: ResidenceId): Residence {
  return RESIDENCES.find((r) => r.id === id)!;
}

export function priceLabel(id: ResidenceId) {
  return `₹${RESIDENCE_FACTS[id].fromCr.toFixed(1)} Cr`;
}

export function perSqftLabel(id: ResidenceId) {
  const r = residence(id);
  const sqft = Number(r.area.replace(/[^0-9]/g, ''));
  const perSqft = Math.round((RESIDENCE_FACTS[id].fromCr * 1e7) / sqft / 100) * 100;
  return `about ₹${perSqft.toLocaleString('en-IN')} per sq.ft`;
}
