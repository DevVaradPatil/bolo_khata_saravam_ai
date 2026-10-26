const tz = "Asia/Kolkata";
const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const time = new Intl.DateTimeFormat("en-IN", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const date = new Intl.DateTimeFormat("en-IN", { timeZone: tz, day: "numeric", month: "short" });

// "Today, 4:30 pm" / "Yesterday, 9:05 am" / "12 Oct"
export function formatWhen(d: Date | string, now = new Date()) {
  const at = new Date(d);
  const key = day.format(at);
  if (key === day.format(now)) return `Today, ${time.format(at)}`;
  if (key === day.format(new Date(now.getTime() - 864e5))) return `Yesterday, ${time.format(at)}`;
  return date.format(at);
}

export const todayLabel = (now = new Date()) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(now);
