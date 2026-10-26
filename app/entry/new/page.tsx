import { connection } from "next/server";
import { Suspense } from "react";
import { EntryForm } from "@/components/entry-form";
import { Skeleton } from "@/components/ledger-ui";
import { PageHeader } from "@/components/page-header";
import { customerOptions, getShop } from "@/lib/ledger";

export default function NewEntryPage({ searchParams }: PageProps<"/entry/new">) {
  return (
    <main>
      <PageHeader title="New entry" back="/" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/entry/new">, "searchParams">) {
  await connection();
  const [{ customer, type }, shop] = await Promise.all([searchParams, getShop()]);
  const customers = await customerOptions(shop.id);
  return (
    <EntryForm
      customers={customers}
      customerId={typeof customer === "string" ? customer : undefined}
      defaultType={type === "payment" ? "payment" : "credit"}
    />
  );
}
