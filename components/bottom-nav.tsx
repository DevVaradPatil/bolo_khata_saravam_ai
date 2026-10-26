"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { HomeIcon, PlusIcon, UsersIcon } from "./icons";

// The URL is only known at request time, so the active tab streams in; the fallback is the same bar, unhighlighted.
export function BottomNav() {
  return (
    <Suspense fallback={<Bar path={null} />}>
      <ActiveBar />
    </Suspense>
  );
}

function ActiveBar() {
  return <Bar path={usePathname()} />;
}

function Bar({ path }: { path: string | null }) {
  const tab = (href: string, label: string, Icon: typeof HomeIcon) => {
    const active = path !== null && (href === "/" ? path === "/" : path.startsWith(href));
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${active ? "text-ink" : "text-muted"}`}
      >
        <Icon />
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="relative mx-auto flex max-w-md items-end px-6">
        {tab("/", "Home", HomeIcon)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/entry/new"
            aria-label="New entry"
            className="-mt-7 mb-2 flex size-16 items-center justify-center rounded-full bg-ink text-paper shadow-lg shadow-ink/20 transition active:scale-95"
          >
            <PlusIcon width={28} height={28} />
          </Link>
        </div>
        {tab("/customers", "Customers", UsersIcon)}
      </div>
    </nav>
  );
}
