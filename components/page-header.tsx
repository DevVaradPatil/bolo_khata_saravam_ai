import Link from "next/link";
import { BackIcon } from "./icons";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-5 flex items-center gap-2">
      {back && (
        <Link href={back} aria-label="Back" className="-ml-2 flex size-10 items-center justify-center rounded-full active:bg-line/60">
          <BackIcon />
        </Link>
      )}
      <h1 className="flex-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}
