"use client";

import { useActionState } from "react";
import { addEntry, type FormState } from "@/app/actions";

type Option = { id: string; name: string; nameAlt: string | null };

const field = "w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-ink";

export function EntryForm({
  customerId,
  customers,
  defaultType = "credit",
}: {
  customerId?: string;
  customers?: Option[];
  defaultType?: "credit" | "payment";
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addEntry, {});
  const v = state.values ?? {};
  const type = v.type ?? defaultType;

  return (
    <form action={action} className="space-y-3">
      {customers ? (
        <>
          <input type="hidden" name="redirect" value="1" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">Customer</span>
            <select key={v.customerId} name="customerId" defaultValue={v.customerId ?? customerId ?? ""} required className={field}>
              <option value="" disabled>
                Choose a customer
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.nameAlt ? ` · ${c.nameAlt}` : ""}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <input type="hidden" name="customerId" value={customerId} />
      )}

      <fieldset className="grid grid-cols-2 gap-2" key={`type-${state.ok}-${type}`}>
        <legend className="sr-only">Entry type</legend>
        <TypeOption value="credit" defaultChecked={type === "credit"} title="Udhaar diya" hint="Gave on credit" />
        <TypeOption value="payment" defaultChecked={type === "payment"} title="Jama mila" hint="Got paid" />
      </fieldset>

      <label className="block">
        <span className="sr-only">Amount in rupees</span>
        <div className="flex items-center rounded-2xl border border-line bg-card px-4 focus-within:border-ink">
          <span className="text-2xl font-semibold text-muted">₹</span>
          <input
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            required
            defaultValue={v.amount}
            className="num w-full bg-transparent px-2 py-3 text-3xl font-semibold outline-none placeholder:text-line"
          />
        </div>
      </label>

      <input name="note" placeholder="What for? (optional)" maxLength={200} defaultValue={v.note} className={field} />

      {state.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm font-medium text-payment">Saved ✓</p>}

      <button
        disabled={pending}
        className="w-full rounded-2xl bg-ink py-4 text-base font-semibold text-paper transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}

function TypeOption({ value, title, hint, defaultChecked }: { value: string; title: string; hint: string; defaultChecked: boolean }) {
  const checked =
    value === "credit"
      ? "has-checked:border-credit has-checked:bg-credit-soft has-checked:text-credit"
      : "has-checked:border-payment has-checked:bg-payment-soft has-checked:text-payment";
  return (
    <label className={`cursor-pointer rounded-2xl border border-line bg-card px-4 py-3 has-focus-visible:ring-2 has-focus-visible:ring-ink ${checked}`}>
      <input type="radio" name="type" value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="block font-semibold">{title}</span>
      <span className="block text-xs opacity-75">{hint}</span>
    </label>
  );
}
