"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { num, rm } from "@/lib/format";
import { PAYOUT_METHODS, POINTS_PER_RM } from "@/lib/payments";
import {
  convertToPoints,
  savePayoutPreference,
  type ConvertState,
  type PayoutPrefState,
} from "./actions";

const convertInitial: ConvertState = { error: null, points: null };
const prefInitial: PayoutPrefState = { error: null, saved: false };

/** Turn wallet ringgit into points. One way only — points never become money. */
export function ConvertForm({ balance }: { balance: number }) {
  const [state, formAction, pending] = useActionState(convertToPoints, convertInitial);
  const [amount, setAmount] = useState("20");

  const parsed = Number(amount);
  const points = Number.isFinite(parsed) ? Math.floor(parsed * POINTS_PER_RM) : 0;

  if (state.points !== null) {
    return (
      <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="inline-flex items-center gap-2 font-medium text-brand-800">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {num(state.points)} points added
        </p>
        <p className="mt-1 text-sm text-brand-900">
          Spend them on rewards at any participating mall.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Amount from wallet (RM)
        </span>
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          min="1"
          max={balance || undefined}
          step="1"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
        <Sparkles className="h-4 w-4" aria-hidden />
        You get <span className="font-semibold">{num(points)} points</span> —{" "}
        {POINTS_PER_RM} per RM1.
      </p>
      <p className="mt-1.5 text-xs text-slate-500">
        Points cannot be turned back into money, transferred or cashed out.
      </p>

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
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Convert to points
      </button>
    </form>
  );
}

/** Where monthly payouts should land. */
export function PayoutPreferenceForm({
  method,
  accountRef,
}: {
  method: string;
  accountRef: string | null;
}) {
  const [state, formAction, pending] = useActionState(savePayoutPreference, prefInitial);
  const [picked, setPicked] = useState(method);

  const chosen = PAYOUT_METHODS.find((m) => m.value === picked) ?? PAYOUT_METHODS[0];

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          How should payouts reach you?
        </legend>
        <div className="mt-2 space-y-2">
          {PAYOUT_METHODS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-xl border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={picked === option.value}
                onChange={(e) => setPicked(e.target.value)}
                className="mt-1 h-4 w-4 accent-brand-700"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {option.label}
                </span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {chosen.options.length > 0 ? (
        <label className="mt-3 block">
          <span className="text-sm font-medium text-slate-700">Account</span>
          <select
            name="account_ref"
            defaultValue={accountRef ?? chosen.options[0]}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600"
          >
            {chosen.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Your monthly payout will be converted at {POINTS_PER_RM} points per RM1
          instead of being paid in ringgit.
        </p>
      )}

      {state.saved ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Saved.
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
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-brand-800 ring-1 ring-brand-300 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save payout method
      </button>
    </form>
  );
}

export function balanceHint(balance: number) {
  return `${rm(balance)} available`;
}
