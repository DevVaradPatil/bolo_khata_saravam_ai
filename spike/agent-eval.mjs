// Phase 0: does the model pick the right tool + args on the first turn?
// 15 utterances × 2 models, roster in the system prompt. ≈ ₹1.5.
// Usage: node agent-eval.mjs [model ...]
import { writeFileSync } from "node:fs";
import { sarvam, out, timed } from "./common.mjs";

const roster = [
  ["c1", "Ramesh Kumar", "रमेश कुमार", 1000],
  ["c2", "Ramesh Dairy", "रमेश डेयरी", 400],
  ["c3", "Sunita Patil", "सुनीता पाटिल", 750],
  ["c4", "Ganesh Kale", "गणेश काळे", 220],
  ["c5", "Abdul Bhai", "अब्दुल भाई", 0],
  ["c6", "Priya Sharma", "प्रिया शर्मा", 1500],
];

// Computed in code, not left to the model: which first names map to 2+ customers.
function sharedFirstNames() {
  const groups = Object.groupBy(roster, ([, name]) => name.split(" ")[0]);
  const shared = Object.entries(groups).filter(([, g]) => g.length > 1);
  return shared.length ? shared.map(([first, g]) => `${first} → ${g.map((c) => c[1]).join(" or ")}`).join("; ") : "none";
}

const system = `You are Bolo Khata, the voice assistant of a small Indian shop's credit ledger (khata).
The owner speaks Hindi, Marathi, English or a mix. Turn what they say into tool calls.

Customers (id | name | name in Devanagari | balance owed in ₹):
${roster.map((r) => r.join(" | ")).join("\n")}

Rules:
- "udhaar/उधार/दिया/सामान दिया" = credit (customer owes more). "jama/जमा/दिए/मिले/आ गया/दिले" from a customer = payment.
- Amounts are rupees. Convert spoken numbers: dhai sau = 250, saade teen sau = 350, dedh hazaar = 1500.
- Match names across scripts and spelling variants.
- Shared first names: ${sharedFirstNames()}. If the owner uses one of these without the rest of the name, do NOT call a tool: ask which one, naming the options in full. Every other first name is unique, so just use it.
- If one sentence has several transactions, call propose_entry once for each.
- Off-topic requests: reply briefly that you only handle the khata, with no tool call.
- Reply in the owner's language, in one short sentence.`;

const fn = (name, description, properties = {}, required = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

const tools = [
  fn("propose_entry", "Propose a credit or payment entry. The owner confirms before it is saved.", {
    customer_id: { type: "string" },
    type: { type: "string", enum: ["credit", "payment"] },
    amount: { type: "number", description: "Rupees" },
    note: { type: "string", description: "Items or remark, optional" },
  }, ["customer_id", "type", "amount"]),
  fn("propose_customer", "Propose adding a new customer.", {
    name: { type: "string", description: "Name in Latin script" },
    phone: { type: "string", description: "10 digits, optional" },
  }, ["name"]),
  fn("propose_undo", "Propose cancelling the most recent entry."),
  fn("get_balance", "Get a customer's balance and recent entries.", { customer_id: { type: "string" } }, ["customer_id"]),
  fn("list_dues", "List customers who owe the most."),
  fn("get_summary", "Totals of credit given and payments received.", {
    period: { type: "string", enum: ["today", "week", "month"] },
  }, ["period"]),
];

// expected: list of [tool, {args subset}]; [] = should answer in text with no tool call
const cases = [
  ["रमेश डेयरी वाले को 350 का उधार लिखो दूध और पनीर।", [["propose_entry", { customer_id: "c2", type: "credit", amount: 350 }]]],
  ["Sunita Patil ने आज ₹500 जमा किए cash में।", [["propose_entry", { customer_id: "c3", type: "payment", amount: 500 }]]],
  ["गणेश काळे यांना दोनशे वीस रुपयांचे उधार लिहा साखर आणि चहा powder", [["propose_entry", { customer_id: "c4", type: "credit", amount: 220 }]]],
  ["रमेश को 200 का उधार लिखो", []],
  ["प्रिया जी का कितना बाकी है?", [["get_balance", { customer_id: "c6" }]]],
  ["Abdul bhai ne dhai sau diye", [["propose_entry", { customer_id: "c5", type: "payment", amount: 250 }]]],
  ["नया ग्राहक जोड़ो, महेश जाधव, नंबर 98220 12345", [["propose_customer", { phone: "9822012345" }]]],
  ["अभी वाली एंट्री गलत है, कैंसल करो", [["propose_undo", {}]]],
  ["आज कितना उधार गया और कितना वसूल हुआ?", [["get_summary", { period: "today" }]]],
  ["सबसे ज्यादा पैसे किसके बाकी हैं?", [["list_dues", {}]]],
  ["Ramesh Kumar ko saade teen sau ka saamaan diya, paise baad mein", [["propose_entry", { customer_id: "c1", type: "credit", amount: 350 }]]],
  ["सुनीता ताईंनी हजार रुपये दिले", [["propose_entry", { customer_id: "c3", type: "payment", amount: 1000 }]]],
  ["Priya Sharma ka 1500 mein se 1000 aa gaya", [["propose_entry", { customer_id: "c6", type: "payment", amount: 1000 }]]],
  ["गणेश को डेढ़ हज़ार का उधार, और सुनीता से 300 मिले", [
    ["propose_entry", { customer_id: "c4", type: "credit", amount: 1500 }],
    ["propose_entry", { customer_id: "c3", type: "payment", amount: 300 }],
  ]],
  ["आज मौसम कैसा है?", []],
];

const matches = (call, [name, subset]) =>
  call.name === name && Object.entries(subset).every(([k, v]) => call.args[k] === v);

function score(calls, expected) {
  if (calls.length !== expected.length) return false;
  const left = [...calls];
  return expected.every((exp) => {
    const i = left.findIndex((c) => matches(c, exp));
    return i >= 0 && left.splice(i, 1);
  });
}

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["sarvam-105b", "sarvam-105b-conversations"];
const report = {};

for (const model of models) {
  let pass = 0, totalMs = 0, tokens = 0;
  report[model] = [];
  console.log(`\n=== ${model}`);
  for (const [utterance, expected] of cases) {
    let calls = [], reply = "", ms = 0, err;
    try {
      const r = await timed(() =>
        sarvam.chat.completions({
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: utterance }],
          tools,
          tool_choice: "auto",
        }),
      );
      ms = r.ms;
      const msg = r.result.choices[0].message;
      reply = msg.content ?? "";
      calls = (msg.tool_calls ?? []).map((c) => ({ name: c.function.name, args: JSON.parse(c.function.arguments || "{}") }));
      tokens += r.result.usage?.total_tokens ?? 0;
    } catch (e) {
      err = e.message;
    }
    const ok = !err && score(calls, expected);
    pass += ok;
    totalMs += ms;
    report[model].push({ utterance, ok, ms, calls, reply, err });
    const got = err ? `ERROR ${err}` : calls.length ? calls.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(" + ") : `text: ${reply}`;
    console.log(`${ok ? "PASS" : "FAIL"} ${String(ms).padStart(5)} ms  ${utterance}\n      → ${got.slice(0, 220)}`);
  }
  console.log(`--- ${model}: ${pass}/${cases.length} pass, avg ${Math.round(totalMs / cases.length)} ms, ${tokens} tokens`);
}

writeFileSync(out("agent-eval.json"), JSON.stringify(report, null, 2));
