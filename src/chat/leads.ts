import { PROJECT, residence } from './knowledge.ts';
import { leadScore } from './engine.ts';
import type { LeadReason, Message, Profile, Viewing } from './types.ts';

/**
 * Lead delivery. Every viewing request, brochure request and call-back from
 * the concierge or the enquiry form is emailed to the inbox below as a tidy
 * table: the "lead summary" a sales team would receive.
 *
 * The first submission from a new site address makes FormSubmit send a one-time
 * "Activate Form" email to that inbox; nothing is delivered until it is clicked.
 */
const LEAD_INBOX = 'shripaad17@gmail.com';
const ENDPOINT = `https://formsubmit.co/ajax/${LEAD_INBOX}`;

export type SendStatus = 'sent' | 'pending' | 'failed';

export async function sendLead(subject: string, fields: Record<string, string>): Promise<SendStatus> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...fields, _subject: subject, _template: 'table', _captcha: 'false' }),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && String(json.success) === 'true') return 'sent';
    // Delivery is switched on by a one-time activation email; until then the
    // request is accepted but held.
    if (/activat/i.test(String(json.message ?? ''))) return 'pending';
    return 'failed';
  } catch {
    return 'failed';
  } finally {
    window.clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// India time. Viewings happen on site in Hyderabad, so every slot is set in
// IST and converted for buyers abroad.
// ---------------------------------------------------------------------------

export const IST_OFFSET_MIN = 330;

export function istToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const date = `${get('year')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}`;
  return { date, minutes: (get('hour') % 24) * 60 + get('minute') };
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n, 12));
  return t.toISOString().slice(0, 10);
}

export function weekday(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function fmtDay(date: string, style: 'short' | 'long' = 'short') {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function fmtTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function slotToUtc(date: string, time: string) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MIN * 60000);
}

/** The slot in the buyer's own time zone, when that differs from India. */
export function localEquivalent(date: string, time: string) {
  const start = slotToUtc(date, time);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!zone || zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return null;
  if (-start.getTimezoneOffset() === IST_OFFSET_MIN) return null;
  const label = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short' }).format(start);
  const city = zone.split('/').pop()?.replace(/_/g, ' ');
  return `${label.replace(/ ?([ap]m)$/i, (s) => s.toUpperCase())} in ${city}`;
}

export function viewingLabel(v: Viewing) {
  return `${fmtDay(v.date, 'long')}, ${fmtTime(v.time)} India time · ${v.mode === 'video' ? 'Video walkthrough' : 'Site visit'}`;
}

// ---------------------------------------------------------------------------
// Calendar invites and WhatsApp hand-off
// ---------------------------------------------------------------------------

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function eventText(v: Viewing, p: Profile) {
  const home = p.residence ? residence(p.residence).title : 'Skyline Villas';
  const title = `${v.mode === 'video' ? 'Video walkthrough' : 'Private viewing'}: ${home}`;
  const details = [
    `${v.mode === 'video' ? 'Video walkthrough' : 'Private site viewing'} of ${home}, Skyline Villas.`,
    p.name ? `Guest: ${p.name}${p.phone ? `, ${p.phone}` : ''}` : '',
    v.mode === 'video' ? 'The video call link will be shared on WhatsApp before the walkthrough.' : 'The team will share the map pin on WhatsApp before your visit.',
  ]
    .filter(Boolean)
    .join('\n');
  return { title, details, location: v.mode === 'video' ? 'Video call' : 'Skyline Villas, Financial District corridor, Hyderabad' };
}

export function googleCalendarUrl(v: Viewing, p: Profile) {
  const start = slotToUtc(v.date, v.time);
  const end = new Date(start.getTime() + 45 * 60000);
  const e = eventText(v, p);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: e.details,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function downloadIcs(v: Viewing, p: Profile) {
  const start = slotToUtc(v.date, v.time);
  const end = new Date(start.getTime() + 45 * 60000);
  const e = eventText(v, p);
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skyline Villas//Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@skylinevillas`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.details)}`,
    `LOCATION:${esc(e.location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Skyline Villas viewing in 2 hours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skyline-villas-viewing.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function whatsappUrl(p: Profile, reason?: LeadReason) {
  const home = p.residence ? residence(p.residence).title : 'Skyline Villas';
  let text = `Hi, I'm interested in ${home}.`;
  if (reason === 'viewing' && p.viewing) text = `Hi, I've just requested a ${p.viewing.mode === 'video' ? 'video walkthrough' : 'site visit'} of ${home} on ${fmtDay(p.viewing.date)} at ${fmtTime(p.viewing.time)}. Could you confirm?`;
  else if (reason === 'brochure') text = `Hi, could you send me the brochure and price sheet for ${home}?`;
  if (p.name) text += ` (${p.name})`;
  return `https://wa.me/${PROJECT.whatsapp}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// The summary the sales team receives
// ---------------------------------------------------------------------------

const PURPOSE = { family: 'Own family home', investment: 'Investment', both: 'Home and investment' } as const;
const TIMELINE = { soon: 'Within 3 months', mid: '3 to 6 months', exploring: 'Just exploring' } as const;
const REASON = { viewing: 'Private viewing', brochure: 'Brochure, floor plans and price sheet', callback: 'Call back from an advisor' } as const;

export function summaryRows(p: Profile, reason: LeadReason): [string, string][] {
  const score = leadScore(p);
  const rows: [string, string][] = [
    ['Lead', `${score.label} · ${score.why}`],
    ['Request', REASON[reason]],
    ['Name', p.name || 'Not given'],
    ['Phone / WhatsApp', p.phone || 'Not given'],
    ['Email', p.email || 'Not given'],
    ['Interested in', p.residence ? residence(p.residence).title : 'Not decided yet'],
  ];
  if (p.viewing) rows.push(['Viewing', viewingLabel(p.viewing)]);
  if (p.budgetCr) rows.push(['Budget', p.budgetCr < 1 ? `About ₹${Math.round(p.budgetCr * 100)} lakh` : `About ₹${p.budgetCr.toFixed(1)} Cr`]);
  if (p.purpose) rows.push(['Buying for', PURPOSE[p.purpose]]);
  if (p.timeline) rows.push(['Timeline', TIMELINE[p.timeline]]);
  return rows;
}

export function leadEmail(p: Profile, reason: LeadReason, history: Message[], source: string) {
  const rows = summaryRows(p, reason);
  const fields: Record<string, string> = Object.fromEntries(rows);
  if (p.viewing) fields['Add to your calendar'] = googleCalendarUrl(p.viewing, p);
  const transcript = history
    .filter((m) => m.text)
    .slice(-14)
    .map((m) => `${m.role === 'user' ? 'Buyer' : 'Assistant'}: ${m.text!.replace(/\*\*/g, '')}`)
    .join('\n');
  if (transcript) fields['Conversation'] = transcript;
  fields['Source'] = source;
  fields['Page'] = window.location.href;
  if (p.email) fields._replyto = p.email;
  const who = p.name || 'a website visitor';
  const subject =
    reason === 'viewing' && p.viewing
      ? `Skyline Villas: viewing request from ${who} (${fmtDay(p.viewing.date)}, ${fmtTime(p.viewing.time)})`
      : `Skyline Villas: ${reason === 'brochure' ? 'brochure request' : 'call-back request'} from ${who}`;
  return { subject, fields };
}
