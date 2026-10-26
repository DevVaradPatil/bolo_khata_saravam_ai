# Bolo Khata

**Speak it. The khata writes itself.** · बोलो, और खाता लिख गया।

A voice-first credit (udhaar) ledger for India's small shops, built on Sarvam AI.

**Live demo:** https://bolo-khata-pi.vercel.app

## Team

| Name | Roll no. |
|---|---|
| Varad Arun Patil | 251340014 |
| Soham Rajesh Kelaskar | 251110072 |

## What it does

The shop owner taps the mic and speaks naturally, in Hindi, Marathi, English or a mix, for example
*"Ramesh Dairy ko 350 ka udhaar, doodh aur paneer"*. The app shows a confirm card and says the entry
back aloud. One tap on **Haan, save** writes it to the khata.

- Credit and payment entries, several in one sentence
- Questions: *"Priya ka kitna baaki hai?"*, *"Aaj kitna udhaar gaya?"*, *"Sabse zyada kiske baaki hain?"*
- New customers and "cancel the last entry" by voice
- Asks *"Ramesh Kumar ya Ramesh Dairy?"* when a first name is shared, instead of guessing
- A typing box for noisy counters, plus a full manual ledger: customers, history, search in Latin or Devanagari

## Sarvam AI APIs used

| API | Model | Role |
|---|---|---|
| Speech-to-Text | `saaras:v4` (codemix) | Turns the owner's speech into text and detects the language |
| Chat Completions + tool calling | `sarvam-105b-conversations` | The agent: picks customer, amount and action, or asks which customer is meant |
| Text-to-Speech | `bulbul:v4-flash` | Speaks the reply in Hindi, Marathi or English |

We compared both 105B chat models on 15 Hindi, Marathi and Hinglish sentences before building.
`sarvam-105b-conversations` got all 15 right and replied in about 0.25 s. The details are in [PLAN.md](PLAN.md) and the scripts in [`spike/`](spike).

## Built to be trusted with money

- The agent only *proposes*. Nothing is saved until the owner confirms, and the server re-checks every value it receives.
- Amounts are stored as whole paise. Undo crosses an entry out instead of deleting it.

## Tech

Next.js 16 on Vercel · Neon Postgres (Vercel Marketplace) · Drizzle ORM · `sarvamai` JS SDK.
Pitch deck: [deck/pitch.pdf](deck/pitch.pdf).

## Run locally

Put `SARVAM_API_KEY=...` in `.env`. Run `npx vercel env pull` to get `DATABASE_URL` (or set it yourself), then:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
