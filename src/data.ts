import { Residence, GalleryItem, FaqItem } from './types.ts';

export const RESIDENCES: Residence[] = [
  {
    id: 'skyline-one',
    code: '01',
    title: 'Skyline One',
    category: 'Contemporary family residence',
    description: 'An expansive residence built around open living, private gardens and generous natural light.',
    longDescription: 'Skyline One expresses modern residential proportion with soaring ceiling heights, seamless internal courtyards, and a deep connection between the central dining pavilion and perimeter landscaping. Designed for effortless family living and private contemplation.',
    bedrooms: 4,
    bathrooms: 5,
    area: 'Approx. 4,200 sq.ft.',
    levels: '2 Levels + Terrace Garden',
    image: '/images/skyline-living.jpg',
    features: [
      'Double-height formal lounge with floor-to-ceiling glazing',
      'Dual master suites with landscaped terrace access',
      'Custom European chef kitchen with concealed pantry',
      'Private internal reflecting pool and shaded deck',
      'Two-vehicle covered parking pavilion with EV charging'
    ],
    keyHighlights: [
      'Orientation: East-facing morning light capture',
      'Materials: Hand-hewn travertine, smoked walnut, black steel',
      'Acoustic glazing and climate-buffered stone envelopes'
    ]
  },
  {
    id: 'skyline-two',
    code: '02',
    title: 'Skyline Two',
    category: 'Private courtyard residence',
    description: 'A quieter expression of modern living, with a central courtyard connecting interior and landscape.',
    longDescription: 'Organized around a tranquil central atrium, Skyline Two allows nature to penetrate every room. The spatial choreography balances quiet personal sanctums with open social areas that look out directly toward water features and native flora.',
    bedrooms: 4,
    bathrooms: 5,
    area: 'Approx. 3,800 sq.ft.',
    levels: '2 Levels',
    image: '/images/skyline-pool.jpg',
    features: [
      'Enclosed perimeter courtyard with zen water installation',
      'Ground floor wellness wing and private plunge pool',
      'Minimalist timber cabinetry and concealed storage systems',
      'Upper-level library loft overlooking the courtyard canopy',
      'Integrated home automation for climate and dynamic lighting'
    ],
    keyHighlights: [
      'Internal garden microclimate with passive ventilation',
      'Materials: Brushed limestone, warm cedar slats, acoustic plaster',
      'Private courtyard shielding external sound and wind'
    ]
  },
  {
    id: 'skyline-three',
    code: '03',
    title: 'Skyline Three',
    category: 'Signature residence',
    description: 'A larger residence designed for entertaining, retreat and seamless indoor-outdoor living.',
    longDescription: 'The pinnacle expression of Skyline architecture, Skyline Three commands generous spatial depth and uncompromised privacy. Featuring expansive outdoor entertaining terraces, an infinity-edge private swimming pavilion, and grand gallery corridors designed for curated art collections.',
    bedrooms: 5,
    bathrooms: 6,
    area: 'Approx. 5,000 sq.ft.',
    levels: '3 Levels with Private Lift',
    image: '/images/skyline-aerial.jpg',
    features: [
      'Private 12-meter heated lap pool and timber sundeck',
      'Subterranean climate-controlled wine cellar and private cinema',
      'Penthouse master suite with private sky lounge & spa bath',
      'Dedicated staff quarters with separate access pathway',
      'Secure three-car underground motor court'
    ],
    keyHighlights: [
      '360-degree landscaped perimeter buffer',
      'Materials: Basalt stone, bronze metal screens, monolithic marble',
      'Private rooftop stargazing deck overlooking city silhouette'
    ]
  }
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'architecture',
    title: 'Architecture',
    category: 'Architecture',
    image: '/images/skyline-facade.jpg',
    spanClass: 'md:col-span-2 md:row-span-2',
    description: 'Walnut and concrete facade detail showcasing geometric proportions and natural material harmony.'
  },
  {
    id: 'interiors',
    title: 'Interiors',
    category: 'Interiors',
    image: '/images/skyline-kitchen.jpg',
    spanClass: '',
    description: 'Warm timber cabinetry, honed marble surfaces, and integrated architectural lighting.'
  },
  {
    id: 'stillness',
    title: 'Stillness',
    category: 'Stillness',
    image: '/images/skyline-bedroom.jpg',
    spanClass: '',
    description: 'Master sanctuary opening out to serene garden trees and soft filtered morning illumination.'
  },
  {
    id: 'landscape',
    title: 'Landscape',
    category: 'Landscape',
    image: '/images/skyline-pool.jpg',
    spanClass: 'md:col-span-2',
    description: 'Private lap pool framed by mature shade canopy and handcrafted natural stone pavers.'
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What types of residences are available?',
    answer: 'Skyline is presented through three conceptual villa types, each planned around a distinct way of living. Final availability and specifications would be confirmed by the developer.'
  },
  {
    question: 'Can the interiors be customized?',
    answer: 'A considered selection of finishes and interior options can form part of a future client brief, subject to project stage and technical review.'
  },
  {
    question: 'What is included with each residence?',
    answer: 'The concept includes private gardens, generous living spaces, parking and integrated infrastructure. Confirmed inclusions would be documented for a live development.'
  },
  {
    question: 'Can I schedule a private viewing?',
    answer: 'Yes. Use the enquiry link to request a private appointment or a personal project presentation.'
  },
  {
    question: 'Is the 3D experience available for every residence?',
    answer: 'The interactive experience is designed to support individual residence models as they become available.'
  },
  {
    question: 'How can I request the complete project information?',
    answer: 'Send a private enquiry and the project team can share the appropriate residence information and next steps.'
  }
];

export const AMENITIES_LIST = [
  { code: '01', title: 'Private Landscaped Gardens', desc: 'Curated native greenery and tranquil outdoor seating pockets designed by landscape architects.' },
  { code: '02', title: 'Expansive Living Spaces', desc: 'Continuous volumetric flow between formal entertaining, family dining, and reading spaces.' },
  { code: '03', title: 'Indoor–Outdoor Architecture', desc: 'Recessed sliding glass panels transforming living rooms into open-air verandas.' },
  { code: '04', title: 'Premium Material Palette', desc: 'Sustainable teak, honed natural stone, thermal-break double glazing, and brushed brass.' },
  { code: '05', title: 'Private Parking', desc: 'Generous private bays with dedicated fast EV charging stations and visitor accommodations.' },
  { code: '06', title: 'Integrated Smart Home Infrastructure', desc: 'Centralized climate management, motorized architectural louvers, and bespoke scene lighting.' }
];
