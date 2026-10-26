// Phase 0: Saaras v4 on the owner clips, without vs with keyterms (the shop roster).
// 6 calls, ~35 s of audio ≈ ₹0.30.
import { createReadStream } from "node:fs";
import { sarvam, out, timed } from "./common.mjs";

const keyterms = ["Ramesh Dairy", "Ramesh Kumar", "Sunita Patil", "Ganesh Kale", "paneer", "chaha powder"];
const clips = ["clip1_hi", "clip2_hinglish", "clip3_mr"];

for (const clip of clips) {
  for (const terms of [undefined, keyterms]) {
    const { result, ms } = await timed(() =>
      sarvam.speechToText.transcribe({
        file: createReadStream(out(`${clip}.mp3`)),
        model: "saaras:v4",
        mode: "codemix",
        ...(terms && { keyterms: terms }),
      }),
    );
    console.log(`${clip.padEnd(15)} ${terms ? "keyterms" : "plain   "} ${String(ms).padStart(5)} ms  [${result.language_code}]  ${result.transcript}`);
  }
}
