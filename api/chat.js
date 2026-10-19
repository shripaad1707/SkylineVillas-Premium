/**
 * Skyline Villas concierge: AI route (Vercel serverless function).
 *
 * GET  /api/chat   -> { ai: boolean }   whether a language model is reachable
 * POST /api/chat   -> { reply, action, residence, chips }
 *
 * Model, in order of preference:
 *   1. Google Gemini, if GEMINI_API_KEY is set in the Vercel project
 *      (free key from https://aistudio.google.com/apikey).
 *   2. Vercel AI Gateway, using AI_GATEWAY_API_KEY or the deployment's own
 *      OIDC token (no key needed on Vercel when the gateway is enabled).
 * With neither available the route answers { ai: false } and the website
 * falls back to its built-in concierge, so the chat always works.
 *
 * The facts below mirror src/chat/knowledge.ts; update both together.
 */

const FACTS = `
PROJECT: Skyline Villas, a collection of three contemporary private villas in the Financial District corridor of west Hyderabad, Telangana, India. Gated community with landscaped walkways. Presented on this website as a concept collection; specifications and prices are indicative.

RESIDENCES (indicative starting prices; final price depends on plot and finishes):
1. Skyline One ("skyline-one"), contemporary family residence. 4 bedrooms, 5 bathrooms, approx. 4,200 sq.ft., 2 levels + terrace garden. From ₹6.2 Cr (about ₹14,800 per sq.ft). East-facing for morning light. Double-height lounge with floor-to-ceiling glazing; dual master suites with terrace access; European chef kitchen with concealed pantry; private reflecting pool and shaded deck; covered parking for two cars with EV charging. Materials: travertine, smoked walnut, black steel. Best for families who want open living, gardens and natural light.
2. Skyline Two ("skyline-two"), private courtyard residence. 4 bedrooms, 5 bathrooms, approx. 3,800 sq.ft., 2 levels. From ₹5.4 Cr (about ₹14,200 per sq.ft). Built around an enclosed central courtyard with a water feature; ground-floor wellness wing with private plunge pool; upper-level library loft; integrated home automation. Materials: limestone, cedar, acoustic plaster. Quiet and private; the most accessible price.
3. Skyline Three ("skyline-three"), signature residence. 5 bedrooms, 6 bathrooms, approx. 5,000 sq.ft., 3 levels with private lift. From ₹8.6 Cr (about ₹17,200 per sq.ft). 12-metre heated lap pool and timber sundeck; climate-controlled wine cellar and private cinema; penthouse master suite with sky lounge and spa bath; staff quarters with separate access; secure three-car underground parking; rooftop deck. Best for entertaining and larger families.

ALL RESIDENCES: private landscaped gardens; indoor-outdoor living with sliding glass walls; premium materials (teak, natural stone, brushed brass, double glazing); private parking with fast EV charging; smart-home climate, lighting and motorised louvres. Pets are welcome (private gardens). A selection of finishes and interior options can be tailored, depending on construction stage.

LOCATION: Financial District corridor, west Hyderabad: close to the Financial District and HITEC City offices, international schools, hospitals, dining and retail. Outer Ring Road access; roughly 35 to 40 minutes to Rajiv Gandhi International Airport depending on traffic. Exact map pin is shared on WhatsApp or at the viewing.

PAYMENT: booking amount, then a construction-linked payment plan. Home loans through leading banks; NRI home loans available. A loan advisor can call with an EMI estimate.

BUYERS ABROAD (NRIs): live video walkthroughs, documents shared digitally, paperwork can be completed remotely through a power of attorney.

VIEWINGS: private site visits or live video walkthroughs, every day 10 AM to 7 PM India time, by appointment. The website has a booking picker for this.

ON THIS WEBSITE: an interactive 3D model of the villa (rotate, tilt, zoom), a photo gallery, a location section.

NOT IN THE FACT SHEET (the sales team confirms these; never guess): RERA or approval numbers, title and legal documents, possession or handover dates, construction progress, exact availability of plots, maintenance charges, current offers or discounts, taxes and registration costs, rental yields or returns.
`;

const SYSTEM = `You are the Skyline Villas assistant: the AI sales assistant on the Skyline Villas website. Call yourself the Skyline assistant, never a concierge. You talk like a warm, polished, experienced real-estate sales advisor in Hyderabad.

HOW YOU WRITE
- Short: 1 to 3 sentences, about 60 words at most. A short bullet list (•) is fine for prices or comparisons.
- Answer the question first, then move the visitor one step forward (compare homes, get the price sheet, book a private viewing) with exactly one question.
- Plain text. Use **bold** only for residence names and prices. No headings, no emojis.
- Reply in the visitor's language (English, Hindi, Telugu, Arabic and so on); keep residence names in English.
- You are an AI assistant. Say so if asked; never claim to be a person.
- State only facts from the fact sheet. For anything listed as not in the fact sheet, or anything else you are unsure of, say the sales team will confirm it and offer to request it. Never invent numbers, dates, addresses, availability or returns.
- Off-topic questions: answer briefly if harmless, then guide back to the villas.
- If asked who built this website or this assistant: Shripaad Koduri built it as a demo of what he builds for real estate teams (websites, AI assistants, automatic follow-ups and 3D property tours); his site is https://shripaads-agency.vercel.app.
- Never ask the visitor to type a phone number or email into the chat. The website shows a secure form when you use the actions book_viewing, send_brochure or request_callback.

FACT SHEET
${FACTS}

OUTPUT
Return only one JSON object and nothing else:
{"reply": "...", "action": "...", "residence": null, "chips": ["...", "..."]}
- reply: your message.
- action: one of
  none | show_residences (cards for all three) | show_residence (one card; set residence) | compare (comparison table) |
  book_viewing (booking picker: visiting, seeing it in person, video walkthrough) | send_brochure (form to send brochure, floor plans, price sheet, payment plan) |
  request_callback (form for an advisor to call back or answer something you cannot) | whatsapp (button to message the sales team) |
  show_3d (button to the interactive 3D villa) | show_gallery | show_location
  Use an action only when it directly helps with what the visitor just asked.
- residence: "skyline-one", "skyline-two", "skyline-three" or null.
- chips: up to 3 short follow-up buttons (2 to 4 words each) in the visitor's language.`;

const ACTIONS = new Set([
  'none', 'show_residences', 'show_residence', 'compare', 'book_viewing', 'send_brochure',
  'request_callback', 'whatsapp', 'show_3d', 'show_gallery', 'show_location',
]);
const RESIDENCES = new Set(['skyline-one', 'skyline-two', 'skyline-three']);

// ---------------------------------------------------------------------------

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 5 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 40;
}

function provider(req) {
  if (process.env.CONCIERGE_AI === 'off') return null;
  if (process.env.GEMINI_API_KEY) return { name: 'gemini', key: process.env.GEMINI_API_KEY };
  const token = process.env.AI_GATEWAY_API_KEY || req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (token) return { name: 'gateway', key: token };
  return null;
}

async function post(url, headers, body, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { ok: res.ok, status: res.status, text, json };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(key, system, messages, maxTokens) {
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'user' ? 'user' : 'model';
    if (!contents.length && role === 'model') continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${m.text}`;
    else contents.push({ role, parts: [{ text: m.text }] });
  }
  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

  const models = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
  let lastError = 'no model';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const base = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.55, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    };
    let r = await post(url, { 'x-goog-api-key': key }, { ...base, generationConfig: { ...base.generationConfig, thinkingConfig: { thinkingBudget: 0 } } }, 9000);
    if (r.status === 400) r = await post(url, { 'x-goog-api-key': key }, base, 9000);
    if (r.status === 404) {
      lastError = `model ${model} not found`;
      continue;
    }
    if (!r.ok) throw new Error(`gemini ${r.status}: ${(r.json?.error?.message || r.text).slice(0, 160)}`);
    const text = (r.json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    return { text, model };
  }
  throw new Error(lastError);
}

async function callGateway(token, system, messages, maxTokens) {
  const models = [process.env.AI_MODEL, 'google/gemini-2.5-flash-lite', 'openai/gpt-4.1-mini', 'openai/gpt-4o-mini'].filter(Boolean);
  let lastError = 'no model';
  for (const model of models) {
    const body = {
      model,
      messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))],
      temperature: 0.55,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    };
    const url = 'https://ai-gateway.vercel.sh/v1/chat/completions';
    let r = await post(url, { Authorization: `Bearer ${token}` }, body, 9000);
    if (r.status === 400 && /response_format|json/i.test(r.text)) {
      delete body.response_format;
      r = await post(url, { Authorization: `Bearer ${token}` }, body, 9000);
    }
    if (r.status === 404 || (r.status === 400 && /model/i.test(r.text))) {
      lastError = `model ${model} unavailable`;
      continue;
    }
    if (!r.ok) throw new Error(`gateway ${r.status}: ${(r.json?.error?.message || r.text).slice(0, 160)}`);
    return { text: r.json?.choices?.[0]?.message?.content || '', model };
  }
  throw new Error(lastError);
}

function complete(p, system, messages, maxTokens = 600) {
  return p.name === 'gemini' ? callGemini(p.key, system, messages, maxTokens) : callGateway(p.key, system, messages, maxTokens);
}

function parseTurn(text) {
  let obj = null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      obj = JSON.parse(text.slice(start, end + 1));
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj.reply !== 'string') {
    const plain = text.replace(/```[a-z]*|```/g, '').trim();
    return plain ? { reply: plain.slice(0, 900), action: 'none', residence: null, chips: [] } : null;
  }
  const reply = obj.reply.replace(/^#+\s*/gm, '').trim().slice(0, 900);
  if (!reply) return null;
  return {
    reply,
    action: ACTIONS.has(obj.action) ? obj.action : 'none',
    residence: RESIDENCES.has(obj.residence) ? obj.residence : null,
    chips: Array.isArray(obj.chips) ? obj.chips.filter((c) => typeof c === 'string' && c.trim() && c.length <= 40).slice(0, 3) : [],
  };
}

// A real round trip to the model, cached per instance, so the page only
// switches to AI mode when the model actually answers.
let probe = { at: 0, ok: false, detail: '' };
async function probeModel(p) {
  if (Date.now() - probe.at < 10 * 60 * 1000) return probe;
  try {
    const r = await complete(p, 'Reply with the JSON object {"ok": true} and nothing else.', [{ role: 'user', text: 'ping' }], 40);
    probe = { at: Date.now(), ok: Boolean(r.text), detail: `${p.name}:${r.model}` };
  } catch (err) {
    probe = { at: Date.now(), ok: false, detail: `${p.name}: ${String(err && err.message ? err.message : err).slice(0, 200)}` };
  }
  return probe;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const p = provider(req);

  if (req.method === 'GET') {
    if (!p) return res.status(200).json({ ai: false });
    const result = await probeModel(p);
    const payload = { ai: result.ok };
    if (req.query && req.query.selftest) payload.detail = result.detail;
    return res.status(200).json(payload);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!p) return res.status(503).json({ error: 'ai_unavailable' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'slow_down' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const raw = Array.isArray(body && body.messages) ? body.messages : [];
  const messages = raw
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(-14)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text.slice(0, 700) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'bad_request' });
  }
  const visitor = typeof body.visitor === 'string' ? body.visitor.slice(0, 400) : '';
  const system = visitor ? `${SYSTEM}\n\nWHAT WE KNOW ABOUT THIS VISITOR SO FAR: ${visitor}` : SYSTEM;

  try {
    const { text } = await complete(p, system, messages);
    const turn = parseTurn(text);
    if (!turn) return res.status(502).json({ error: 'empty_reply' });
    return res.status(200).json(turn);
  } catch (err) {
    console.error('concierge ai error', String(err && err.message ? err.message : err).slice(0, 300));
    return res.status(502).json({ error: 'ai_error' });
  }
}
