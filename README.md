# Skyline Villas

A demo real estate website by Shripaad Koduri: a concept collection of three private villas in Hyderabad, with an interactive 3D villa and an AI sales assistant.

Live: https://skylinevillas-puce.vercel.app

## What the site shows

- **AI assistant** (bottom-right). Answers buyer questions about prices, residences, location, payment plans and NRI buying. It also:
  - compares the three villas
  - books private viewings or video walkthroughs in India time, with Google Calendar and Apple/Outlook invites
  - qualifies the buyer (purpose, budget, timeline) and scores the lead
  - hands off to WhatsApp
  - speaks and listens in browsers that support voice
- **Lead capture that really delivers.** Every viewing, brochure or call-back request from the assistant and the enquiry form is emailed to the sales inbox as a lead summary with the conversation attached.
- **Interactive 3D villa** with a real download-progress loader and a retry if the model fails to load.
- Opening sequence, scroll animations, and search-engine basics: structured data, sitemap and robots.

## Run it

```bash
npm install
npm run dev
```

## The assistant's two modes

1. **Built-in mode** (always on). It runs entirely in the browser, needs no keys, and is grounded in `src/chat/knowledge.ts`. Anything it isn't sure of goes to the sales team instead of being guessed.
2. **AI mode** (optional). This is a real language model that answers free-form questions in any language. It switches on automatically when `/api/chat` can reach a model:
   - Add `GEMINI_API_KEY` in Vercel → Project → Settings → Environment Variables. A free key comes from https://aistudio.google.com/apikey. Then redeploy.
   - Or enable Vercel AI Gateway for the project. The route uses the deployment's own token, so no key is needed.

   Check it at `/api/chat?selftest=1`. If the model is ever unavailable, the built-in mode answers instead.

The facts the AI may use live in `api/chat.js`. Keep them in step with `src/chat/knowledge.ts`.

## Lead emails

Leads are sent through FormSubmit to the inbox set in `src/chat/leads.ts`. The first request from a new site address triggers a one-time **Activate Form** email to that inbox. Click it once, and every lead after that is delivered.
