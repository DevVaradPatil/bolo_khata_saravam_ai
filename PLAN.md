# Bolo Khata — plan

A voice-first credit (udhaar) ledger for small shops. The owner holds the mic and speaks the way they
normally would ("Ramesh ko 250 ka udhaar, atta aur tel"). The app understands it, says back what it
heard, and updates the khata once the owner confirms. No typing needed.

**Who it's for:** kirana, dairy, medical and hardware shop owners who keep a paper khata, talk in
Hindi, Marathi, Tamil or Hinglish, and don't want to type on a phone.

---

## 1. What each Sarvam model does

Sarvam handles every AI step in the app: hearing, understanding, speaking, translating and reading.

| Job in the app | Sarvam API / model | How we use it |
|---|---|---|
| Hear the owner | **Saaras v4** speech-to-text (`/speech-to-text`, `mode: codemix`) | Turns the voice clip into text. No `keyterms` by default: in Phase 0 they turned "Ganesh Kale" into "Ramesh Kale". The agent matches names against the customer list instead. |
| Understand and act | **`sarvam-105b-conversations`** chat with **tool calling** | The agent. It picks tools (add credit, record payment, check balance…), asks which person is meant when a first name is shared ("Ramesh Kumar or Ramesh Dairy?"), and works out spoken amounts ("dhai sau" = 250). |
| Talk back | **Bulbul v4 Flash** text-to-speech | Speaks the confirmation and answers in the owner's language. It's the cheapest TTS (₹1 per 1,000 characters). |
| Remind customers | **Mayura** translate (`mode: modern-colloquial`) + Bulbul | Writes the payment reminder in the *customer's* language, which may differ from the owner's, and makes a short voice note for it. |
| Match names | Transliterate | Treats "रमेश" and "Ramesh" as the same person, and shows names in both scripts. |
| Import the paper khata | **Sarvam Vision Document AI** (`extract` with a JSON schema) | The owner photographs an old khata page or supplier bill. It comes back as rows (name, amount, date), which the owner reviews and then imports. |
| Daily summary | Sarvam-105B (`response_format: json_schema`) + Bulbul | "Aaj ka hisaab": today's credit, collections and the top 3 overdue customers, spoken aloud. |

**Which chat model (decided in Phase 0).** `sarvam-105b-conversations`: 15/15 correct and about
250 ms per reply, against 14/15 and about 2.5 s for `sarvam-105b`. The full results are in section 9.

**Stretch goal: an AI calls the customer.** Sarvam's Voice Agents (Samvaad) API has an "Instant Outbound
Call" that could phone a customer with the reminder. It costs about ₹3 a minute, so it's one demo call
at most, and only if credits allow.

---

## 2. Features

**Must have (MVP)**
1. **Voice entry.** Speak to add credit, record a payment, add a customer, ask a balance ("Sunita ka kitna baaki?"), or undo the last entry.
2. **Confirm before saving.** Every change to the money is shown as a card *and* read aloud, and saved only after a tap or a spoken "haan". This prevents wrong entries.
3. **Customers.** A list with what each person owes, search, and a full history per customer.
4. **Home dashboard.** Total owed to the shop, today's credit and collections, recent entries, and a big mic button.
5. **Reminders.** One tap creates a WhatsApp message (a `wa.me` link the owner sends themselves) and a voice note, both in the customer's language.

**Should have**
6. Scan the old khata (Document AI).
7. "Aaj ka hisaab" spoken daily summary.
8. Choice of UI language and voice in settings.
9. Login so several shops can each have their own khata.

**Skipped for now:** offline mode, inventory, GST invoices, payment collection, live streaming speech-to-text.

---

## 3. Architecture

```
Phone browser (Next.js page, PWA)
  │  MediaRecorder → webm/opus clip (≤25 s)
  ▼
POST /api/voice  (Vercel Function, Node)
  1. Saaras v4 STT  (keyterms = customer + product names)
  2. Agent loop: Sarvam-105B + tools  ──►  Postgres (read-only tools)
       write tools return a *proposed* action, they don't write
  3. Bulbul v4 Flash TTS of the reply
  ◄─ { transcript, reply, proposedActions[], audio(base64) }
  │
Owner taps ✓  →  POST /api/actions/confirm  →  writes to Postgres
```

- **Stack:** Next.js (App Router, TypeScript), Tailwind + shadcn/ui, the `sarvamai` JS SDK (v1.1.x), Drizzle ORM, deployed on Vercel.
- **Database:** Postgres from the Vercel Marketplace (Neon), so `DATABASE_URL` is filled in automatically.
- **Agent loop:** written by hand with the Sarvam SDK, about 50 lines: call → run tools → call again, at most 4 rounds.
- **Limits we work within:** the speech-to-text REST call takes up to 30 s of audio, so the mic stops at 25 s. A 25 s opus clip is about 200 KB, well under Vercel's 4.5 MB request limit. Document AI runs as a background job; the function polls it (Vercel functions can run up to 300 s).

**Agent tools**

| Tool | Writes? | Purpose |
|---|---|---|
| `find_customer(name)` | no | Fuzzy match across both scripts; returns the matching customers |
| `get_balance(customer_id)` | no | What the customer owes, plus the last 5 entries |
| `list_dues(limit)` | no | Who owes the most / longest |
| `get_summary(period)` | no | Totals for today or this week |
| `propose_entry(customer_id, type, amount, note)` | proposes | Credit or payment, shown for confirmation |
| `propose_customer(name, phone?, language?)` | proposes | New customer |
| `propose_undo()` | proposes | Reverses the last entry |

**Data model** (amounts stored as whole paise, never decimals)

```
shops      id, name, owner_language, voice, created_at
customers  id, shop_id, name, name_latin, phone, language, created_at
entries    id, shop_id, customer_id, type('credit'|'payment'), amount_paise,
           note, source('voice'|'manual'|'scan'), transcript, created_at, voided_at
```
A balance is the sum of credits minus payments, ignoring voided entries. Undo marks an entry voided and never deletes it, so the history stays complete.

---

## 4. Screens (mobile first, bottom navigation)

1. **Home:** big mic button, "₹ owed to you" total, today's credit and collections, recent entries.
2. **Voice sheet:** live recording indicator → transcript → agent reply (text and audio) → confirm cards.
3. **Customers:** searchable list sorted by amount owed; tap to open history and Remind / Add entry buttons.
4. **Remind:** message preview in the customer's language, voice note player, "Send on WhatsApp".
5. **Scan:** take a photo → extracted rows you can edit → Import.
6. **Settings:** shop name, language, voice, and Sarvam usage this month.

Look and feel: warm and calm, large touch targets, clear ₹ numbers, credit in amber and payments in green.
It should feel like a well-kept notebook, not a banking app.

---

## 5. Build phases

| Phase | What gets built | Done when |
|---|---|---|
| **0. Spike** (½ day) | Node scripts that call STT with keyterms on 3 recorded Hinglish clips; run 15 sample utterances through tool calling on **both** 105B models (accuracy and timing); try 3–4 Bulbul v4 Flash voices | Chat model chosen, voice chosen, real timing measured |
| **1. Ledger without voice** | Create the Next.js project, database schema and migrations, customer and entry pages, manual entry form, home totals, seed demo data. **Deploy to Vercel on day one.** | You can run a khata by typing, on the live URL |
| **2. Voice core** | Mic recorder, `/api/voice`, agent loop + tools, confirm cards, spoken replies, undo | The 15 test sentences work start to finish on a real phone |
| **3. Multilingual + reminders** | Language and voice settings, keyterms from the database, transliterated names, Mayura reminders, Bulbul voice note, `wa.me` link | A Hindi-speaking owner sends a Tamil reminder to a customer |
| **4. Scan + summary + login** | Document AI import with a review screen, "Aaj ka hisaab", login per shop | A photo of a khata page becomes entries; two shops stay separate |
| **5. Polish + demo** | Installable app, empty and error states, loading feedback, scripted 3-minute demo and pitch | Demo runs without a hitch twice in a row |

**Status:** Phase 0 done. Phase 1 done (2026-10-26) and live at https://bolo-khata-pi.vercel.app. Stack:
Next.js 16 (Cache Components on), Neon Postgres in us-east-1 through the Vercel Marketplace, Drizzle
with `pg` + `attachDatabasePool`. Commands: `npm run db:migrate`, `npm run db:seed` (wipes and re-seeds the demo shop), `npm test`.

---

## 6. Cost and credits

Rough cost of one voice turn: STT for 10 s ≈ ₹0.08, chat with tools at ~4K tokens ≈ ₹0.10,
TTS for 150 characters ≈ ₹0.15, **about ₹0.35 in total**. The ₹100 free credit covers roughly 280
turns, so we use recorded clips and text-only tests during development and save live voice for real checks.

## 7. Risks

- **Wrong amount or wrong customer:** prevented by the confirm step, the amount being read back, and keyterms.
- **Two customers with the same name:** the agent must ask which one, never guess.
- **Delay:** the reply text shows as soon as it's ready and the audio follows. Streaming can come later if needed.
- **Running out of credits:** test with fixtures and show usage in Settings.

## 8. Decisions

1. **Languages:** Hindi, English and Marathi (decided).
2. **Login:** a simple shop PIN, for the demo (decided). The PIN is stored hashed.
3. **"Kivi talking agent":** not found in Sarvam's docs or on the web. Still open: need a link or name.

---

## 9. Phase 0 results (2026-10-26)

The scripts are in `spike/`, and the audio they produced is in `spike/out/`. The whole spike cost about ₹4 of credits.

**Text-to-speech (Bulbul v4 Flash).** Each 60–80 character sentence took 0.8–1.7 s. Six voices were
auditioned (`voice_*.mp3`): `ishita_hi_numbers`, `ritu_hi_customer_warm`, `shubh_hi_customer`,
`ishita_enhi_customer` for Hindi, and `ishita_mr_conversational`, `nilesh_mr_conversation` for Marathi.
Voices are tied to a language, so the app picks one per language.

**Speech-to-text (Saaras v4, codemix).** 0.25–0.5 s per clip. All three test clips were transcribed
correctly *without* keyterms. With keyterms, "Ganesh Kale" became "Ramesh Kale", so keyterms stay off.
Numbers come back either as digits (350) or as words (दोनशे वीस); the agent handles both.
The test clips were made with TTS, so we still need to try real recordings with shop noise.

**Agent (tool calling, 15 test sentences in Hindi, Marathi and Hinglish).**

| Model | Correct | Average time | Notes |
|---|---|---|---|
| `sarvam-105b` | 14/15 | ~2,550 ms (up to 8.8 s) | Once wrote the tool call as plain text instead of a real call |
| `sarvam-105b-conversations` | **15/15** | **~250 ms** | Needs the shared-first-names hint (below) |

**What we learned for the build:**
- Put the customer list (id, name, name in Devanagari, balance) straight into the system prompt. The agent then picks the customer in a single step, without needing a `find_customer` tool.
- Work out which first names are shared **in code** and list them in the prompt ("Ramesh → Ramesh Kumar or Ramesh Dairy"). Prompt wording alone failed in both directions: the model either guessed a customer, or asked "which Ganesh?" when there was only one.
- Several transactions in one sentence come back as several `propose_entry` calls, so the confirm screen has to handle a list.
- One voice turn takes roughly 0.4 s (STT) + 0.25 s (agent) + 1.2 s (TTS) ≈ **under 2 s**. TTS is the slowest step, so the reply text shows first and the audio follows.
