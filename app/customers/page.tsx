import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { Avatar, ListSkeleton } from "@/components/ledger-ui";
import { PageHeader } from "@/components/page-header";
import { formatWhen } from "@/lib/format";
import { getShop, listCustomers } from "@/lib/ledger";
import { formatPaise } from "@/lib/money";

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <main>
      <PageHeader
        title="Customers"
        action={
          <Link href="/customers/new" className="flex items-center gap-1 rounded-full bg-ink py-2 pl-3 pr-4 text-sm font-semibold text-paper">
            <PlusIcon width={18} height={18} /> New
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function List({ searchParams }: Pick<PageProps<"/customers">, "searchParams">) {
  await connection();
  const [{ q }, shop] = await Promise.all([searchParams, getShop()]);
  const query = typeof q === "string" ? q : "";
  const rows = await listCustomers(shop.id, query);

  return (
    <>
      <form role="search" className="mb-2 flex items-center gap-2 rounded-2xl border border-line bg-card px-4 focus-within:border-ink">
        <SearchIcon className="shrink-0 text-muted" />
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search name or phone"
          aria-label="Search customers"
          className="w-full bg-transparent py-3 outline-none"
        />
      </form>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted">
          {query ? `No one matches “${query}”.` : "No customers yet. Add your first one."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="flex items-center gap-3 py-3 active:opacity-70">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {c.name}
                    {c.nameAlt && <span className="ml-1.5 font-normal text-muted">{c.nameAlt}</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {c.lastActivity ? `Last entry ${formatWhen(c.lastActivity)}` : "No entries yet"}
                  </p>
                </div>
                <Balance paise={c.balancePaise} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Balance({ paise }: { paise: number }) {
  if (paise === 0) return <span className="text-sm text-muted">Settled</span>;
  return (
    <span className={`num font-semibold ${paise > 0 ? "text-credit" : "text-payment"}`}>
      {formatPaise(Math.abs(paise))}
      {paise < 0 && <span className="block text-right text-xs font-normal">advance</span>}
    </span>
  );
}
