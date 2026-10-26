import { fileURLToPath } from "node:url";
import { SarvamAIClient } from "sarvamai";

process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
if (!process.env.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY missing in .env");

export const sarvam = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
export const out = (name) => fileURLToPath(new URL(`./out/${name}`, import.meta.url));

export async function timed(fn) {
  const t = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - t) };
}
