"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { runDemoPayout, type PayoutState } from "./actions";

const initialState: PayoutState = { error: null, paid: null };

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PayoutButton() {
  const [state, formAction, pending] = useActionState(runDemoPayout, initialState);
  const [month, setMonth] = useState(thisMonth);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Payout month</span>
        <input
          name="month"
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Pays one month to every active investment and credits each resident&apos;s
        wallet. Demo data only.
      </p>

      {state.paid !== null ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Paid {state.paid} investment{state.paid === 1 ? "" : "s"}.
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <PlayCircle className="h-4 w-4" aria-hidden />
        )}
        Run demo payout
      </button>
    </form>
  );
}
