"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, Wallet, Sparkles, LayoutGrid } from "lucide-react";

const TABS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/invest", label: "Invest", icon: PiggyBank },
  { href: "/app/wallet", label: "Wallet", icon: Wallet },
  { href: "/app/points", label: "Points", icon: Sparkles },
  { href: "/app/more", label: "More", icon: LayoutGrid },
];

// Screens reached from "More" keep that tab highlighted.
const MORE_SECTIONS = [
  "/app/more",
  "/app/portfolio",
  "/app/bills",
  "/app/rewards",
  "/app/advisor",
  "/app/profile",
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-screen-sm">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/app"
              ? pathname === "/app"
              : href === "/app/more"
                ? MORE_SECTIONS.some((s) => pathname.startsWith(s))
                : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
