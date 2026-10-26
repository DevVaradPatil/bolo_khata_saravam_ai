import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, EntryRow, ListSkeleton, Skeleton } from "@/components/ledger-ui";
import { VoicePanel } from "@/components/voice-panel";
import { todayLabel } from "@/lib/format";
import { getShop, getTotals, recentEntries } from "@/lib/ledger";
import { formatPaise } from "@/lib/money";

export default function Home() {
  return (
    <main className="space-y-6">
      <Suspense fallback={<Skeleton className="h-14 w-2/3" />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-52" />}>
        <Summary />
      </Suspense>
      <VoicePanel />
      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>
          <Link href="/customers" className="text-sm font-medium text-muted">
            All customers
          </Link>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <Recent />
        </Suspense>
      </section>
    </main>
  );
}

async function Greeting() {
  await connection();
  const shop = await getShop();
  return (
    <header>
      <p className="text-sm text-muted">{todayLabel()}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
    </header>
  );
}

async function Summary() {
  await connection();
  const shop = await getShop();
  const t = await getTotals(shop.id);
  return (
    <Card className="bg-ink text-paper border-ink">
      <p className="text-sm text-paper/70">Owed to you · कुल बाकी</p>
      <p className="num mt-1 text-5xl font-semibold">{formatPaise(t.owedPaise)}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-paper/10 p-3">
          <p className="text-xs text-paper/70">Udhaar given today</p>
          <p className="num mt-0.5 text-xl font-semibold text-[#f6c87a]">{formatPaise(t.todayCreditPaise)}</p>
        </div>
        <div className="rounded-2xl bg-paper/10 p-3">
          <p className="text-xs text-paper/70">Collected today</p>
          <p className="num mt-0.5 text-xl font-semibold text-[#8fd9ae]">{formatPaise(t.todayPaymentPaise)}</p>
        </div>
      </div>
    </Card>
  );
}

async function Recent() {
  await connection();
  const shop = await getShop();
  const rows = await recentEntries(shop.id);
  if (!rows.length)
    return (
      <p className="py-8 text-center text-muted">
        No entries yet. Tap <span className="font-semibold text-ink">+</span> to add the first one.
      </p>
    );
  return (
    <ul className="divide-y divide-line">
      {rows.map((e) => (
        <EntryRow key={e.id} {...e} />
      ))}
    </ul>
  );
}
