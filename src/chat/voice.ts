/**
 * Voice for the concierge, using the browser's built-in speech services:
 * speak a question instead of typing it, and have replies read aloud. Both
 * are optional and hidden where the browser does not support them.
 */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function speechInputSupported() {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(lang = 'en-IN'): Recognition | null {
  if (!speechInputSupported()) return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec: Recognition = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

export function speechOutputSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const prefs = [
    (v: SpeechSynthesisVoice) => v.lang === 'en-IN' && /female|heera|neerja|veena|swara/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
    (v: SpeechSynthesisVoice) => v.lang === 'en-GB' && /female|libby|sonia|serena|kate|google/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang === 'en-GB',
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];
  for (const test of prefs) {
    const found = voices.find(test);
    if (found) return found;
  }
  return undefined;
}

export function speak(text: string) {
  if (!speechOutputSupported()) return;
  const plain = text
    .replace(/\*\*/g, '')
    .replace(/•/g, '')
    .replace(/₹\s?(\d+(?:\.\d+)?) Cr/g, '$1 crore rupees')
    .replace(/sq\.ft/g, 'square feet')
    .replace(/\n+/g, '. ');
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(plain);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-IN';
  u.rate = 1.02;
  u.pitch = 1;
  synth.speak(u);
}

export function stopSpeaking() {
  if (speechOutputSupported()) window.speechSynthesis.cancel();
}
