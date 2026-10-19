import type { ResidenceId } from './knowledge.ts';
import type { Message, Profile, Widget } from './types.ts';
import { fmtDay, fmtTime } from './leads.ts';

/**
 * Optional AI mode. When the site's /api/chat route has a model configured it
 * answers free-form questions in any language; otherwise (or on any error)
 * the built-in engine answers instead, so the concierge never goes silent.
 */

const ACTIONS = [
  'none', 'show_residences', 'show_residence', 'compare', 'book_viewing', 'send_brochure',
  'request_callback', 'whatsapp', 'show_3d', 'show_gallery', 'show_location',
] as const;
type Action = (typeof ACTIONS)[number];

export interface AiTurn {
  reply: string;
  action: Action;
  residence: ResidenceId | null;
  chips: string[];
}

async function withTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function aiAvailable(): Promise<boolean> {
  try {
    const res = await withTimeout('/api/chat', { method: 'GET', headers: { Accept: 'application/json' } }, 4000);
    if (!res.ok) return false;
    const json = await res.json();
    return json?.ai === true;
  } catch {
    return false;
  }
}

function profileNote(p: Profile) {
  const bits: string[] = [];
  if (p.name) bits.push(`name ${p.name}`);
  if (p.residence) bits.push(`interested in ${p.residence}`);
  if (p.budgetCr) bits.push(`budget about ${p.budgetCr} crore`);
  if (p.purpose) bits.push(`buying for ${p.purpose}`);
  if (p.timeline) bits.push(`timeline ${p.timeline}`);
  if (p.viewing) bits.push(`viewing already requested for ${fmtDay(p.viewing.date)} ${fmtTime(p.viewing.time)} IST (${p.viewing.mode})`);
  if (p.phone || p.email) bits.push('contact details already shared');
  return bits.join('; ');
}

export async function askAi(history: Message[], profile: Profile): Promise<AiTurn | null> {
  const messages = history
    .filter((m) => m.text)
    .slice(-14)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text!.slice(0, 700) }));
  try {
    const res = await withTimeout(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ messages, visitor: profileNote(profile) }),
      },
      20000,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json?.reply !== 'string' || !json.reply.trim()) return null;
    const action: Action = ACTIONS.includes(json.action) ? json.action : 'none';
    const residence = ['skyline-one', 'skyline-two', 'skyline-three'].includes(json.residence) ? (json.residence as ResidenceId) : null;
    const chips = Array.isArray(json.chips) ? json.chips.filter((c: unknown) => typeof c === 'string' && c.length <= 40).slice(0, 3) : [];
    return { reply: json.reply.trim(), action, residence, chips };
  } catch {
    return null;
  }
}

export function actionWidget(turn: AiTurn): Widget | undefined {
  switch (turn.action) {
    case 'show_residences':
      return { kind: 'residences' };
    case 'show_residence':
      return turn.residence ? { kind: 'residence', id: turn.residence } : { kind: 'residences' };
    case 'compare':
      return { kind: 'compare' };
    case 'book_viewing':
      return { kind: 'booking' };
    case 'send_brochure':
      return { kind: 'lead', reason: 'brochure' };
    case 'request_callback':
      return { kind: 'lead', reason: 'callback' };
    case 'whatsapp':
      return { kind: 'links', links: [{ kind: 'whatsapp', label: 'Message the team on WhatsApp' }] };
    case 'show_3d':
      return { kind: 'links', links: [{ kind: 'scroll', label: 'Explore the villa in 3D', to: 'showcase' }] };
    case 'show_gallery':
      return { kind: 'links', links: [{ kind: 'scroll', label: 'Open the photo gallery', to: 'gallery' }] };
    case 'show_location':
      return { kind: 'links', links: [{ kind: 'scroll', label: 'See the location', to: 'location' }, { kind: 'whatsapp', label: 'Get the map pin on WhatsApp' }] };
    default:
      return undefined;
  }
}
