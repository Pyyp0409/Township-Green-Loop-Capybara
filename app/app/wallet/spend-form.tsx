"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { CodeQR } from "@/components/qr";
import { rm } from "@/lib/format";
import { spendAtMall, type SpendState } from "./actions";

const initialState: SpendState = { error: null, credit: null };

export function SpendForm({
  malls,
  balance,
}: {
  malls: { id: number; name: string }[];
  balance: number;
}) {
  const [state, formAction, pending] = useActionState(spendAtMall, initialState);
  const [amount, setAmount] = useState("50");
  const [mallId, setMallId] = useState(String(malls[0]?.id ?? ""));

  const parsed = Number(amount);
  const value = Number.isFinite(parsed) ? parsed * 1.1 : 0;
  const mallName = malls.find((m) => String(m.id) === mallId)?.name ?? "";

  if (state.credit) {
    return (
      <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">
          Mall credit worth{" "}
          <span className="font-semibold text-brand-800">
            {rm(state.credit.value)}
          </span>{" "}
          at {state.credit.mall}
        </p>
        <div className="mt-3">
          <CodeQR
            code={state.credit.code}
            label="Show this to the cashier at any participating shop"
          />
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="mall_name" value={mallName} />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Mall</span>
        <select
          name="mall_id"
          value={mallId}
          onChange={(e) => setMallId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600"
        >
          {malls.map((mall) => (
            <option key={mall.id} value={mall.id}>
              {mall.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
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

      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
        Worth <span className="font-semibold">{rm(value)}</span> at the mall — a
        10% bonus paid by participating shops.
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
        disabled={pending || malls.length === 0}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Create mall credit
      </button>
    </form>
  );
}
