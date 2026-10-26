import "server-only";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { customers, entries, shops } from "@/db/schema";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => uuidRe.test(s);

// ponytail: single demo shop until the PIN login lands in Phase 4; then read the shop from the session.
// cache() = one query per request, however many components ask.
export const getShop = cache(async () => {
  const [shop] = await getDb().select().from(shops).orderBy(shops.createdAt).limit(1);
  if (!shop) throw new Error("No shop yet. Run `npm run db:seed`.");
  return shop;
});

// Credit adds to what the customer owes, payment subtracts. Voided entries never count.
const signed = sql<number>`case when ${entries.type} = 'credit' then ${entries.amountPaise} else -${entries.amountPaise} end`;
const balance = sql<number>`coalesce(sum(${signed}), 0)::int`;

// Midnight in India, as a timestamptz.
const startOfTodayIST = sql`(date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`;

export async function getTotals(shopId: string) {
  const db = getDb();
  const perCustomer = db
    .select({ balance: balance.as("balance") })
    .from(entries)
    .where(and(eq(entries.shopId, shopId), isNull(entries.voidedAt)))
    .groupBy(entries.customerId)
    .as("per_customer");

  const [[owed], [today]] = await Promise.all([
    db.select({ paise: sql<number>`coalesce(sum(${perCustomer.balance}) filter (where ${perCustomer.balance} > 0), 0)::int` }).from(perCustomer),
    db
      .select({
        credit: sql<number>`coalesce(sum(${entries.amountPaise}) filter (where ${entries.type} = 'credit'), 0)::int`,
        payment: sql<number>`coalesce(sum(${entries.amountPaise}) filter (where ${entries.type} = 'payment'), 0)::int`,
      })
      .from(entries)
      .where(and(eq(entries.shopId, shopId), isNull(entries.voidedAt), sql`${entries.createdAt} >= ${startOfTodayIST}`)),
  ]);
  return { owedPaise: owed.paise, todayCreditPaise: today.credit, todayPaymentPaise: today.payment };
}

export async function listCustomers(shopId: string, query = "") {
  const q = query.trim();
  const match = q
    ? or(ilike(customers.name, `%${q}%`), ilike(customers.nameAlt, `%${q}%`), ilike(customers.phone, `%${q}%`))
    : undefined;
  return getDb()
    .select({
      id: customers.id,
      name: customers.name,
      nameAlt: customers.nameAlt,
      phone: customers.phone,
      balancePaise: balance,
      lastActivity: sql<string | null>`max(${entries.createdAt})`,
    })
    .from(customers)
    .leftJoin(entries, and(eq(entries.customerId, customers.id), isNull(entries.voidedAt)))
    .where(and(eq(customers.shopId, shopId), match))
    .groupBy(customers.id)
    .orderBy(desc(balance), customers.name);
}

export async function getCustomer(shopId: string, customerId: string) {
  if (!isUuid(customerId)) return null;
  const db = getDb();
  const [[customer], history] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        nameAlt: customers.nameAlt,
        phone: customers.phone,
        language: customers.language,
        balancePaise: balance,
      })
      .from(customers)
      .leftJoin(entries, and(eq(entries.customerId, customers.id), isNull(entries.voidedAt)))
      .where(and(eq(customers.shopId, shopId), eq(customers.id, customerId)))
      .groupBy(customers.id),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.shopId, shopId), eq(entries.customerId, customerId)))
      .orderBy(desc(entries.createdAt)),
  ]);
  return customer ? { ...customer, history } : null;
}

export async function recentEntries(shopId: string, limit = 8) {
  return getDb()
    .select({
      id: entries.id,
      type: entries.type,
      amountPaise: entries.amountPaise,
      note: entries.note,
      createdAt: entries.createdAt,
      customerId: customers.id,
      customerName: customers.name,
    })
    .from(entries)
    .innerJoin(customers, eq(customers.id, entries.customerId))
    .where(and(eq(entries.shopId, shopId), isNull(entries.voidedAt)))
    .orderBy(desc(entries.createdAt))
    .limit(limit);
}

export async function customerOptions(shopId: string) {
  return getDb()
    .select({ id: customers.id, name: customers.name, nameAlt: customers.nameAlt })
    .from(customers)
    .where(eq(customers.shopId, shopId))
    .orderBy(customers.name);
}
