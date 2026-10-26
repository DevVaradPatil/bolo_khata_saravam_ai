// Phase 0: Bulbul v4 Flash. Part A = voice auditions for the app's replies,
// part B = synthetic "shop owner" clips that stt.mjs transcribes.
// ~700 characters total ≈ ₹0.70.
import { mkdirSync, writeFileSync } from "node:fs";
import { sarvam, out, timed } from "./common.mjs";

mkdirSync(out(""), { recursive: true });

const reply = {
  "hi-IN": "Ramesh ji ke khaate mein ढाई सौ रुपये udhaar likh diya. Ab kul baaki ₹1,250 hai.",
  "mr-IN": "रमेश यांच्या खात्यात अडीचशे रुपये उधार लिहिले. आता एकूण बाकी बाराशे पन्नास रुपये.",
};

const auditions = [
  ["ishita_hi_numbers", "hi-IN"],
  ["ritu_hi_customer_warm", "hi-IN"],
  ["shubh_hi_customer", "hi-IN"],
  ["ishita_enhi_customer", "hi-IN"],
  ["ishita_mr_conversational", "mr-IN"],
  ["nilesh_mr_conversation", "mr-IN"],
];

const ownerClips = [
  ["clip1_hi", "shubh_hi_customer", "hi-IN", "Ramesh Dairy wale ko teen sau pachaas ka udhaar likho, doodh aur paneer."],
  ["clip2_hinglish", "ishita_enhi_customer", "hi-IN", "Sunita Patil ne aaj paanch sau rupaye jama kiye, cash mein."],
  ["clip3_mr", "nilesh_mr_conversation", "mr-IN", "गणेश काळे यांना दोनशे वीस रुपयांचे उधार लिहा, साखर आणि चहा पावडर."],
];

async function speak(file, speaker, language_code, text) {
  const { result, ms } = await timed(() =>
    sarvam.textToSpeech.convert({
      text, speaker, language_code, model: "bulbul:v4-flash", output_audio_codec: "mp3",
    }),
  );
  writeFileSync(out(`${file}.mp3`), Buffer.from(result.audios.join(""), "base64"));
  console.log(`${file.padEnd(28)} ${speaker.padEnd(26)} ${String(ms).padStart(5)} ms  ${text.length} chars`);
}

for (const [speaker, lang] of auditions) await speak(`voice_${speaker}`, speaker, lang, reply[lang]);
for (const args of ownerClips) await speak(...args);
