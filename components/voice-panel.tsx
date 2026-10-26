"use client";

import { useRef, useState, useTransition } from "react";
import { confirmProposals } from "@/app/actions";
import type { Proposal } from "@/lib/agent";
import { formatPaise } from "@/lib/money";

type Turn = { transcript: string; reply: string; proposals: Proposal[]; audio: string | null; error?: string };

export function VoicePanel() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function send(body: FormData) {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/voice", { method: "POST", body });
      const data = await res.json();
      setTurn(data.error ? { transcript: "", reply: "", proposals: [], audio: null, error: data.error } : data);
      if (data.audio) new Audio(`data:audio/mpeg;base64,${data.audio}`).play().catch(() => {});
    } catch {
      setTurn({ transcript: "", reply: "", proposals: [], audio: null, error: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (recording) return rec.current?.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        clearTimeout(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: r.mimeType });
        const body = new FormData();
        body.append("audio", new File([blob], "clip.webm", { type: r.mimeType }));
        send(body);
      };
      r.start();
      rec.current = r;
      setRecording(true);
      // Sarvam's sync STT takes up to 30 s.
      timer.current = setTimeout(() => r.state === "recording" && r.stop(), 25_000);
    } catch {
      setTurn({ transcript: "", reply: "", proposals: [], audio: null, error: "Microphone blocked. Allow it, or type below." });
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-5 text-center">
      <button
        onClick={toggleMic}
        disabled={busy}
        aria-label={recording ? "Stop recording" : "Start speaking"}
        className={`mx-auto flex size-24 items-center justify-center rounded-full text-paper shadow-lg transition active:scale-95 disabled:opacity-50 ${recording ? "animate-pulse bg-danger" : "bg-ink"}`}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {recording ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /> : <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>}
        </svg>
      </button>
      <p className="mt-3 text-sm text-muted">
        {busy ? "Sun raha hoon…" : recording ? "Bol rahe hain… tap to stop" : "Tap and speak · “Ramesh Dairy ko 350 udhaar”"}
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = new FormData(e.currentTarget);
          if (String(body.get("text")).trim()) send(body);
        }}
      >
        <input name="text" placeholder="…or type it" className="w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-ink" />
        <button disabled={busy} className="rounded-2xl bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50">Go</button>
      </form>

      {turn && (
        <div className="mt-4 space-y-3 text-left">
          {turn.error && <p className="text-sm font-medium text-danger">{turn.error}</p>}
          {turn.transcript && <p className="text-sm text-muted">“{turn.transcript}”</p>}
          {turn.reply && <p className="font-medium">{turn.reply}</p>}
          {turn.proposals.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-3 ${p.kind === "entry" ? (p.type === "credit" ? "border-credit bg-credit-soft" : "border-payment bg-payment-soft") : "border-line bg-paper"}`}>
              {p.kind === "entry" && (
                <p className="flex justify-between font-semibold">
                  <span>{p.customerName} · {p.type === "credit" ? "Udhaar" : "Jama"}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="num">{formatPaise(p.amountPaise)}</span>
                </p>
              )}
              {p.kind === "customer" && <p className="font-semibold">New customer · {p.name}{p.phone ? ` · ${p.phone}` : ""}</p>}
              {p.kind === "undo" && <p className="font-semibold">Cancel the last entry</p>}
            </div>
          ))}
          {turn.proposals.length > 0 && !saved && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTurn(null)} className="rounded-2xl border border-line py-3 font-semibold">Cancel</button>
              <button
                disabled={saving}
                onClick={() => startSaving(async () => { await confirmProposals(turn.proposals, turn.transcript); setSaved(true); })}
                className="rounded-2xl bg-ink py-3 font-semibold text-paper disabled:opacity-60"
              >
                {saving ? "Saving…" : "Haan, save"}
              </button>
            </div>
          )}
          {saved && <p className="text-sm font-semibold text-payment">Saved ✓</p>}
        </div>
      )}
    </section>
  );
}
