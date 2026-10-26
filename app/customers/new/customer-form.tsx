"use client";

import { useActionState } from "react";
import { addCustomer, type FormState } from "@/app/actions";

const field = "w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-ink";
const label = "mb-1.5 block text-sm font-medium text-muted";

export function CustomerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addCustomer, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={label}>Name</span>
        <input name="name" required minLength={2} maxLength={60} autoComplete="off" defaultValue={v.name} placeholder="Ramesh Kumar" className={field} />
      </label>
      <label className="block">
        <span className={label}>Phone (for WhatsApp reminders)</span>
        <input name="phone" type="tel" inputMode="numeric" autoComplete="off" defaultValue={v.phone} placeholder="98220 12345" className={field} />
      </label>
      <label className="block">
        <span className={label}>Language they prefer</span>
        {/* key: a select only reads defaultValue on mount, and React resets the form after each action */}
        <select key={v.language} name="language" defaultValue={v.language ?? "hi-IN"} className={field}>
          <option value="hi-IN">हिन्दी · Hindi</option>
          <option value="mr-IN">मराठी · Marathi</option>
          <option value="en-IN">English</option>
        </select>
      </label>
      {state.error && <p role="alert" className="text-sm font-medium text-danger">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-ink py-4 font-semibold text-paper disabled:opacity-60">
        {pending ? "Adding…" : "Add customer"}
      </button>
    </form>
  );
}
