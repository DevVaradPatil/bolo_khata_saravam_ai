import Link from "next/link";
import type { EntryType } from "@/db/schema";
import { formatWhen } from "@/lib/format";
import { formatPaise } from "@/lib/money";

export function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line/70 text-sm font-semibold text-ink">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function SignedAmount({ type, paise, voided }: { type: EntryType; paise: number; voided?: boolean }) {
  const credit = type === "credit";
  return (
    <span className={`num text-right font-semibold ${voided ? "text-muted line-through" : credit ? "text-credit" : "text-payment"}`}>
      {credit ? "+" : "−"}
      {formatPaise(paise)}
    </span>
  );
}

export const typeLabel = (type: EntryType) => (type === "credit" ? "Udhaar" : "Jama");

export function EntryRow(e: {
  type: EntryType;
  amountPaise: number;
  note: string | null;
  createdAt: Date;
  customerId: string;
  customerName: string;
}) {
  return (
    <li>
      <Link href={`/customers/${e.customerId}`} className="flex items-center gap-3 py-3 active:opacity-70">
        <Avatar name={e.customerName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{e.customerName}</p>
          <p className="truncate text-sm text-muted">
            {typeLabel(e.type)}
            {e.note ? ` · ${e.note}` : ""} · {formatWhen(e.createdAt)}
          </p>
        </div>
        <SignedAmount type={e.type} paise={e.amountPaise} />
      </Link>
    </li>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-card p-5 ${className}`}>{children}</section>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line/60 ${className}`} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 py-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
