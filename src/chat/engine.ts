import {
  ORDER,
  PROJECT,
  RESIDENCE_FACTS,
  perSqftLabel,
  priceLabel,
  residence,
  type ResidenceId,
} from './knowledge.ts';
import type { EngineState, Pending, Profile, Purpose, Reply, Timeline } from './types.ts';

/**
 * The built-in concierge. It runs entirely in the browser, so the assistant
 * works on any host with no keys or servers. When the AI route is configured
 * the conversation is handed to it instead, and this engine remains the
 * fallback for any reply the AI cannot give.
 *
 * Every reply ends with one clear next step, the way a good sales advisor
 * talks: answer, then move the buyer one step closer to a viewing.
 */

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function normalize(s: string) {
  return ` ${s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9₹$@.+'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

class Text {
  readonly raw: string;
  readonly n: string;
  readonly tokens: string[];

  constructor(raw: string) {
    this.raw = raw;
    this.n = normalize(raw);
    this.tokens = this.n.trim().split(' ').map((t) => t.replace(/^[.'-]+|[.'-]+$/g, ''));
  }

  /** Any of the words, allowing plurals and one-letter typos on longer words. */
  has(...words: string[]) {
    return words.some((w) =>
      this.tokens.some(
        (t) =>
          t === w ||
          (w.length >= 4 && t.startsWith(w) && t.length - w.length <= 3) ||
          (w.length >= 5 && t.length >= 5 && lev(t, w) <= 1),
      ),
    );
  }

  /** Any of the phrases, matched on word boundaries. */
  says(...phrases: string[]) {
    return phrases.some((p) => this.n.includes(` ${p} `) || this.n.includes(` ${p}`));
  }

  test(re: RegExp) {
    return re.test(this.n);
  }
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const fmtCr = (n: number) => (n < 1 ? `₹${Math.round(n * 100)} lakh` : `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} Cr`);

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

export function findResidences(t: Text): ResidenceId[] {
  const found = new Set<ResidenceId>();
  const n = t.n;
  if (/(skyline|villa|residence|option|type|number|no\.?)\s*(one|1|i)\b/.test(n) || /\bfirst (one|villa|option|residence)\b/.test(n) || n.includes('family residence')) {
    found.add('skyline-one');
  }
  if (/(skyline|villa|residence|option|type|number|no\.?)\s*(two|2|ii)\b/.test(n) || /\bsecond (one|villa|option|residence)\b/.test(n) || t.has('courtyard')) {
    found.add('skyline-two');
  }
  if (
    /(skyline|villa|residence|option|type|number|no\.?)\s*(three|3|iii)\b/.test(n) ||
    /\bthird (one|villa|option|residence)\b/.test(n) ||
    t.has('signature', 'biggest', 'largest', 'cinema', 'cellar') ||
    /\b(5|five)\s*(bhk|bed|bedroom|bedrooms|br)\b/.test(n) ||
    t.says('private lift', 'lap pool', 'wine cellar', 'sky lounge')
  ) {
    found.add('skyline-three');
  }
  if (/\b(4|four)\s*(bhk|bed|bedroom|bedrooms|br)\b/.test(n) && found.size === 0) {
    found.add('skyline-one');
    found.add('skyline-two');
  }
  return [...found];
}

export function findBudgetCr(t: Text): number | undefined {
  const n = t.n.replace(/,/g, '');
  let m = n.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores|c)\b/);
  if (m) return parseFloat(m[1]);
  m = n.match(/(\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs|lac|lacs)\b/);
  if (m) return parseFloat(m[1]) / 100;
  m = n.match(/(?:\$|usd)\s*(\d+(?:\.\d+)?)\s*(k|m|mn|million)?\b/) || n.match(/(\d+(?:\.\d+)?)\s*(k|m|mn|million)?\s*(?:usd|dollars?)\b/);
  if (m) {
    const v = parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] ? 1e6 : 1);
    if (v >= 1e4) return (v * 85) / 1e7; // approximate USD to INR
  }
  m = n.match(/(?:aed|dhs|dirhams?)\s*(\d+(?:\.\d+)?)\s*(k|m|mn|million)?\b/) || n.match(/(\d+(?:\.\d+)?)\s*(k|m|mn|million)?\s*(?:aed|dirhams?)\b/);
  if (m) {
    const v = parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] ? 1e6 : 1);
    if (v >= 1e4) return (v * 23) / 1e7; // approximate AED to INR
  }
  m = n.match(/(?:₹|rs\.?|inr)\s*(\d{6,})/);
  if (m) return parseInt(m[1], 10) / 1e7;
  return undefined;
}

export function findPhone(raw: string) {
  const m = raw.match(/(\+?\d[\d\s().-]{7,}\d)/);
  if (!m || /^\d{4}-\d{1,2}-\d{1,2}$/.test(m[1].trim())) return undefined;
  const digits = m[1].replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return undefined;
  return m[1].trim();
}

export function findEmail(raw: string) {
  return raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
}

const NOT_NAMES = new Set([
  'looking', 'interested', 'from', 'planning', 'here', 'just', 'not', 'very', 'also', 'a', 'an', 'the',
  'an', 'nri', 'buying', 'searching', 'trying', 'living', 'based', 'curious', 'thinking', 'fine', 'good',
  'ok', 'okay', 'in', 'at', 'on', 'with', 'having', 'going', 'ready', 'available', 'free', 'busy', 'sure',
]);

export function findName(raw: string) {
  const explicit = raw.match(/\b(?:my name is|my name's|name is|this is|call me)\s+([A-Za-z][A-Za-z'-]{1,20}(?:\s+[A-Za-z][A-Za-z'-]{1,20})?)/i);
  if (explicit) return titleCase(explicit[1]);
  const casual = raw.match(/\b(?:[Ii] am|[Ii]'m|[Ii]m)\s+([A-Z][a-z'-]{1,20}(?:\s+[A-Z][a-z'-]{1,20})?)/);
  if (casual && !NOT_NAMES.has(casual[1].split(' ')[0].toLowerCase())) return titleCase(casual[1]);
  return undefined;
}

function titleCase(s: string) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** A day offset from today (India time) and a time-of-day band, if mentioned. */
export function findWhen(t: Text) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let dayHint: number | undefined;
  if (t.has('today', 'tonight')) dayHint = 0;
  else if (t.has('tomorrow', 'tmrw', 'tmr')) dayHint = 1;
  else if (t.has('weekend')) dayHint = -7; // Saturday, encoded as -(weekday + 1)
  else {
    const named = days.findIndex((d) => t.has(d) || t.has(d.slice(0, 3)));
    if (named >= 0) dayHint = -named - 1; // encoded weekday, resolved by the booking widget
  }
  let band: 'morning' | 'afternoon' | 'evening' | undefined;
  if (t.has('morning')) band = 'morning';
  else if (t.has('afternoon', 'noon', 'lunch')) band = 'afternoon';
  else if (t.has('evening', 'night', 'after work')) band = 'evening';
  return { dayHint, band };
}

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

type Intent =
  | 'greet' | 'thanks' | 'bye' | 'builder' | 'bot' | 'viewing' | 'brochure' | 'human'
  | 'price' | 'payment' | 'location' | 'amenities' | 'tour3d' | 'availability' | 'possession'
  | 'legal' | 'nri' | 'custom' | 'invest' | 'vastu' | 'discount' | 'maintenance' | 'compare'
  | 'residences' | 'household' | 'pets' | 'yes' | 'no';

function detect(t: Text): Intent[] {
  const out: Intent[] = [];
  const add = (i: Intent, cond: boolean) => cond && out.push(i);

  add('builder', t.says('who built', 'who made', 'who created', 'who designed this', 'who developed this', 'built this', 'made this', 'this website', 'this site', 'this chatbot', 'this chat bot', 'this bot') && !t.has('villa', 'villas', 'project', 'property'));
  add('bot', t.says('are you a bot', 'are you human', 'are you real', 'are you an ai', 'are you ai', 'who are you', 'what are you', 'your name', 'a real person', 'is this a bot') || t.has('robot', 'chatbot'));
  add('viewing', t.says('site visit', 'video call', 'video walkthrough', 'private viewing', 'book a viewing', 'see the villa', 'see the property', 'see it in person', 'visit the site', 'come and see', 'can i visit', 'want to visit', 'like to visit', 'arrange a visit', 'book a visit', 'schedule a visit', 'book a call', 'show me around', 'change the time') || t.has('visit', 'viewing', 'appointment', 'schedule', 'book', 'reschedule', 'dekhna', 'dekhne'));
  add('brochure', t.says('floor plan', 'price sheet', 'price list', 'send details', 'send me details', 'more details') || t.has('brochure', 'pdf', 'floorplan', 'layout', 'plans', 'catalogue', 'catalog'));
  add('human', t.says('call me', 'call back', 'talk to', 'speak to', 'speak with', 'talk with', 'contact you', 'your number', 'phone number', 'real person', 'sales team') || t.has('human', 'agent', 'representative', 'callback', 'whatsapp', 'manager', 'advisor', 'adviser', 'consultant'));
  add('price', t.says('how much', 'per sq', 'per square', 'kya rate', 'kitne ka', 'kitna hai', 'starting from', 'starts at') || t.has('price', 'pricing', 'cost', 'rate', 'expensive', 'cheap', 'afford', 'affordable', 'kimat', 'keemat', 'kitna', 'quote', 'quotation', 'budget', 'value') || /₹|\brs\.?\s|\binr\b|\d\s*(cr|crore|lakh|lac)\b/.test(t.n));
  add('payment', t.says('payment plan', 'down payment', 'booking amount', 'home loan') || t.has('payment', 'emi', 'loan', 'bank', 'finance', 'financing', 'mortgage', 'installment', 'instalment', 'downpayment'));
  add('location', t.says('financial district', 'hitec city', 'hi tech', 'how far', 'where is', 'where are') || t.has('location', 'located', 'address', 'area', 'locality', 'neighbourhood', 'neighborhood', 'airport', 'distance', 'nearby', 'commute', 'school', 'hospital', 'office', 'map', 'kahan', 'kaha', 'connectivity', 'metro', 'gachibowli', 'kokapet', 'where'));
  add('amenities', t.has('amenities', 'amenity', 'facilities', 'facility', 'features', 'clubhouse', 'gym', 'security', 'parking', 'charging', 'smart', 'garden', 'pool', 'swimming', 'lift', 'elevator', 'gated', 'automation', 'specifications', 'specs'));
  add('tour3d', t.says('3d', 'virtual tour', '360', '3 d') || t.has('virtual', 'model', 'render', 'renders', 'walkthrough', 'videos', 'photos', 'pictures', 'images', 'gallery', 'interior', 'interiors'));
  add('availability', (t.says('still available', 'how many left', 'any left', 'sold out') || t.has('availability', 'available', 'sold', 'remaining', 'inventory', 'plots', 'plot')) && !t.says('what types', 'which types', 'types of', 'what options', 'what do you have', 'what is available', "what's available"));
  add('pets', t.has('pet', 'pets', 'dog', 'dogs', 'cat', 'cats'));
  add('possession', t.says('ready to move', 'when will it be ready', 'when ready', 'move in') || t.has('possession', 'handover', 'completion', 'construction', 'delivery'));
  add('legal', t.has('rera', 'approval', 'approvals', 'approved', 'legal', 'documents', 'title', 'hmda', 'permission', 'registration', 'registered', 'stamp', 'gst', 'tax', 'khata', 'encumbrance'));
  add('nri', t.says('outside india', 'live abroad', 'living abroad', 'power of attorney', 'from abroad') || t.has('nri', 'abroad', 'overseas', 'foreign', 'usa', 'america', 'london', 'dubai', 'uae', 'canada', 'australia', 'singapore', 'remotely'));
  add('custom', t.has('customize', 'customise', 'customization', 'customisation', 'modify', 'modification', 'personalize', 'personalise', 'finishes'));
  add('invest', t.has('investment', 'invest', 'investor', 'roi', 'returns', 'rental', 'appreciation', 'yield', 'resale'));
  add('vastu', t.has('vastu', 'vaastu', 'facing', 'direction'));
  add('discount', t.has('discount', 'offer', 'offers', 'deal', 'negotiate', 'negotiable', 'cheaper'));
  add('maintenance', t.has('maintenance', 'society', 'hoa', 'upkeep'));
  add('compare', t.says('which one', 'which is', 'difference between', 'better for', 'best for', 'which villa', 'which residence') || t.has('compare', 'comparison', 'difference', 'differences', 'vs', 'versus', 'recommend', 'suggest'));
  add('residences', t.says('what do you have', 'show me', 'what types', 'types of', 'what options', 'tell me about') || t.has('villa', 'villas', 'residence', 'residences', 'homes', 'house', 'houses', 'options', 'configurations', 'bhk', 'bedroom', 'bedrooms', 'size', 'sizes', 'sqft', 'units', 'skyline'));
  add('household', t.says('family of', 'joint family', 'my parents', 'with kids', 'with children', 'my kids', 'my children') || t.has('kids', 'children'));
  add('thanks', t.has('thanks', 'thank', 'thx', 'shukriya', 'dhanyavad', 'appreciate'));
  add('bye', t.says('see you', 'that is all', "that's all", 'thats all', 'no more questions') || t.has('bye', 'goodbye'));
  add('greet', t.says('good morning', 'good afternoon', 'good evening') || t.has('hi', 'hello', 'hey', 'hii', 'hiya', 'namaste', 'namaskar', 'salaam', 'salam', 'hola', 'greetings'));
  add('yes', /^\s*(yes|yeah|yep|yup|sure|ok|okay|please|yes please|go ahead|sounds good|definitely|of course|haan|ha|ji|why not|alright|absolutely|send it|do it|let's do it|lets do it|great)\b/.test(t.n));
  add('no', /^\s*(no|nope|nah|not now|not yet|maybe later|later|no thanks|no thank you|not really|skip|nahi|na)\b/.test(t.n));
  return out;
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

const MAIN_CHIPS = ['Show me the villas', 'Prices', 'Book a viewing'];

function residenceIntro(id: ResidenceId) {
  const r = residence(id);
  const f = RESIDENCE_FACTS[id];
  return `**${r.title}** is our ${r.category.toLowerCase()}: ${f.short}. It suits ${f.bestFor}. Indicative price from **${priceLabel(id)}**.`;
}

function qualifierFollowUp(p: Profile): { reply: Reply; pending: Pending } {
  if (!p.purpose) {
    return {
      reply: {
        text: 'So I can guide you properly, is this for your own family or more of an investment?',
        chips: ['For my family', 'Investment', 'Both'],
      },
      pending: 'purpose',
    };
  }
  if (!p.timeline) {
    return {
      reply: { text: 'And when are you hoping to buy?', chips: ['Within 3 months', '3 to 6 months', 'Just exploring'] },
      pending: 'timeline',
    };
  }
  return {
    reply: { text: 'Is there anything else you would like to know?', chips: ['Payment plan', 'Location', 'Book a viewing'] },
    pending: null,
  };
}

function priceReply(p: Profile, ids: ResidenceId[], budget?: number): Reply[] {
  if (budget !== undefined) {
    const within = ORDER.filter((id) => RESIDENCE_FACTS[id].fromCr <= budget * 1.05);
    if (budget < RESIDENCE_FACTS['skyline-two'].fromCr * 0.7) {
      return [{
        text: `I'd rather be upfront: our residences start from **${priceLabel('skyline-two')}**, which is above ${fmtCr(budget)}. If the budget can stretch with a home loan, I can share the payment plan. Otherwise I can note your budget so the team can tell you about better-suited homes.`,
        chips: ['Share the payment plan', 'Note my budget', 'Show me the villas'],
      }];
    }
    if (within.length === 0) {
      return [{
        text: `Thanks for sharing that. With around ${fmtCr(budget)}, the closest fit is **Skyline Two** from **${priceLabel('skyline-two')}**. With a construction-linked plan you pay in stages as it is built, which many buyers find easier. Would you like me to send the payment schedule?`,
        chips: ['Yes, send it', 'Tell me about Skyline Two', 'Book a viewing'],
      }];
    }
    const best = within[within.length - 1];
    const others = within.filter((id) => id !== best);
    return [
      {
        text: `With around ${fmtCr(budget)}, **${residence(best).title}** (from ${priceLabel(best)}) ${RESIDENCE_FACTS[best].fromCr <= budget ? 'fits comfortably' : 'is within reach'}${others.length ? `, and ${others.map((id) => residence(id).title).join(' and ')} ${others.length > 1 ? 'are' : 'is'} comfortably inside it too` : ''}. Here it is:`,
        widget: { kind: 'residence', id: best },
      },
      { text: 'Would you like me to send the price sheet with the exact plot options?', chips: ['Yes, send it', 'Book a viewing', 'Compare all three'] },
    ];
  }
  if (ids.length === 1) {
    const id = ids[0];
    return [{
      text: `**${residence(id).title}** starts from **${priceLabel(id)}**, ${perSqftLabel(id)}. The final figure depends on the plot and the finish level you choose. Shall I send you the full price sheet for ${residence(id).title}?`,
      chips: ['Yes, send it', 'Payment plan', 'Book a viewing'],
    }];
  }
  return [{
    text:
      `Here are the indicative starting prices:\n` +
      ORDER.map((id) => `• **${residence(id).title}**: from ${priceLabel(id)} (${residence(id).area.replace('Approx. ', '')})`).join('\n') +
      `\nFinal pricing depends on the plot and finishes. Shall I send you the detailed price sheet and payment plan?`,
    chips: ['Yes, send it', 'Payment plan', 'Book a viewing'],
  }];
}

export function initialState(): EngineState {
  return { profile: {}, pending: null, greeted: false, turns: 0 };
}

export function welcome(ai: boolean): Reply[] {
  return [
    {
      text: `Hello, and welcome to Skyline Villas. I'm the Skyline assistant. I can share prices and floor plans, help you compare the three residences, or book a private viewing.${ai ? ' Ask me anything, in English, हिन्दी, తెలుగు or العربية.' : ''}`,
    },
    { text: 'What would you like to start with?', chips: MAIN_CHIPS },
  ];
}

/**
 * Reads one message and returns the concierge's replies plus the updated
 * state. Pure apart from the random choice of phrasing.
 */
export function respond(input: string, prev: EngineState): { replies: Reply[]; state: EngineState } {
  const st: EngineState = { ...prev, profile: { ...prev.profile }, turns: prev.turns + 1 };
  const p = st.profile;
  const t = new Text(input);
  const intents = detect(t);
  const is = (i: Intent) => intents.includes(i);
  const ids = findResidences(t);
  const budget = findBudgetCr(t);
  const phone = findPhone(input);
  const email = findEmail(input);
  const name = findName(input);
  const replies: Reply[] = [];
  const pending = st.pending;
  st.pending = null;

  if (ids.length === 1) {
    st.lastResidence = ids[0];
    p.residence = ids[0];
  }
  if (budget !== undefined) p.budgetCr = budget;
  if (name) p.name = name;
  const gaveContact = Boolean(phone || email);
  if (phone) p.phone = phone;
  if (email) p.email = email;

  // ---- Short answers to the question we just asked ----
  if (pending === 'purpose') {
    let purpose: Purpose | undefined;
    if (t.has('both')) purpose = 'both';
    else if (t.has('invest', 'investment', 'rental', 'roi', 'returns')) purpose = 'investment';
    else if (t.has('family', 'own', 'myself', 'self', 'live', 'living', 'stay', 'kids', 'parents', 'wife', 'husband', 'home', 'use')) purpose = 'family';
    if (purpose) {
      p.purpose = purpose;
      const follow = qualifierFollowUp(p);
      st.pending = follow.pending;
      return {
        replies: [
          { text: purpose === 'investment' ? 'Understood. Villas in the Financial District corridor are popular as long-term holdings.' : purpose === 'both' ? 'That makes sense. Many buyers here live in it now and hold it as an asset for the long term.' : 'Lovely. All three are designed first and foremost as family homes.' },
          follow.reply,
        ],
        state: st,
      };
    }
  }

  if (pending === 'timeline') {
    let timeline: Timeline | undefined;
    if (t.has('exploring', 'browsing', 'looking', 'unsure', 'sure') || t.says('just exploring', 'not sure', 'no rush', 'not decided')) timeline = 'exploring';
    if (t.has('immediately', 'asap', 'soon', 'now', 'urgent') || t.says('within 3', 'within three', 'this month', 'next month', '1 month', '2 months', '3 months')) timeline = 'soon';
    else if (t.says('3 to 6', '3-6', '6 months', 'six months', 'this year', 'next year', 'later this year') || t.has('later')) timeline = timeline ?? 'mid';
    if (timeline) {
      p.timeline = timeline;
      if (timeline === 'soon') {
        st.pending = 'viewing';
        return {
          replies: [{ text: 'Since you are looking to move soon, the best next step is a private viewing so you can see the finishes and the plots in person. Shall I book one for you?', chips: ['Book a viewing', 'Send the price sheet first'] }],
          state: st,
        };
      }
      if (timeline === 'mid') {
        st.pending = 'brochure';
        return {
          replies: [{ text: 'That gives you good time to compare. I can send you the brochure, floor plans and price sheet so you have everything in one place. Shall I?', chips: ['Yes, send it', 'Book a viewing'] }],
          state: st,
        };
      }
      st.pending = 'brochure';
      return {
        replies: [{ text: 'No rush at all. Would it help if I sent you the brochure and floor plans to look through at your own pace?', chips: ['Yes, send it', 'Explore in 3D'] }],
        state: st,
      };
    }
  }

  // ---- Contact details typed straight into the chat ----
  if (gaveContact && !is('viewing') && !is('brochure')) {
    const reason = pending === 'brochure' ? 'brochure' : pending === 'viewing' ? 'viewing' : 'callback';
    if (reason === 'viewing') {
      return { replies: [{ text: `Thank you${p.name ? `, ${p.name}` : ''}. I've noted your details. Pick a day and time for the viewing:`, widget: { kind: 'booking' } }], state: st };
    }
    return {
      replies: [{ text: `Thank you${p.name ? `, ${p.name}` : ''}. Please check your details below and I'll pass them straight to the team.`, widget: { kind: 'lead', reason } }],
      state: st,
    };
  }

  // ---- Yes / no to an offer ----
  const others = intents.filter((i) => i !== 'yes' && i !== 'no' && i !== 'thanks' && i !== 'greet');
  if (t.says('keep it', 'keep the time', 'that works')) {
    return { replies: [{ text: 'Perfect, that stays as it is. Is there anything else I can help with?', chips: ['Payment plan', 'Location', 'Explore in 3D'] }], state: st };
  }
  if (is('yes') && pending && others.length === 0) {
    if (pending === 'viewing') return { replies: [{ text: 'Lovely. Pick a day and time that suits you. Times are in India time.', widget: { kind: 'booking' } }], state: st };
    if (pending === 'brochure') return { replies: [{ text: 'Of course. Where should I send the brochure, floor plans and price sheet?', widget: { kind: 'lead', reason: 'brochure' } }], state: st };
    if (pending === 'callback') return { replies: [{ text: 'Perfect. Leave your number and a sales advisor will get back to you, usually within the hour during the day.', widget: { kind: 'lead', reason: 'callback' } }], state: st };
  }
  if (is('no') && others.length === 0) {
    const follow = qualifierFollowUp(p);
    st.pending = follow.pending;
    return { replies: [{ text: 'No problem at all.' }, follow.reply], state: st };
  }

  // ---- Main intents, most specific first ----
  if (is('builder')) {
    return {
      replies: [{
        text: `This website, including me, the 3D villa and the booking flow, was built by **${PROJECT.builtBy}** as a demo of what he builds for real estate teams: websites, AI assistants, automatic follow-ups and 3D property tours.`,
        widget: { kind: 'links', links: [{ kind: 'external', label: "Visit Shripaad's website", href: PROJECT.builtByUrl }] },
        chips: ['Show me the villas', 'Book a viewing'],
      }],
      state: st,
    };
  }

  if (is('bot') && !is('price') && !is('viewing')) {
    return {
      replies: [{ text: "I'm the Skyline Villas AI assistant. I answer questions instantly, day or night, and I can hand you over to a person whenever you like. What can I help you with?", chips: MAIN_CHIPS }],
      state: st,
    };
  }

  const wantsSend = t.has('send', 'share', 'email', 'mail') || t.says('send me', 'can i get', 'can i have');
  if (wantsSend && (is('brochure') || is('price') || is('payment')) && !is('location')) {
    return { replies: [{ text: 'Of course. Where should I send the brochure, floor plans, price sheet and payment plan?', widget: { kind: 'lead', reason: 'brochure' } }], state: st };
  }

  if (is('viewing') && !is('price') && !is('location') && !is('nri') && !is('possession') && !is('payment')) {
    if (p.viewing && !t.has('change', 'reschedule', 'another', 'different')) {
      return { replies: [{ text: 'You already have a viewing requested. Would you like to pick a different time?', chips: ['Change the time', 'Keep it'] }], state: st };
    }
    const when = findWhen(t);
    const mode = t.has('video', 'online', 'virtual', 'zoom', 'remote') ? 'video' : t.says('site visit', 'in person') ? 'site' : undefined;
    return {
      replies: [{
        text: pick([
          'Lovely, let\'s set up a private viewing. Pick a day and time that suits you:',
          'Of course. Choose a day and time and I\'ll reserve it for you:',
        ]),
        widget: { kind: 'booking', dayHint: when.dayHint, band: when.band, mode },
      }],
      state: st,
    };
  }

  if (is('brochure') && !is('price') && !is('payment')) {
    return { replies: [{ text: 'Happy to. Where should I send the brochure, floor plans and price sheet?', widget: { kind: 'lead', reason: 'brochure' } }], state: st };
  }

  if (is('price') || (budget !== undefined && !is('payment'))) {
    p.askedPrice = true;
    st.pending = 'brochure';
    const target = ids.length ? ids : st.lastResidence && /\b(it|this|that)\b/.test(t.n) ? [st.lastResidence] : [];
    const out = priceReply(p, target, budget);
    if (is('viewing')) {
      out.push({ text: 'And for the viewing, pick a day and time that suits you:', widget: { kind: 'booking' } });
      st.pending = null;
    }
    return { replies: out, state: st };
  }

  if (is('payment')) {
    st.pending = 'callback';
    return {
      replies: [{
        text: `Payment is ${PROJECT.payment}. For example, on Skyline Two (from ${priceLabel('skyline-two')}) you'd pay a booking amount first and the rest in stages as construction progresses. Would you like our loan advisor to call you with an EMI estimate?`,
        chips: ['Yes, call me', 'Send the payment plan', 'Not now'],
      }],
      state: st,
    };
  }

  if (is('nri')) {
    return {
      replies: [{
        text: `${PROJECT.nri} I can set up a video walkthrough at a time that works in your time zone.`,
        chips: ['Book a video walkthrough', 'Send the brochure', 'Prices'],
      }],
      state: st,
    };
  }

  if (is('location')) {
    st.pending = 'viewing';
    return {
      replies: [{
        text: `Skyline Villas sits in ${PROJECT.location}. It's ${PROJECT.airport}, with international schools, hospitals and dining close by. Would you like to visit the site?`,
        widget: { kind: 'links', links: [{ kind: 'scroll', label: 'See the location', to: 'location' }, { kind: 'whatsapp', label: 'Get the map pin on WhatsApp' }] },
        chips: ['Book a site visit', 'Prices'],
      }],
      state: st,
    };
  }

  if (is('household') && ids.length === 0) {
    p.purpose = p.purpose ?? 'family';
    const big = t.has('parents', 'joint', 'large', 'big') || /\b(5|6|7|8|five|six|seven|eight)\b/.test(t.n);
    const id: ResidenceId = big ? 'skyline-three' : 'skyline-one';
    st.lastResidence = id;
    st.pending = 'viewing';
    return {
      replies: [{
        text: big
          ? `For a larger family, **Skyline Three** is the natural fit: 5 bedrooms over 3 levels with a private lift, so parents and children each have their own floor. From ${priceLabel('skyline-three')}.`
          : `For a family, most buyers choose **Skyline One**: 4 bedrooms, open living around a double-height lounge and private gardens, from ${priceLabel('skyline-one')}. If you prefer quiet and privacy, **Skyline Two** wraps around a courtyard and starts from ${priceLabel('skyline-two')}.`,
        widget: { kind: 'residence', id },
        chips: ['Book a viewing', 'Compare all three', 'Prices'],
      }],
      state: st,
    };
  }

  if (is('compare') || (ids.length === 2 && !is('price'))) {
    return {
      replies: [
        { text: 'Here is how the three compare:', widget: { kind: 'compare' } },
        { text: 'Tell me who will live there and your rough budget, and I will point you to the right one.', chips: ['Family of four', 'Budget around ₹6 Cr', 'I want the biggest'] },
      ],
      state: st,
    };
  }

  if (is('availability') || is('possession') || is('legal') || is('discount') || is('maintenance')) {
    const subject = is('legal')
      ? 'approvals, registration details and title documents'
      : is('possession')
        ? 'the current construction schedule and handover timeline'
        : is('discount')
          ? 'the current launch offers'
          : is('maintenance')
            ? 'the maintenance charges'
            : `which plots are open${st.lastResidence ? ` for ${residence(st.lastResidence).title}` : ''}`;
    st.pending = 'callback';
    return {
      replies: [{
        text: `The sales team confirms ${subject} directly, so you always get the latest, accurate answer rather than my guess. Shall I ask them to send it to you?`,
        chips: ['Yes, please', 'Book a viewing', 'Not now'],
      }],
      state: st,
    };
  }

  if (ids.length === 1 && !is('amenities') && !is('tour3d')) {
    const id = ids[0];
    st.pending = 'viewing';
    return {
      replies: [{
        text: `${residenceIntro(id)} Would you like to see it in person?`,
        widget: { kind: 'residence', id },
        chips: ['Book a viewing', 'Explore in 3D', 'Payment plan'],
      }],
      state: st,
    };
  }

  if (is('amenities')) {
    const extra = ids[0] ? ` ${residence(ids[0]).title} also has: ${residence(ids[0]).features.slice(0, 3).join('; ')}.` : ' Skyline Three adds a 12 m heated lap pool, a private cinema and a private lift.';
    return {
      replies: [{
        text: `Every residence comes with:\n${PROJECT.amenities.map((a) => `• ${a}`).join('\n')}\n${extra.trim()} Is there anything specific you're looking for?`,
        chips: ['Skyline Three', 'Explore in 3D', 'Book a viewing'],
      }],
      state: st,
    };
  }

  if (is('custom')) {
    return {
      replies: [{
        text: 'Yes. A considered selection of finishes and interior options can be tailored to you, depending on the stage of construction. Is there something specific you would like to change?',
        chips: ['Ask an advisor', 'Book a viewing', 'Prices'],
      }],
      state: st,
    };
  }

  if (is('tour3d')) {
    const photos = t.has('photos', 'pictures', 'images', 'gallery', 'interior', 'interiors') && !t.says('3d', '3 d');
    return {
      replies: [{
        text: photos
          ? 'The photo gallery shows the architecture, interiors and gardens, and you can also walk around the full villa in 3D right here on the site. Where would you like to go?'
          : 'You can walk around the full villa in 3D right here on the site: turn it, tilt it and zoom in close to the materials. Want me to take you there?',
        widget: { kind: 'links', links: [{ kind: 'scroll', label: 'Explore the villa in 3D', to: 'showcase' }, { kind: 'scroll', label: 'Photo gallery', to: 'gallery' }] },
        chips: ['Book a viewing', 'Prices'],
      }],
      state: st,
    };
  }

  if (is('invest')) {
    st.pending = 'callback';
    p.purpose = p.purpose ?? 'investment';
    return {
      replies: [{
        text: "The Financial District corridor has grown with the offices around it, which is why villas here appeal to long-term buyers. I can't promise returns, but the team can share recent price trends for the area. Shall I ask them to send those to you?",
        chips: ['Yes, please', 'Prices', 'Not now'],
      }],
      state: st,
    };
  }

  if (is('vastu')) {
    st.pending = 'brochure';
    return {
      replies: [{
        text: `Skyline One is ${RESIDENCE_FACTS['skyline-one'].facing}, which many buyers prefer. Each plot's orientation is marked on its floor plan. Shall I send you the plans so you can check the vastu details?`,
        chips: ['Yes, send them', 'Book a viewing'],
      }],
      state: st,
    };
  }

  if (is('human')) {
    st.pending = 'callback';
    return {
      replies: [{
        text: 'Of course. You can message the sales team on WhatsApp right now, or leave your number and an advisor will call you back.',
        widget: { kind: 'lead', reason: 'callback' },
      }],
      state: st,
    };
  }

  if (is('pets')) {
    return { replies: [{ text: 'Pets are very welcome. These are private villas with your own gardens, so there is plenty of space for them. Anything else I can help with?', chips: MAIN_CHIPS }], state: st };
  }

  if (is('residences')) {
    return {
      replies: [
        { text: 'There are three residences, each with its own character:', widget: { kind: 'residences' } },
        { text: 'Who will be living there? I can suggest the best fit.', chips: ['Compare them', 'Prices', 'Book a viewing'] },
      ],
      state: st,
    };
  }

  if (is('thanks')) {
    return { replies: [{ text: 'My pleasure! Anything else I can help with: prices, the 3D tour, or a viewing?', chips: MAIN_CHIPS }], state: st };
  }

  if (is('bye')) {
    return { replies: [{ text: "Thank you for visiting Skyline Villas. If anything comes up later, I'm here day and night." }], state: st };
  }

  if (is('greet')) {
    const hello = t.has('namaste', 'namaskar') ? 'Namaste!' : t.has('salaam', 'salam') ? 'Salaam!' : 'Hello!';
    return { replies: [{ text: `${hello} How can I help you today?`, chips: MAIN_CHIPS }], state: st };
  }

  if (is('yes') && !pending) {
    return { replies: [{ text: 'Great! What would you like to do next?', chips: MAIN_CHIPS }], state: st };
  }

  if (name && intents.length === 0) {
    return { replies: [{ text: `Nice to meet you, ${name}! How can I help: prices, the three residences, or a private viewing?`, chips: MAIN_CHIPS }], state: st };
  }

  if (t.says('note my budget')) {
    st.pending = 'callback';
    return { replies: [{ text: 'Of course. Leave your details and I will pass your budget to the team, so they can share homes that fit it.', widget: { kind: 'lead', reason: 'callback' } }], state: st };
  }

  // ---- Nothing matched: don't guess ----
  st.pending = 'callback';
  return {
    replies: [{
      text: "That's a good question, and I'd rather not guess. I can have a sales advisor answer it for you, or you can ask me about prices, the three residences, the location or booking a viewing.",
      chips: ['Ask an advisor', 'Prices', 'Book a viewing'],
    }],
    state: st,
  };
}

/** Rough lead temperature for the summary the sales team receives. */
export function leadScore(p: Profile): { label: 'Hot' | 'Warm' | 'Nurture'; why: string } {
  if (p.viewing?.mode === 'site' || p.timeline === 'soon') return { label: 'Hot', why: p.viewing ? 'Site visit booked' : 'Buying within 3 months' };
  if (p.viewing || p.timeline === 'mid' || p.askedPrice) return { label: 'Warm', why: p.viewing ? 'Video walkthrough booked' : p.timeline === 'mid' ? 'Buying in 3 to 6 months' : 'Asked about pricing' };
  return { label: 'Nurture', why: 'Early research' };
}
