import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const languages = ["hi-IN", "mr-IN", "en-IN"] as const;
export const languageEnum = pgEnum("language", languages);
export const entryTypeEnum = pgEnum("entry_type", ["credit", "payment"]);
export const entrySourceEnum = pgEnum("entry_source", ["manual", "voice", "scan"]);

export const shops = pgTable("shops", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  language: languageEnum().notNull().default("hi-IN"),
  pinHash: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: uuid().notNull().references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    // The same name in the other script (Latin <-> Devanagari), for matching and display.
    nameAlt: text(),
    phone: text(),
    language: languageEnum().notNull().default("hi-IN"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.shopId)],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: uuid().notNull().references(() => shops.id, { onDelete: "cascade" }),
    customerId: uuid().notNull().references(() => customers.id, { onDelete: "cascade" }),
    type: entryTypeEnum().notNull(),
    // Whole paise, never floats.
    amountPaise: integer().notNull(),
    note: text(),
    source: entrySourceEnum().notNull().default("manual"),
    transcript: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Undo marks an entry void instead of deleting it, so history stays complete.
    voidedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index().on(t.customerId),
    index().on(t.shopId, t.createdAt),
    check("amount_positive", sql`${t.amountPaise} > 0`),
  ],
);

export type Language = (typeof languages)[number];
export type EntryType = (typeof entryTypeEnum.enumValues)[number];
