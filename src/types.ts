export interface Residence {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  longDescription: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  levels: string;
  image: string;
  features: string[];
  keyHighlights: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  spanClass: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
