import { runAgent, speak, transcribe } from "@/lib/agent";
import { getShop } from "@/lib/ledger";

// Voice turn: audio (or typed text) -> Saaras STT -> Sarvam-105B agent -> Bulbul TTS.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const shop = await getShop();
    const audio = form.get("audio");
    let transcript = String(form.get("text") ?? "").trim().slice(0, 500);
    let language = shop.language as string;
    if (audio instanceof File && audio.size > 0) {
      if (audio.size > 2_000_000) return Response.json({ error: "Recording too long" }, { status: 413 });
      ({ transcript, language } = await transcribe(audio));
    }
    if (!transcript) return Response.json({ error: "Didn't catch that. Try again." }, { status: 400 });

    const { reply, proposals } = await runAgent(shop.id, transcript, language);
    const audioB64 = await speak(reply, language).catch(() => null);
    return Response.json({ transcript, language, reply, proposals, audio: audioB64 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Voice service failed. Try again." }, { status: 500 });
  }
}
