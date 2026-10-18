import Link from "next/link";
import { Leaf } from "lucide-react";
import { SignOutButton } from "@/app/sign-out-button";
import type { Profile } from "@/lib/types";

/** Shared frame for the resident, merchant and admin areas. */
export function RoleShell({
  profile,
  area,
  children,
}: {
  profile: Profile;
  area: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-16 pt-6 sm:max-w-3xl">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800"
        >
          <Leaf className="h-4 w-4" aria-hidden />
          {area}
        </Link>
        <SignOutButton />
      </header>
      <p className="mt-4 text-sm text-slate-500">
        Signed in as{" "}
        <span className="font-medium text-slate-800">
          {profile.full_name ?? "resident"}
        </span>
        {profile.township ? ` · ${profile.township}` : ""}
      </p>
      {children}
    </div>
  );
}

/** Placeholder for a screen that arrives in a later build step. */
export function ComingSoon({ items }: { items: string[] }) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Next in this area</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}
