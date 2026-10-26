CREATE TYPE "public"."entry_source" AS ENUM('manual', 'voice', 'scan');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('credit', 'payment');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('hi-IN', 'mr-IN', 'en-IN');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_alt" text,
	"phone" text,
	"language" "language" DEFAULT 'hi-IN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "entry_type" NOT NULL,
	"amount_paise" integer NOT NULL,
	"note" text,
	"source" "entry_source" DEFAULT 'manual' NOT NULL,
	"transcript" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	CONSTRAINT "amount_positive" CHECK ("entries"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"language" "language" DEFAULT 'hi-IN' NOT NULL,
	"pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_shop_id_index" ON "customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "entries_customer_id_index" ON "entries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "entries_shop_id_created_at_index" ON "entries" USING btree ("shop_id","created_at");