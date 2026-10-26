"use client";

import { voidEntry } from "@/app/actions";

export function VoidButton({ entryId, label }: { entryId: string; label: string }) {
  return (
    <form
      action={voidEntry}
      onSubmit={(e) => {
        if (!confirm(`Cancel this entry (${label})? It stays in history, crossed out.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="entryId" value={entryId} />
      <button aria-label={`Cancel entry ${label}`} className="rounded-full px-2 py-1 text-sm text-muted active:bg-line/60">
        ✕
      </button>
    </form>
  );
}
