import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Bath, Bed, CalendarPlus, Check, Clock, Download, Layers, Loader2, Maximize, MessageCircle, Video, MapPin } from 'lucide-react';
import { ORDER, PROJECT, priceLabel, residence, type ResidenceId } from '../../chat/knowledge.ts';
import { leadScore } from '../../chat/engine.ts';
import {
  addDays,
  downloadIcs,
  fmtDay,
  fmtTime,
  googleCalendarUrl,
  istToday,
  localEquivalent,
  summaryRows,
  weekday,
  whatsappUrl,
} from '../../chat/leads.ts';
import type { LeadReason, LinkAction, Profile, Viewing, ViewingMode, Widget } from '../../chat/types.ts';

export interface WidgetHandlers {
  profile: Profile;
  onOpenResidence: (id: ResidenceId) => void;
  onBookResidence: (id: ResidenceId) => void;
  onBooked: (v: Viewing, residence: ResidenceId | undefined) => void;
  onLead: (reason: LeadReason, details: { name: string; phone: string; email: string }) => Promise<void>;
  onLink: (link: LinkAction) => void;
}

const SHORT: Record<ResidenceId, string> = { 'skyline-one': 'One', 'skyline-two': 'Two', 'skyline-three': 'Three' };

const card = 'rounded-[18px] border border-[#191715]/10 bg-white shadow-[0_10px_30px_-18px_rgba(25,23,21,0.35)]';
const btnSolid =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-[#191715] px-3.5 py-2 text-[12px] font-medium tracking-[0.02em] text-[#FCFAF6] transition-colors duration-300 hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
const btnLine =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#191715]/20 px-3.5 py-2 text-[12px] font-medium tracking-[0.02em] text-[#191715] transition-colors duration-300 hover:border-[#191715] disabled:cursor-not-allowed disabled:opacity-40';
const label = 'mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#8A847B]';

// ---------------------------------------------------------------------------

const ResidenceCards: React.FC<{ h: WidgetHandlers }> = ({ h }) => (
  <div data-lenis-prevent className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
    {ORDER.map((id) => {
      const r = residence(id);
      return (
        <article key={id} className={`${card} w-[212px] shrink-0 snap-start overflow-hidden`}>
          <button type="button" onClick={() => h.onOpenResidence(id)} className="block w-full text-left" aria-label={`Open details for ${r.title}`}>
            <img src={r.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          </button>
          <div className="p-3.5">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#A88B5E]">{r.category.replace(' residence', '')}</p>
            <h4 className="mt-1 font-display text-[22px] leading-tight text-[#191715]">{r.title}</h4>
            <p className="mt-1 text-[12px] text-[#736E67]">
              {r.bedrooms} bed · {r.bathrooms} bath · {r.area.replace('Approx. ', '')}
            </p>
            <p className="mt-2 text-[13px] text-[#191715]">
              From <span className="font-semibold">{priceLabel(id)}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={btnLine} onClick={() => h.onOpenResidence(id)}>
                Details
              </button>
              <button type="button" className={btnSolid} onClick={() => h.onBookResidence(id)}>
                Book a viewing
              </button>
            </div>
          </div>
        </article>
      );
    })}
  </div>
);

const ResidenceCard: React.FC<{ id: ResidenceId; h: WidgetHandlers }> = ({ id, h }) => {
  const r = residence(id);
  return (
    <article className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => h.onOpenResidence(id)} className="relative block w-full text-left" aria-label={`Open details for ${r.title}`}>
        <img src={r.image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-[#FCFAF6] backdrop-blur-sm">
          From {priceLabel(id)}
        </span>
      </button>
      <div className="p-3.5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#A88B5E]">{r.category}</p>
        <h4 className="mt-1 font-display text-[24px] leading-tight text-[#191715]">{r.title}</h4>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-[#4A4640]">
          <span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5 text-[#A88B5E]" />{r.bedrooms} bedrooms</span>
          <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-[#A88B5E]" />{r.bathrooms} bathrooms</span>
          <span className="flex items-center gap-1.5"><Maximize className="h-3.5 w-3.5 text-[#A88B5E]" />{r.area.replace('Approx. ', '')}</span>
          <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-[#A88B5E]" />{r.levels}</span>
        </div>
        <ul className="mt-3 space-y-1 border-t border-[#191715]/10 pt-3 text-[12.5px] leading-snug text-[#4A4640]">
          {r.features.slice(0, 3).map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#A88B5E]" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button type="button" className={btnSolid} onClick={() => h.onBookResidence(id)}>
            Book a viewing
          </button>
          <button type="button" className={btnLine} onClick={() => h.onOpenResidence(id)}>
            Full details
          </button>
        </div>
      </div>
    </article>
  );
};

const Compare: React.FC<{ h: WidgetHandlers }> = ({ h }) => {
  const rows: [string, (id: ResidenceId) => string][] = [
    ['From', (id) => priceLabel(id)],
    ['Bedrooms', (id) => String(residence(id).bedrooms)],
    ['Size', (id) => residence(id).area.replace('Approx. ', '').replace(' sq.ft.', '')],
    ['Levels', (id) => (id === 'skyline-three' ? '3 + lift' : id === 'skyline-one' ? '2 + terrace' : '2')],
    ['Best for', (id) => (id === 'skyline-one' ? 'Open family living' : id === 'skyline-two' ? 'Privacy and calm' : 'Entertaining')],
  ];
  return (
    <div className={`${card} overflow-hidden`}>
      <table className="w-full table-fixed text-left text-[12px]">
        <thead>
          <tr className="bg-[#F4F0E8]">
            <th className="w-[26%] px-3 py-2.5 font-medium text-[#8A847B]" />
            {ORDER.map((id) => (
              <th key={id} className="px-2 py-2.5">
                <button type="button" onClick={() => h.onOpenResidence(id)} className="font-display text-[16px] font-normal leading-none text-[#191715] underline-offset-4 hover:underline">
                  {SHORT[id]}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value]) => (
            <tr key={name} className="border-t border-[#191715]/8">
              <td className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#8A847B]">{name}</td>
              {ORDER.map((id) => (
                <td key={id} className={`px-2 py-2 leading-snug text-[#191715] ${name === 'From' ? 'font-semibold' : ''}`}>
                  {value(id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------

const TIMES = ['10:00', '11:30', '13:00', '15:00', '16:30', '18:00'];
const BANDS = { morning: ['10:00', '11:30'], afternoon: ['13:00', '15:00'], evening: ['16:30', '18:00'] };

const Booking: React.FC<{ w: Extract<Widget, { kind: 'booking' }>; done?: boolean; h: WidgetHandlers }> = ({ w, done, h }) => {
  const today = useMemo(() => istToday(), []);
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(today.date, i)), [today]);
  const timeOpen = (date: string, time: string) => {
    if (date !== today.date) return true;
    const [hh, mm] = time.split(':').map(Number);
    return hh * 60 + mm >= today.minutes + 120;
  };
  const dayOpen = (date: string) => TIMES.some((t) => timeOpen(date, t));

  const initialDay = useMemo(() => {
    if (w.dayHint === undefined) return undefined;
    if (w.dayHint >= 0) return days[Math.min(w.dayHint, days.length - 1)];
    const wd = -w.dayHint - 1;
    return days.find((d) => weekday(d) === wd && dayOpen(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [day, setDay] = useState<string | undefined>(initialDay && dayOpen(initialDay) ? initialDay : undefined);
  const [time, setTime] = useState<string | undefined>(() => {
    if (!initialDay || !w.band) return undefined;
    return BANDS[w.band].find((t) => timeOpen(initialDay, t));
  });
  const [mode, setMode] = useState<ViewingMode>(w.mode ?? h.profile.viewing?.mode ?? 'site');
  const [res, setRes] = useState<ResidenceId | undefined>(h.profile.residence);
  const local = day && time ? localEquivalent(day, time) : null;

  if (done && h.profile.viewing) {
    return (
      <div className={`${card} flex items-center gap-3 px-3.5 py-3 text-[12.5px] text-[#4A4640]`}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#191715] text-[#FCFAF6]">
          <Check className="h-3.5 w-3.5" />
        </span>
        Slot reserved: {fmtDay(h.profile.viewing.date)}, {fmtTime(h.profile.viewing.time)} India time
      </div>
    );
  }

  return (
    <div className={`${card} p-3.5`}>
      <p className={label}>Residence</p>
      <div className="flex flex-wrap gap-1.5">
        {[undefined, ...ORDER].map((id) => (
          <button
            key={id ?? 'any'}
            type="button"
            disabled={done}
            onClick={() => setRes(id)}
            aria-pressed={res === id}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors duration-300 ${
              res === id ? 'border-[#191715] bg-[#191715] text-[#FCFAF6]' : 'border-[#191715]/15 text-[#191715] hover:border-[#191715]/50'
            }`}
          >
            {id ? `Skyline ${SHORT[id]}` : 'Not sure yet'}
          </button>
        ))}
      </div>

      <p className={`${label} mt-4`}>Day</p>
      <div data-lenis-prevent className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none]">
        {days.map((d) => {
          const open = dayOpen(d);
          const [, , dd] = d.split('-');
          const selected = day === d;
          return (
            <button
              key={d}
              type="button"
              disabled={!open || done}
              onClick={() => {
                setDay(d);
                if (time && !timeOpen(d, time)) setTime(undefined);
              }}
              aria-pressed={selected}
              aria-label={fmtDay(d, 'long')}
              className={`flex h-[66px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[14px] border transition-colors duration-300 ${
                selected
                  ? 'border-[#191715] bg-[#191715] text-[#FCFAF6]'
                  : 'border-[#191715]/12 text-[#191715] hover:border-[#191715]/50 disabled:opacity-35'
              }`}
            >
              <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] opacity-70">
                {d === today.date ? 'Today' : fmtDay(d).split(' ')[0]}
              </span>
              <span className="font-display text-[22px] leading-none">{Number(dd)}</span>
              <span className="text-[9.5px] uppercase tracking-[0.12em] opacity-60">{fmtDay(d).split(' ')[2]}</span>
            </button>
          );
        })}
      </div>

      <p className={`${label} mt-3.5`}>Time · India time (IST)</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TIMES.map((t) => {
          const open = day ? timeOpen(day, t) : true;
          return (
            <button
              key={t}
              type="button"
              disabled={!day || !open || done}
              onClick={() => setTime(t)}
              aria-pressed={time === t}
              className={`rounded-[12px] border py-2 text-[12.5px] transition-colors duration-300 ${
                time === t
                  ? 'border-[#191715] bg-[#191715] text-[#FCFAF6]'
                  : 'border-[#191715]/12 text-[#191715] hover:border-[#191715]/50 disabled:opacity-35'
              }`}
            >
              {fmtTime(t)}
            </button>
          );
        })}
      </div>

      <p className={`${label} mt-3.5`}>How would you like to see it?</p>
      <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F4F0E8] p-1">
        {(['site', 'video'] as ViewingMode[]).map((m) => (
          <button
            key={m}
            type="button"
            disabled={done}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium transition-all duration-300 ${
              mode === m ? 'bg-white text-[#191715] shadow-sm' : 'text-[#736E67] hover:text-[#191715]'
            }`}
          >
            {m === 'site' ? <MapPin className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
            {m === 'site' ? 'Site visit' : 'Video walkthrough'}
          </button>
        ))}
      </div>

      {local && <p className="mt-3 text-[12px] text-[#736E67]">That is {local}.</p>}

      <button
        type="button"
        disabled={!day || !time || done}
        onClick={() => day && time && h.onBooked({ date: day, time, mode }, res)}
        className={`${btnSolid} mt-3.5 w-full py-2.5 text-[12.5px]`}
      >
        {day && time ? `Reserve ${fmtDay(day)}, ${fmtTime(time)}` : 'Choose a day and time'}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------

const LEAD_COPY: Record<LeadReason, { title: string; button: string }> = {
  viewing: { title: 'Who should we expect, and where do we send the confirmation?', button: 'Confirm viewing request' },
  brochure: { title: 'Where should we send the brochure and price sheet?', button: 'Send me the brochure' },
  callback: { title: 'How can an advisor reach you?', button: 'Request a call back' },
};

const LeadForm: React.FC<{ reason: LeadReason; done?: boolean; h: WidgetHandlers }> = ({ reason, done, h }) => {
  const [name, setName] = useState(h.profile.name ?? '');
  const [phone, setPhone] = useState(h.profile.phone ?? '');
  const [email, setEmail] = useState(h.profile.email ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const copy = LEAD_COPY[reason];

  if (done) {
    return (
      <div className={`${card} flex items-center gap-3 px-3.5 py-3 text-[12.5px] text-[#4A4640]`}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#191715] text-[#FCFAF6]">
          <Check className="h-3.5 w-3.5" />
        </span>
        Details shared{h.profile.name ? ` for ${h.profile.name}` : ''}.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const digits = phone.replace(/\D/g, '');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (name.trim().length < 2) next.name = 'Please add your name.';
    if (reason === 'brochure') {
      if (!digits && !email.trim()) next.phone = 'Add a WhatsApp number or an email.';
      if (digits && (digits.length < 8 || digits.length > 15)) next.phone = 'Please check this number.';
      if (email.trim() && !emailOk) next.email = 'Please check this email.';
    } else {
      if (digits.length < 8 || digits.length > 15) next.phone = 'Please add a number we can call or WhatsApp.';
      if (email.trim() && !emailOk) next.email = 'Please check this email.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    await h.onLead(reason, { name: name.trim(), phone: phone.trim(), email: email.trim() });
    setBusy(false);
  };

  const field = (hasError: boolean) =>
    `w-full rounded-[12px] border bg-[#FAF8F5] px-3 py-2.5 text-[16px] text-[#191715] sm:text-[14px] placeholder:text-[#A39E96] focus:border-[#191715] focus:outline-none ${
      hasError ? 'border-[#B4532A]' : 'border-[#191715]/15'
    }`;

  return (
    <form onSubmit={submit} className={`${card} space-y-2.5 p-3.5`} noValidate>
      <p className="text-[13px] font-medium leading-snug text-[#191715]">{copy.title}</p>
      <div>
        <input aria-label="Your name" className={field(Boolean(errors.name))} placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className="mt-1 text-[11.5px] text-[#B4532A]">{errors.name}</p>}
      </div>
      <div>
        <input
          aria-label="Mobile or WhatsApp number"
          className={field(Boolean(errors.phone))}
          placeholder="Mobile / WhatsApp, e.g. +91 98765 43210"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {errors.phone && <p className="mt-1 text-[11.5px] text-[#B4532A]">{errors.phone}</p>}
      </div>
      <div>
        <input
          aria-label="Email (optional)"
          className={field(Boolean(errors.email))}
          placeholder={reason === 'brochure' ? 'Email' : 'Email (optional)'}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <p className="mt-1 text-[11.5px] text-[#B4532A]">{errors.email}</p>}
      </div>
      <button type="submit" disabled={busy} className={`${btnSolid} w-full py-2.5 text-[12.5px]`}>
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending
          </>
        ) : (
          copy.button
        )}
      </button>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <p className="text-[10.5px] leading-snug text-[#8A847B]">Demo site: your request goes to {PROJECT.builtBy}, who built it.</p>
        <a href={whatsappUrl(h.profile, reason)} target="_blank" rel="noreferrer" className="shrink-0 text-[11.5px] font-medium text-[#191715] underline underline-offset-4">
          Use WhatsApp
        </a>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------

const Confirmed: React.FC<{ w: Extract<Widget, { kind: 'confirmed' }>; h: WidgetHandlers }> = ({ w, h }) => {
  const p = h.profile;
  const v = w.reason === 'viewing' ? p.viewing : undefined;
  const failed = w.status === 'failed';
  const title = failed
    ? 'Almost there'
    : w.reason === 'viewing'
      ? v?.mode === 'video'
        ? 'Video walkthrough requested'
        : 'Viewing requested'
      : w.reason === 'brochure'
        ? 'Brochure requested'
        : 'Call back requested';
  const local = v ? localEquivalent(v.date, v.time) : null;
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-[#191715]/8 bg-[#F4F0E8] px-3.5 py-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${failed ? 'bg-[#B4532A]' : 'bg-[#191715]'} text-[#FCFAF6]`}>
          {failed ? <MessageCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </span>
        <div>
          <p className="font-display text-[19px] leading-tight text-[#191715]">{title}</p>
          <p className="text-[11.5px] text-[#736E67]">{p.residence ? residence(p.residence).title : 'Skyline Villas'}</p>
        </div>
      </div>
      <div className="space-y-2 px-3.5 py-3 text-[12.5px] text-[#4A4640]">
        {v && (
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A88B5E]" />
            <span>
              {fmtDay(v.date, 'long')}, {fmtTime(v.time)} India time · {v.mode === 'video' ? 'Video walkthrough' : 'Site visit'}
              {local && <span className="block text-[#8A847B]">{local}</span>}
            </span>
          </p>
        )}
        <p>
          {failed
            ? "We couldn't send this automatically. Please tap WhatsApp below so the team has your request."
            : w.reason === 'viewing'
              ? 'The team will confirm on WhatsApp shortly and share the directions.'
              : w.reason === 'brochure'
                ? `The team will send the brochure, floor plans and price sheet to ${p.email || p.phone}.`
                : `An advisor will call ${p.phone} shortly.`}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {v && !failed && (
            <>
              <a href={googleCalendarUrl(v, p)} target="_blank" rel="noreferrer" className={btnSolid}>
                <CalendarPlus className="h-3.5 w-3.5" /> Google Calendar
              </a>
              <button type="button" onClick={() => downloadIcs(v, p)} className={btnLine}>
                <Download className="h-3.5 w-3.5" /> Apple / Outlook
              </button>
            </>
          )}
          <a href={whatsappUrl(p, w.reason)} target="_blank" rel="noreferrer" className={failed ? btnSolid : btnLine}>
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp the team
          </a>
        </div>
      </div>
    </div>
  );
};

const Summary: React.FC<{ reason: LeadReason; h: WidgetHandlers }> = ({ reason, h }) => {
  const p = h.profile;
  const score = leadScore(p);
  const rows = summaryRows(p, reason).filter(([k]) => k !== 'Lead');
  const steps =
    reason === 'viewing'
      ? [
          ['done', 'Instant confirmation to the buyer'],
          ['done', 'Lead summary emailed to the sales team'],
          ['next', 'WhatsApp reminder 24 hours before the visit'],
          ['next', 'Thank-you and follow-up the morning after'],
        ]
      : [
          ['done', 'Instant reply to the buyer'],
          ['done', 'Lead summary emailed to the sales team'],
          ['next', reason === 'brochure' ? 'Brochure and price sheet sent automatically' : 'Call scheduled with the right advisor'],
          ['next', 'Gentle follow-up in 2 days if there is no reply'],
        ];
  return (
    <div className="overflow-hidden rounded-[18px] bg-[#141210] text-[#F3EFEA] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#C5A880]">Demo · team view</p>
          <p className="mt-0.5 font-display text-[18px] leading-tight">What your sales team receives</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            score.label === 'Hot' ? 'bg-[#C5A880] text-[#141210]' : score.label === 'Warm' ? 'bg-[#F3EFEA] text-[#141210]' : 'bg-white/15 text-[#F3EFEA]'
          }`}
        >
          {score.label} lead
        </span>
      </div>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 px-3.5 py-3 text-[12px]">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-[#9E9890]">{k}</dt>
            <dd className="min-w-0 break-words text-[#F3EFEA]">{v}</dd>
          </React.Fragment>
        ))}
        <dt className="text-[#9E9890]">Why</dt>
        <dd className="text-[#F3EFEA]">{score.why}</dd>
      </dl>
      <div className="border-t border-white/10 px-3.5 py-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#9E9890]">Automatic next steps</p>
        <ul className="space-y-1.5 text-[12px]">
          {steps.map(([state, text]) => (
            <li key={text} className="flex items-center gap-2">
              {state === 'done' ? (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#C5A880] text-[#141210]">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : (
                <span className="grid h-4 w-4 place-items-center rounded-full border border-white/30">
                  <Clock className="h-2.5 w-2.5 text-[#C5A880]" />
                </span>
              )}
              <span className={state === 'done' ? 'text-[#F3EFEA]' : 'text-[#C9C3BA]'}>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[10.5px] leading-snug text-[#8F897F]">Reminders and follow-ups switch on in a live setup, by email, WhatsApp or your CRM.</p>
      </div>
    </div>
  );
};

const Links: React.FC<{ links: LinkAction[]; h: WidgetHandlers }> = ({ links, h }) => (
  <div className="flex flex-wrap gap-2">
    {links.map((l) =>
      l.kind === 'external' ? (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={btnSolid}>
          {l.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      ) : l.kind === 'whatsapp' ? (
        <a key={l.label} href={whatsappUrl(h.profile)} target="_blank" rel="noreferrer" className={btnLine}>
          <MessageCircle className="h-3.5 w-3.5" /> {l.label}
        </a>
      ) : (
        <button key={l.label} type="button" onClick={() => h.onLink(l)} className={btnSolid}>
          {l.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      ),
    )}
  </div>
);

export const WidgetView: React.FC<{ w: Widget; done?: boolean; h: WidgetHandlers }> = ({ w, done, h }) => {
  switch (w.kind) {
    case 'residences':
      return <ResidenceCards h={h} />;
    case 'residence':
      return <ResidenceCard id={w.id} h={h} />;
    case 'compare':
      return <Compare h={h} />;
    case 'booking':
      return <Booking w={w} done={done} h={h} />;
    case 'lead':
      return <LeadForm reason={w.reason} done={done} h={h} />;
    case 'confirmed':
      return <Confirmed w={w} h={h} />;
    case 'summary':
      return <Summary reason={w.reason} h={h} />;
    case 'links':
      return <Links links={w.links} h={h} />;
    default:
      return null;
  }
};

