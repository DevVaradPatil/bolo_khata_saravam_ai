import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EntryForm } from "@/components/entry-form";
import { PhoneIcon } from "@/components/icons";
import { Card, ListSkeleton, SignedAmount, Skeleton, typeLabel } from "@/components/ledger-ui";
import { PageHeader } from "@/components/page-header";
import { formatWhen } from "@/lib/format";
import { getCustomer, getShop } from "@/lib/ledger";
import { formatPaise } from "@/lib/money";
import { VoidButton } from "./void-button";

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <main>
      <PageHeader title="Khata" back="/customers" />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <ListSkeleton />
          </div>
        }
      >
        <Customer params={params} />
      </Suspense>
    </main>
  );
}

async function Customer({ params }: Pick<PageProps<"/customers/[id]">, "params">) {
  await connection();
  const [{ id }, shop] = await Promise.all([params, getShop()]);
  const c = await getCustomer(shop.id, id);
  if (!c) notFound();
  const owes = c.balancePaise;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{c.name}</h2>
            {c.nameAlt && <p className="text-muted">{c.nameAlt}</p>}
          </div>
          {c.phone && (
            <a href={`tel:+91${c.phone}`} aria-label={`Call ${c.name}`} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line/60">
              <PhoneIcon width={18} height={18} />
            </a>
          )}
        </div>
        <p className="mt-4 text-sm text-muted">{owes > 0 ? "Owes you" : owes < 0 ? "Paid in advance" : "All settled"}</p>
        <p className={`num text-4xl font-semibold ${owes > 0 ? "text-credit" : owes < 0 ? "text-payment" : ""}`}>
          {formatPaise(Math.abs(owes))}
        </p>
      </Card>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Add entry</h3>
        <EntryForm customerId={c.id} />
      </section>

      <section>
        <h3 className="mb-1 text-lg font-semibold">History</h3>
        {c.history.length === 0 ? (
          <p className="py-6 text-center text-muted">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {c.history.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${e.voidedAt ? "text-muted line-through" : ""}`}>
                    {typeLabel(e.type)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {formatWhen(e.createdAt)}
                    {e.voidedAt && " · Cancelled"}
                  </p>
                </div>
                <SignedAmount type={e.type} paise={e.amountPaise} voided={!!e.voidedAt} />
                {!e.voidedAt && <VoidButton entryId={e.id} label={`${typeLabel(e.type)} ${formatPaise(e.amountPaise)}`} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
