const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const formatPaise = (paise: number) => inr.format(paise / 100);

// "250", "250.5", "1,250" -> paise. Null if not a positive amount under ₹1 crore.
export function parseRupees(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const paise = Math.round(Number(s) * 100);
  return paise > 0 ? paise : null;
}
