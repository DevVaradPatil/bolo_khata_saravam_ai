"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import type { Proposal } from "@/lib/agent";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { customers, entries, languages, type Language } from "@/db/schema";
import { getShop, isUuid } from "@/lib/ledger";
import { parseRupees } from "@/lib/money";

// `values` echoes the submitted fields on error: React resets the form after every action.
export type FormState = { error?: string; ok?: number; values?: Record<string, string> };

const fail = (error: string, form: FormData): FormState => ({
  error,
  values: Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])),
});

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function addCustomer(_: FormState, form: FormData): Promise<FormState> {
  const shop = await getShop();
  const name = text(form, "name");
  const phone = text(form, "phone").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const language = text(form, "language") as Language;

  if (name.length < 2 || name.length > 60) return fail("Name should be 2–60 characters.", form);
  if (phone && phone.length !== 10) return fail("Phone number should be 10 digits.", form);
  if (!languages.includes(language)) return fail("Pick a language.", form);

  const [row] = await getDb()
    .insert(customers)
    .values({ shopId: shop.id, name, phone: phone || null, language })
    .returning({ id: customers.id });
  redirect(`/customers/${row.id}`);
}

export async function addEntry(_: FormState, form: FormData): Promise<FormState> {
  const shop = await getShop();
  const customerId = text(form, "customerId");
  const type = text(form, "type");
  const amountPaise = parseRupees(text(form, "amount"));
  const note = text(form, "note").slice(0, 200) || null;

  if (!isUuid(customerId)) return fail("Pick a customer.", form);
  if (type !== "credit" && type !== "payment") return fail("Pick udhaar or jama.", form);
  if (!amountPaise) return fail("Enter an amount, like 250 or 99.50.", form);

  const db = getDb();
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.shopId, shop.id)));
  if (!customer) return fail("That customer isn't in this khata.", form);

  await db.insert(entries).values({ shopId: shop.id, customerId, type, amountPaise, note });
  if (form.get("redirect")) redirect(`/customers/${customerId}`);
  refresh();
  return { ok: Date.now() };
}

// Saves what the voice agent proposed, after the owner taps Confirm. Re-validates everything: the client is untrusted.
export async function confirmProposals(proposals: Proposal[], transcript: string) {
  const shop = await getShop();
  const db = getDb();
  for (const p of proposals.slice(0, 5)) {
    if (p.kind === "entry") {
      if (!isUuid(p.customerId) || !(p.type === "credit" || p.type === "payment")) continue;
      if (!Number.isInteger(p.amountPaise) || p.amountPaise <= 0 || p.amountPaise > 1e9) continue;
      const [c] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, p.customerId), eq(customers.shopId, shop.id)));
      if (!c) continue;
      await db.insert(entries).values({
        shopId: shop.id, customerId: c.id, type: p.type, amountPaise: p.amountPaise,
        note: p.note?.slice(0, 200) || null, source: "voice", transcript: transcript.slice(0, 500),
      });
    } else if (p.kind === "customer") {
      const name = String(p.name).trim().slice(0, 60);
      if (name.length >= 2) await db.insert(customers).values({ shopId: shop.id, name, phone: p.phone && /^\d{10}$/.test(p.phone) ? p.phone : null });
    } else if (p.kind === "undo") {
      const [last] = await db.select({ id: entries.id }).from(entries)
        .where(and(eq(entries.shopId, shop.id), isNull(entries.voidedAt))).orderBy(desc(entries.createdAt)).limit(1);
      if (last) await db.update(entries).set({ voidedAt: new Date() }).where(eq(entries.id, last.id));
    }
  }
  refresh();
}

export async function voidEntry(form: FormData) {
  const shop = await getShop();
  const id = text(form, "entryId");
  if (!isUuid(id)) return;
  await getDb()
    .update(entries)
    .set({ voidedAt: new Date() })
    .where(and(eq(entries.id, id), eq(entries.shopId, shop.id), isNull(entries.voidedAt)));
  refresh();
}
