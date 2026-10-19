import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, ChevronDown, Mic, Square, Volume2, VolumeX, X, MessageCircle } from 'lucide-react';
import { EASE } from '../../motion/tokens.ts';
import { getLenis, lockScroll, unlockScroll } from '../../motion/lenis.ts';
import { useIntroDone } from '../../motion/intro.ts';
import { PROJECT, residence, type ResidenceId } from '../../chat/knowledge.ts';
import { findEmail, findPhone, initialState, respond, welcome } from '../../chat/engine.ts';
import { actionWidget, aiAvailable, askAi } from '../../chat/ai.ts';
import { fmtDay, fmtTime, leadEmail, sendLead, whatsappUrl } from '../../chat/leads.ts';
import { createRecognizer, speak, speechInputSupported, speechOutputSupported, stopSpeaking } from '../../chat/voice.ts';
import type { EngineState, LeadReason, LinkAction, Message, Reply, Viewing } from '../../chat/types.ts';
import { WidgetView, type WidgetHandlers } from './Widgets.tsx';

/**
 * Skyline Concierge: the floating AI sales assistant.
 *
 * Answers buyer questions, shows the residences, qualifies the buyer, books
 * viewings (with calendar invites), captures leads to the sales inbox, hands
 * off to WhatsApp, and talks by voice where the browser supports it.
 *
 * Other parts of the page can open it with:
 *   window.dispatchEvent(new CustomEvent('concierge:open', { detail: { message: '...' } }))
 */

const STORE = 'sv-assistant-v3';
const TEASER = 'sv-concierge-teaser';

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const typingDelay = (r?: Reply) => 420 + Math.min((r?.text?.length ?? 40) * 8, 1100);

function usePhone() {
  const query = '(max-width: 639px)';
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

function load(): { messages: Message[]; engine: EngineState; speakOn: boolean } | null {
  try {
    const raw = window.sessionStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

const Avatar: React.FC<{ size?: number; online?: boolean }> = ({ size = 40, online = true }) => (
  <span
    className="relative grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#3A332B_0%,#15120F_70%)] ring-1 ring-[#C5A880]/70"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <span className="font-display leading-none text-[#F3E7D3]" style={{ fontSize: size * 0.5 }}>
      S
    </span>
    {online && (
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#15120F] bg-[#3FB27F]" />
    )}
  </span>
);

const URL_RE = /(https?:\/\/[^\s)]+)/g;

function inline(text: string, keyBase: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((seg, j) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={`${keyBase}-${j}`} className="font-semibold text-[#191715]">{seg.slice(2, -2)}</strong>;
    }
    return seg.split(URL_RE).map((part, k) =>
      /^https?:\/\//.test(part) ? (
        <a key={`${keyBase}-${j}-${k}`} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {part.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <React.Fragment key={`${keyBase}-${j}-${k}`}>{part}</React.Fragment>
      ),
    );
  });
}

const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return null;
      if (t.startsWith('•') || t.startsWith('- ')) {
        return (
          <span key={i} className="mt-1 flex gap-2 first:mt-0">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#A88B5E]" />
            <span>{inline(t.replace(/^[•-]\s*/, ''), `l${i}`)}</span>
          </span>
        );
      }
      return (
        <span key={i} className="block [&+span]:mt-1.5">
          {inline(t, `l${i}`)}
        </span>
      );
    })}
  </>
);

const Typing: React.FC = () => (
  <div className="flex w-fit items-center gap-1 rounded-[18px] rounded-bl-[6px] bg-[#EFE9DF] px-3.5 py-3" aria-label="Assistant is typing">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-[#8A847B]"
        animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------

interface ConciergeProps {
  onOpenResidence: (id: ResidenceId) => void;
}

export const Concierge: React.FC<ConciergeProps> = ({ onOpenResidence }) => {
  const saved = useRef(typeof window !== 'undefined' ? load() : null).current;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(saved?.messages ?? []);
  const [engine, setEngine] = useState<EngineState>(saved?.engine ?? initialState());
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [ai, setAi] = useState<'unknown' | 'on' | 'off'>('unknown');
  const [speakOn, setSpeakOn] = useState(saved?.speakOn ?? false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const [teaser, setTeaser] = useState(false);
  const [launcherReady, setLauncherReady] = useState(false);

  const phone = usePhone();
  const reduced = useReducedMotion();
  const introDone = useIntroDone();

  const messagesRef = useRef(messages);
  const engineRef = useRef(engine);
  const aiRef = useRef(ai);
  const speakRef = useRef(speakOn);
  const openRef = useRef(open);
  const busyRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const welcomedRef = useRef(messages.length > 0);
  const teaserShown = useRef(false);
  const everOpened = useRef(messages.length > 0);

  messagesRef.current = messages;
  engineRef.current = engine;
  aiRef.current = ai;
  speakRef.current = speakOn;
  openRef.current = open;

  const micSupported = typeof window !== 'undefined' && speechInputSupported();
  const voiceOutSupported = typeof window !== 'undefined' && speechOutputSupported();

  // Persist the conversation for the rest of the visit.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORE, JSON.stringify({ messages: messages.slice(-60), engine, speakOn }));
    } catch {
      /* private mode: the chat still works, it just won't survive a reload */
    }
  }, [messages, engine, speakOn]);

  // ---- message plumbing ----
  const push = useCallback((m: Omit<Message, 'id' | 'at'>) => {
    const msg: Message = { ...m, id: uid(), at: Date.now() };
    messagesRef.current = [...messagesRef.current, msg];
    setMessages(messagesRef.current);
    return msg;
  }, []);

  const markDone = useCallback((id: string) => {
    messagesRef.current = messagesRef.current.map((m) => (m.id === id ? { ...m, done: true } : m));
    setMessages(messagesRef.current);
  }, []);

  const updateEngine = useCallback((next: EngineState) => {
    engineRef.current = next;
    setEngine(next);
  }, []);

  const deliver = useCallback(
    async (replies: Reply[], voice = false) => {
      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          setTyping(true);
          await sleep(typingDelay(replies[i]));
        }
        setTyping(false);
        push({ role: 'bot', text: replies[i].text, widget: replies[i].widget, chips: replies[i].chips });
      }
      setTyping(false);
      if ((voice || speakRef.current) && voiceOutSupported) {
        const spoken = replies.map((r) => r.text).filter(Boolean).join(' ');
        if (spoken) speak(spoken);
      }
    },
    [push, voiceOutSupported],
  );

  // ---- greeting on first open ----
  useEffect(() => {
    if (!open || welcomedRef.current) return;
    welcomedRef.current = true;
    (async () => {
      busyRef.current = true;
      setTyping(true);
      const check = aiAvailable().then((ok) => {
        setAi(ok ? 'on' : 'off');
        return ok;
      });
      const result = await Promise.race([check, sleep(1500).then(() => null)]);
      await sleep(250);
      await deliver(welcome(result === true));
      busyRef.current = false;
    })();
  }, [open, deliver]);

  // A returning visitor (conversation restored) still needs the AI check.
  useEffect(() => {
    if (open && ai === 'unknown' && welcomedRef.current && messages.length) {
      aiAvailable().then((ok) => setAi(ok ? 'on' : 'off'));
    }
  }, [open, ai, messages.length]);

  // ---- sending ----
  const send = useCallback(
    async (raw: string, opts: { voice?: boolean } = {}) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      stopSpeaking();
      setInput('');
      setNote('');
      push({ role: 'user', text });
      const local = respond(text, engineRef.current);
      updateEngine(local.state);
      setTyping(true);

      let replies = local.replies;
      const typedContact = Boolean(findPhone(text) || findEmail(text));
      if (aiRef.current === 'on' && !typedContact) {
        const [turn] = await Promise.all([askAi(messagesRef.current, local.state.profile), sleep(450)]);
        if (turn) {
          replies = [{ text: turn.reply, widget: actionWidget(turn), chips: turn.chips.length ? turn.chips : undefined }];
          if (turn.residence) updateEngine({ ...engineRef.current, profile: { ...engineRef.current.profile, residence: turn.residence }, lastResidence: turn.residence });
        } else {
          setAi('off');
          await sleep(typingDelay(local.replies[0]));
        }
      } else {
        await sleep(typingDelay(local.replies[0]));
      }
      await deliver(replies, opts.voice);
      busyRef.current = false;
    },
    [deliver, push, updateEngine],
  );

  // ---- widget actions ----
  const scrollToSection = (to: string) => {
    const el = document.getElementById(to);
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { offset: -40, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const handlersFor = (msgId: string): WidgetHandlers => ({
    profile: engine.profile,
    onOpenResidence: (id) => onOpenResidence(id),
    onBookResidence: async (id) => {
      if (busyRef.current) return;
      busyRef.current = true;
      updateEngine({ ...engineRef.current, profile: { ...engineRef.current.profile, residence: id }, lastResidence: id });
      push({ role: 'user', text: `I'd like to see ${residence(id).title}` });
      setTyping(true);
      await sleep(650);
      await deliver([{ text: `Lovely choice. Pick a day and time for your viewing of ${residence(id).title}:`, widget: { kind: 'booking' } }]);
      busyRef.current = false;
    },
    onBooked: async (v: Viewing, res) => {
      if (busyRef.current) return;
      busyRef.current = true;
      markDone(msgId);
      const prev = engineRef.current.profile;
      const profile = { ...prev, viewing: v, residence: res ?? prev.residence };
      updateEngine({ ...engineRef.current, profile });
      push({
        role: 'user',
        text: `${fmtDay(v.date, 'long')}, ${fmtTime(v.time)} · ${v.mode === 'video' ? 'Video walkthrough' : 'Site visit'}${profile.residence ? ` · ${residence(profile.residence).title}` : ''}`,
      });
      setTyping(true);
      await sleep(700);
      await deliver([
        {
          text: profile.name && profile.phone ? `Wonderful, that slot is free. I have your details as ${profile.name}, ${profile.phone}. Shall I send the request?` : 'Wonderful, that slot is free. Who should we expect?',
          widget: { kind: 'lead', reason: 'viewing' },
        },
      ]);
      busyRef.current = false;
    },
    onLead: async (reason: LeadReason, d) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const profile = { ...engineRef.current.profile, name: d.name, phone: d.phone || undefined, email: d.email || undefined };
      updateEngine({ ...engineRef.current, profile, pending: null });
      const { subject, fields } = leadEmail(profile, reason, messagesRef.current, aiRef.current === 'on' ? 'Website AI assistant' : 'Website assistant');
      const status = await sendLead(subject, fields);
      markDone(msgId);
      setTyping(true);
      await sleep(500);
      const first = d.name.split(' ')[0];
      const v = profile.viewing;
      const thanks =
        reason === 'viewing' && v
          ? `Thank you, ${first}. Your ${v.mode === 'video' ? 'video walkthrough' : 'viewing'} is requested for ${fmtDay(v.date, 'long')} at ${fmtTime(v.time)} India time.`
          : reason === 'brochure'
            ? `Thank you, ${first}. Your brochure request is with the team.`
            : `Thank you, ${first}. An advisor will be in touch shortly.`;
      await deliver([{ text: thanks, widget: { kind: 'confirmed', reason, status } }]);
      setTyping(true);
      await sleep(900);
      await deliver([
        { text: 'For this demo, here is the summary the sales team receives the moment you submit:', widget: { kind: 'summary', reason } },
      ]);
      setTyping(true);
      await sleep(800);
      await deliver([{ text: 'Is there anything else I can help with while you are here?', chips: ['Payment plan', 'Explore in 3D', 'Location'] }]);
      busyRef.current = false;
    },
    onLink: (l: LinkAction) => {
      if (l.kind !== 'scroll') return;
      setOpen(false);
      window.setTimeout(() => scrollToSection(l.to), 260);
    },
  });

  // ---- open / close ----
  const openChat = useCallback(() => {
    everOpened.current = true;
    setTeaser(false);
    setOpen(true);
    try {
      window.sessionStorage.setItem(TEASER, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    recRef.current?.abort();
    setListening(false);
  }, []);

  // Other parts of the page can open the concierge with a question.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const message = (e as CustomEvent<{ message?: string }>).detail?.message;
      openChat();
      if (message) {
        const wait = () => (welcomedRef.current && !busyRef.current ? send(message) : window.setTimeout(wait, 300));
        window.setTimeout(wait, 400);
      }
    };
    window.addEventListener('concierge:open', onOpen);
    return () => window.removeEventListener('concierge:open', onOpen);
  }, [openChat, send]);

  // Escape closes; the phone sheet locks the page behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // A residence or enquiry dialog opened from the chat takes the Escape first.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-concierge])')) return;
      closeChat();
    };
    window.addEventListener('keydown', onKey);
    if (phone) lockScroll();
    if (!phone && window.matchMedia('(pointer: fine)').matches) window.setTimeout(() => inputRef.current?.focus(), 350);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (phone) unlockScroll();
    };
  }, [open, phone, closeChat]);

  // The composer grows with the message, up to a few lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input, open]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, typing, open, reduced]);

  // The launcher arrives after the opening sequence.
  useEffect(() => {
    if (!introDone) return;
    const t = window.setTimeout(() => setLauncherReady(true), 900);
    return () => window.clearTimeout(t);
  }, [introDone]);

  // One gentle prompt per visit: after a while, or when the residences come into view.
  useEffect(() => {
    if (!launcherReady) return;
    let dismissed = false;
    try {
      dismissed = Boolean(window.sessionStorage.getItem(TEASER));
    } catch {
      /* ignore */
    }
    if (dismissed || messages.length) return;
    let hideTimer = 0;
    const show = () => {
      if (teaserShown.current || openRef.current || everOpened.current) return;
      teaserShown.current = true;
      setTeaser(true);
      hideTimer = window.setTimeout(() => setTeaser(false), 16000);
    };
    const timer = window.setTimeout(show, 14000);
    const target = document.getElementById('residences');
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && show(), { threshold: 0.25 });
    if (target) io.observe(target);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launcherReady]);

  const dismissTeaser = () => {
    setTeaser(false);
    try {
      window.sessionStorage.setItem(TEASER, '1');
    } catch {
      /* ignore */
    }
  };

  // ---- voice input ----
  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = createRecognizer(navigator.language && /^(en|hi|te|ar)/.test(navigator.language) ? navigator.language : 'en-IN');
    if (!rec) return;
    stopSpeaking();
    let finalText = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText || interim).trim());
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setNote(e?.error === 'not-allowed' || e?.error === 'service-not-allowed' ? 'Microphone access is blocked. You can allow it in the browser, or type instead.' : e?.error === 'no-speech' ? "I didn't catch that. Tap the mic and try again." : '');
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) send(finalText, { voice: true });
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setNote('');
    } catch {
      setListening(false);
    }
  };

  const toggleSpeak = () => {
    const next = !speakOn;
    setSpeakOn(next);
    if (!next) stopSpeaking();
  };

  // Chips belong to the latest bot message only, and disappear once the visitor replies.
  const last = messages[messages.length - 1];
  const chips = !typing && last?.role === 'bot' && last.chips?.length ? last.chips : null;

  const panelMotion = phone
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 } };

  return (
    <>
      {/* Launcher and the one-time prompt above it */}
      <AnimatePresence>
        {launcherReady && !open && (
          <motion.div
            key="launcher"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="fixed bottom-[calc(1rem_+_env(safe-area-inset-bottom))] right-4 z-[45] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
          >
            <AnimatePresence>
              {teaser && (
                <motion.div
                  key="teaser"
                  initial={reduced ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="relative w-[272px] origin-bottom-right rounded-[20px] rounded-br-[6px] border border-[#191715]/10 bg-[#FCFAF6] p-4 pr-9 text-[#191715] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.45)]"
                >
                  <button
                    type="button"
                    onClick={dismissTeaser}
                    aria-label="Dismiss"
                    className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[#736E67] hover:bg-black/5 hover:text-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={openChat} className="text-left">
                    <span className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.2em] text-[#A88B5E]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3FB27F]" /> Assistant · online
                    </span>
                    <span className="mt-1.5 block text-[14px] leading-snug">
                      Looking at the villas? I can share prices and floor plans, or book you a private viewing.
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="concierge-launcher"
              type="button"
              onClick={openChat}
              aria-label="Chat with the Skyline assistant"
              aria-expanded={open}
              className="group relative flex items-center gap-3 rounded-full bg-[#15120F] p-1.5 text-[#FCFAF6] shadow-[0_18px_44px_-14px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-transform duration-500 ease-expo hover:-translate-y-0.5 sm:pr-5"
            >
              {teaser && !reduced && (
                <span className="absolute left-1.5 top-1.5 h-11 w-11 animate-ping rounded-full bg-[#C5A880]/40" aria-hidden="true" />
              )}
              <Avatar size={44} />
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-tight">Ask the assistant</span>
                <span className="block text-[11px] leading-tight text-[#FCFAF6]/55">Prices · plans · viewings</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel: a card on larger screens, a full-height sheet on phones */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            role="dialog"
            aria-label="Skyline Villas assistant chat"
            aria-modal={phone}
            data-concierge
            initial={reduced ? false : panelMotion.initial}
            animate={panelMotion.animate}
            exit={reduced ? undefined : panelMotion.exit}
            transition={{ duration: phone ? 0.55 : 0.5, ease: EASE }}
            className="fixed inset-0 z-[55] flex origin-bottom-right flex-col overflow-hidden bg-[#FCFAF6] text-[#191715] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(700px,calc(100dvh_-_110px))] sm:w-[408px] sm:rounded-[26px] sm:border sm:border-[#191715]/10 sm:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]"
          >
            {/* Header */}
            <header className="relative flex items-center gap-3 bg-[#15120F] px-4 pb-3.5 pt-[calc(0.875rem_+_env(safe-area-inset-top))] text-[#FCFAF6] sm:pt-3.5">
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C5A880]/60 to-transparent" />
              <Avatar size={42} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[21px] leading-tight">Skyline Assistant</p>
                <p className="flex items-center gap-1.5 truncate text-[11.5px] text-[#FCFAF6]/60">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3FB27F]" />
                  <span className="truncate">{typing ? 'Typing…' : phone ? 'AI assistant · online' : 'AI assistant · replies instantly'}</span>
                </p>
              </div>
              {voiceOutSupported && (
                <button
                  type="button"
                  onClick={toggleSpeak}
                  aria-pressed={speakOn}
                  aria-label={speakOn ? 'Stop reading replies aloud' : 'Read replies aloud'}
                  title={speakOn ? 'Voice replies on' : 'Voice replies off'}
                  className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-300 ${speakOn ? 'bg-[#C5A880] text-[#15120F]' : 'text-[#FCFAF6]/75 hover:bg-white/10 hover:text-white'}`}
                >
                  {speakOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              <a
                href={whatsappUrl(engine.profile)}
                target="_blank"
                rel="noreferrer"
                aria-label="Message the sales team on WhatsApp"
                title="WhatsApp the sales team"
                className="grid h-9 w-9 place-items-center rounded-full text-[#FCFAF6]/75 transition-colors duration-300 hover:bg-white/10 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close chat"
                className="grid h-9 w-9 place-items-center rounded-full text-[#FCFAF6]/75 transition-colors duration-300 hover:bg-white/10 hover:text-white"
              >
                {phone ? <ChevronDown className="h-5 w-5" /> : <X className="h-4 w-4" />}
              </button>
            </header>

            {/* Conversation */}
            <div ref={listRef} data-lenis-prevent className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite">
              <p className="pb-1 text-center text-[10.5px] uppercase tracking-[0.2em] text-[#A39E96]">Today</p>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-2'}
                >
                  {m.text && (
                    <div
                      className={`max-w-[86%] whitespace-pre-line text-[14px] leading-[1.55] ${
                        m.role === 'user'
                          ? 'rounded-[18px] rounded-br-[6px] bg-[#191715] px-3.5 py-2.5 text-[#FCFAF6]'
                          : 'rounded-[18px] rounded-bl-[6px] bg-[#EFE9DF] px-3.5 py-2.5 text-[#2B2723]'
                      }`}
                    >
                      {m.role === 'bot' ? <RichText text={m.text} /> : m.text}
                    </div>
                  )}
                  {m.widget && (
                    <div className="w-full">
                      <WidgetView w={m.widget} done={m.done} h={handlersFor(m.id)} />
                    </div>
                  )}
                </motion.div>
              ))}
              {typing && <Typing />}
              {chips && (
                <motion.div
                  key={`chips-${last!.id}`}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
                  className="flex flex-wrap gap-1.5 pt-1"
                >
                  {chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => send(c)}
                      className="rounded-full border border-[#191715]/18 bg-white px-3.5 py-1.5 text-[12.5px] text-[#191715] transition-colors duration-300 hover:border-[#191715] hover:bg-[#191715] hover:text-[#FCFAF6]"
                    >
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-[#191715]/10 bg-[#FCFAF6] px-3 pb-[calc(0.6rem_+_env(safe-area-inset-bottom))] pt-2.5 sm:pb-2.5">
              {note && <p className="px-2 pb-2 text-[11.5px] text-[#B4532A]">{note}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <div className={`flex min-h-[46px] flex-1 items-end rounded-[23px] border bg-white pl-4 pr-1.5 transition-colors duration-300 ${listening ? 'border-[#C5A880]' : 'border-[#191715]/15 focus-within:border-[#191715]/60'}`}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder={listening ? 'Listening…' : phone ? 'Ask about prices, viewings…' : 'Ask about prices, plans, viewings…'}
                    aria-label="Message the assistant"
                    className="concierge-input max-h-28 min-h-[44px] flex-1 resize-none bg-transparent py-[10px] text-[16px] leading-[1.45] text-[#191715] placeholder:text-[#A39E96] focus:outline-none sm:text-[14px]"
                  />
                  {micSupported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-label={listening ? 'Stop listening' : 'Speak your question'}
                      aria-pressed={listening}
                      className={`relative mb-[5px] grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                        listening ? 'bg-[#C5A880] text-[#15120F]' : 'text-[#736E67] hover:bg-[#F4F0E8] hover:text-[#191715]'
                      }`}
                    >
                      {listening && !reduced && <span className="absolute inset-0 animate-ping rounded-full bg-[#C5A880]/50" aria-hidden="true" />}
                      {listening ? <Square className="relative h-3.5 w-3.5 fill-current" /> : <Mic className="h-[18px] w-[18px]" />}
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="mb-0.5 grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#191715] text-[#FCFAF6] transition-all duration-300 hover:bg-black disabled:bg-[#191715]/25"
                >
                  <ArrowUp className="h-[18px] w-[18px]" />
                </button>
              </form>
              <p className="mt-2 text-center text-[10.5px] text-[#A39E96]">
                AI assistant · demo built by{' '}
                <a href={PROJECT.builtByUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#191715]">
                  {PROJECT.builtBy}
                </a>
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
};
