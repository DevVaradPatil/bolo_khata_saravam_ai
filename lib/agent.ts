import "server-only";
import { SarvamAIClient } from "sarvamai";
import { getTotals, listCustomers } from "@/lib/ledger";
import { formatPaise } from "@/lib/money";

const sarvam = () => new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY! });

export type Proposal =
  | { kind: "entry"; customerId: string; customerName: string; type: "credit" | "payment"; amountPaise: number; note: string | null }
  | { kind: "customer"; name: string; phone: string | null }
  | { kind: "undo" };

type Lang = "hi-IN" | "mr-IN" | "en-IN";
const voices: Record<Lang, string> = { "hi-IN": "ishita_hi_numbers", "mr-IN": "ishita_mr_conversational", "en-IN": "ishita_enhi_customer" };

export async function transcribe(audio: File) {
  // Browsers send e.g. "audio/webm;codecs=opus"; Sarvam only accepts the bare type.
  const type = audio.type.split(";")[0].trim() || "audio/webm";
  const file = new File([audio], `clip.${type.split("/")[1]}`, { type });
  const r = await sarvam().speechToText.transcribe({ file, model: "saaras:v4", mode: "codemix" });
  return { transcript: r.transcript, language: (r.language_code ?? "hi-IN") as string };
}

export async function speak(text: string, language: string) {
  const lang = (language in voices ? language : "hi-IN") as Lang;
  const r = await sarvam().textToSpeech.convert({
    text: text.slice(0, 500),
    language_code: lang,
    speaker: voices[lang] as never,
    model: "bulbul:v4-flash",
    output_audio_codec: "mp3",
  });
  return r.audios.join("");
}

const fn = (name: string, description: string, properties = {}, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

const tools = [
  fn("propose_entry", "Propose a credit or payment entry. The owner confirms before it is saved.", {
    customer_id: { type: "string" },
    type: { type: "string", enum: ["credit", "payment"] },
    amount: { type: "number", description: "Rupees" },
    note: { type: "string", description: "Items or remark, optional" },
  }, ["customer_id", "type", "amount"]),
  fn("propose_customer", "Propose adding a new customer.", { name: { type: "string" }, phone: { type: "string" } }, ["name"]),
  fn("propose_undo", "Propose cancelling the most recent entry."),
  fn("get_balance", "Get a customer's balance.", { customer_id: { type: "string" } }, ["customer_id"]),
  fn("list_dues", "List customers who owe the most."),
  fn("get_summary", "Today's credit given and payments received."),
];

// Short replies in the owner's language. Hindi doubles as the default.
const t = (lang: string, hi: string, mr: string, en: string) => (lang === "mr-IN" ? mr : lang === "en-IN" ? en : hi);

export async function runAgent(shopId: string, transcript: string, lang: string) {
  const roster = await listCustomers(shopId);
  const byFirst = Object.groupBy(roster, (c) => c.name.split(" ")[0].toLowerCase());
  const shared = Object.values(byFirst).filter((g) => g && g.length > 1).map((g) => g!.map((c) => c.name).join(" or "));

  const system = `You are Bolo Khata, the voice assistant of a small Indian shop's credit ledger (khata).
The owner speaks Hindi, Marathi, English or a mix. Turn what they say into tool calls.

Customers (id | name | other script | balance owed ₹):
${roster.map((c) => `${c.id} | ${c.name} | ${c.nameAlt ?? ""} | ${c.balancePaise / 100}`).join("\n")}

Rules:
- "udhaar/उधार/दिया/सामान दिया" = credit. "jama/जमा/दिए/मिले/आ गया/दिले" from a customer = payment.
- Amounts are rupees. Convert spoken numbers: dhai sau = 250, saade teen sau = 350, dedh hazaar = 1500.
- Match names across scripts and spelling variants.
- Shared first names: ${shared.join("; ") || "none"}. If the owner uses one of these without the rest of the name, do NOT call a tool: ask which one, naming the options in full. Every other first name is unique, so just use it.
- Several transactions in one sentence: call propose_entry once for each.
- Off-topic: reply briefly that you only handle the khata, with no tool call.
- Reply in the owner's language, in one short sentence.`;

  const res = await sarvam().chat.completions({
    model: "sarvam-105b-conversations",
    messages: [{ role: "system", content: system }, { role: "user", content: transcript }],
    tools,
    tool_choice: "auto",
  });
  const msg = res.choices[0].message;
  const calls = (msg.tool_calls ?? []).map((c) => ({ name: c.function.name, args: JSON.parse(c.function.arguments || "{}") }));
  const find = (id: string) => roster.find((c) => c.id === id);

  const proposals: Proposal[] = [];
  const lines: string[] = [];
  for (const { name, args } of calls) {
    if (name === "propose_entry") {
      const c = find(args.customer_id);
      const amountPaise = Math.round(Number(args.amount) * 100);
      if (!c || !(amountPaise > 0) || !["credit", "payment"].includes(args.type)) continue;
      proposals.push({ kind: "entry", customerId: c.id, customerName: c.name, type: args.type, amountPaise, note: args.note || null });
      const amt = formatPaise(amountPaise);
      lines.push(
        args.type === "credit"
          ? t(lang, `${c.name} के खाते में ${amt} उधार लिखूँ?`, `${c.name} यांच्या खात्यात ${amt} उधार लिहू का?`, `Add ${amt} credit for ${c.name}?`)
          : t(lang, `${c.name} से ${amt} जमा लिखूँ?`, `${c.name} यांच्याकडून ${amt} जमा लिहू का?`, `Record ${amt} paid by ${c.name}?`),
      );
    } else if (name === "propose_customer" && args.name) {
      const phone = String(args.phone ?? "").replace(/\D/g, "").slice(-10);
      proposals.push({ kind: "customer", name: String(args.name).slice(0, 60), phone: phone.length === 10 ? phone : null });
      lines.push(t(lang, `नया ग्राहक ${args.name} जोड़ूँ?`, `नवीन ग्राहक ${args.name} जोडू का?`, `Add new customer ${args.name}?`));
    } else if (name === "propose_undo") {
      proposals.push({ kind: "undo" });
      lines.push(t(lang, "आखिरी एंट्री कैंसल करूँ?", "शेवटची एंट्री रद्द करू का?", "Cancel the last entry?"));
    } else if (name === "get_balance") {
      const c = find(args.customer_id);
      if (c) lines.push(t(lang, `${c.name} का बाकी ${formatPaise(c.balancePaise)} है।`, `${c.name} यांची बाकी ${formatPaise(c.balancePaise)} आहे.`, `${c.name} owes ${formatPaise(c.balancePaise)}.`));
    } else if (name === "list_dues") {
      const top = roster.filter((c) => c.balancePaise > 0).slice(0, 3).map((c) => `${c.name} ${formatPaise(c.balancePaise)}`).join(", ");
      lines.push(t(lang, `सबसे ज़्यादा बाकी: ${top}`, `सर्वात जास्त बाकी: ${top}`, `Top dues: ${top}`));
    } else if (name === "get_summary") {
      const s = await getTotals(shopId);
      const [cr, pm] = [formatPaise(s.todayCreditPaise), formatPaise(s.todayPaymentPaise)];
      lines.push(t(lang, `आज ${cr} उधार गया और ${pm} जमा हुए।`, `आज ${cr} उधार गेले आणि ${pm} जमा झाले.`, `Today: ${cr} given on credit, ${pm} collected.`));
    }
  }
  const reply = lines.join(" ") || msg.content?.trim() || t(lang, "माफ़ कीजिए, फिर से बोलिए।", "माफ करा, पुन्हा सांगा.", "Sorry, please say that again.");
  return { reply, proposals };
}
