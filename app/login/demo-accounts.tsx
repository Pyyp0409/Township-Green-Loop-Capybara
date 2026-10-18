"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { RoleIcon } from "@/components/role-icon";

const PASSWORD = "123456";

const ACCOUNTS: {
  email: string;
  name: string;
  role: string;
  membership?: string;
  headline: string;
  sees: string;
  featured?: boolean;
}[] = [
  {
    email: "zara@demo.com",
    name: "Zara Abdullah",
    role: "resident",
    headline: "Start here — the full resident experience",
    sees: "RM3,500 across all three pools, every badge, six months of payouts, bills, rewards and a mall credit QR.",
    featured: true,
  },
  {
    email: "mei@demo.com",
    name: "Mei Ling Tan",
    role: "resident",
    headline: "Just starting out",
    sees: "Her first badge is still unopened, so the celebration fires the moment she signs in.",
  },
  {
    email: "supporter@demo.com",
    name: "Nurul Hidayah",
    role: "resident",
    membership: "supporter",
    headline: "Invests from Penang, does not live here",
    sees: "Same pools and returns, but activity check-ins are closed to her — points come from the wallet instead.",
  },
  {
    email: "shop@demo.com",
    name: "Kopi Hijau Café",
    role: "merchant",
    headline: "A mall shop",
    sees: "Accept a customer code, watch kWh against the baseline, and accept or decline the offers the township proposes.",
  },
  {
    email: "admin@demo.com",
    name: "Township team",
    role: "developer_admin",
    headline: "Runs the township",
    sees: "Approve check-ins, run a demo payout, propose offers, moderate the community, read feedback and download reports.",
  },
];

/** A judge has five minutes. Tell them who to be and what to look at. */
export function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be blocked; the text is on screen either way.
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Demo accounts</h2>
        <button
          type="button"
          onClick={() => copy(PASSWORD)}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          Password: <code className="font-semibold">{PASSWORD}</code>
          {copied === PASSWORD ? (
            <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          )}
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Same password for all of them. Tap one to fill the form.
      </p>

      <ul className="mt-3 space-y-2">
        {ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPick(account.email)}
              className={`flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition-colors ${
                account.featured
                  ? "ring-brand-300 hover:ring-brand-500"
                  : "ring-slate-200 hover:ring-slate-300"
              }`}
            >
              <RoleIcon
                role={account.role}
                membership={account.membership}
                size={36}
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {account.name}
                  </span>
                  {account.featured ? (
                    <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Start here
                    </span>
                  ) : null}
                </span>

                <span className="mt-0.5 block text-xs font-medium text-brand-700">
                  {account.headline}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                  {account.sees}
                </span>
                <code className="mt-1.5 block text-[11px] text-slate-500">
                  {account.email}
                </code>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Demo data only. Every resident, shop and asset in here is fictional and
        no real money moves.
      </p>
    </section>
  );
}
