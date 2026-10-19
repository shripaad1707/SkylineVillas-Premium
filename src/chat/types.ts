import type { ResidenceId } from './knowledge.ts';

export type Purpose = 'family' | 'investment' | 'both';
export type Timeline = 'soon' | 'mid' | 'exploring';
export type LeadReason = 'viewing' | 'brochure' | 'callback';
export type ViewingMode = 'site' | 'video';

export interface Viewing {
  /** India-time calendar date, YYYY-MM-DD. */
  date: string;
  /** India-time clock time, HH:MM (24h). */
  time: string;
  mode: ViewingMode;
}

export interface Profile {
  name?: string;
  phone?: string;
  email?: string;
  residence?: ResidenceId;
  purpose?: Purpose;
  timeline?: Timeline;
  budgetCr?: number;
  viewing?: Viewing;
  askedPrice?: boolean;
}

export type PageTarget = 'showcase' | 'gallery' | 'location' | 'residences' | 'faq';

export type LinkAction =
  | { kind: 'scroll'; label: string; to: PageTarget }
  | { kind: 'whatsapp'; label: string }
  | { kind: 'external'; label: string; href: string };

export type Widget =
  | { kind: 'residences' }
  | { kind: 'residence'; id: ResidenceId }
  | { kind: 'compare' }
  | { kind: 'booking'; dayHint?: number; band?: 'morning' | 'afternoon' | 'evening'; mode?: ViewingMode }
  | { kind: 'lead'; reason: LeadReason }
  | { kind: 'confirmed'; reason: LeadReason; status: 'sent' | 'pending' | 'failed' }
  | { kind: 'summary'; reason: LeadReason }
  | { kind: 'links'; links: LinkAction[] };

export interface Message {
  id: string;
  role: 'bot' | 'user';
  text?: string;
  widget?: Widget;
  chips?: string[];
  /** Widgets that have been used are kept on screen but locked. */
  done?: boolean;
  at: number;
}

/** What the bot is waiting for a yes/no or short answer to. */
export type Pending = 'viewing' | 'brochure' | 'callback' | 'purpose' | 'timeline' | null;

export interface EngineState {
  profile: Profile;
  pending: Pending;
  lastResidence?: ResidenceId;
  greeted: boolean;
  turns: number;
}

export interface Reply {
  text?: string;
  widget?: Widget;
  chips?: string[];
}
