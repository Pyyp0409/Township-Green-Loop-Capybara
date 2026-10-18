"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { invest, type InvestState } from "../actions";
import { rm } from "@/lib/format";
import { POOL_PLAN } from "@/lib/plan";
import { OutcomeTable } from "./outcome-table";

const initialState: InvestState = { error: null, success: null };

export type AssetChoice = {
  id: number;
  name: string;
  remaining: number;
};

export function InvestForm({
  poolId,
  poolName,
  minInvest,
  maxInvest,
  riskText,
  assets,
  alreadyAcknowledged,
}: {
  poolId: string;
  poolName: string;
  minInvest: number;
  maxInvest: number;
  riskText: string | null;
  assets: AssetChoice[];
  alreadyAcknowledged: boolean;
}) {
  const [state, formAction, pending] = useActionState(invest, initialState);
  const [amount, setAmount] = useState<string>(String(minInvest));

  const parsed = Number(amount);
  const plan = POOL_PLAN[poolId];

  if (state.success) {
    return (
      <div className="mt-5 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="inline-flex items-center gap-2 font-medium text-brand-800">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Investment confirmed
        </p>
        <p className="mt-1 text-sm text-brand-900">{state.success}</p>
        <a
          href="/app/portfolio"
          className="mt-3 inline-block rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white"
        >
          View portfolio
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="pool_id" value={poolId} />

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          Which asset do you want to fund?
        </legend>
        <div className="mt-2 space-y-2">
          {assets.map((asset, index) => (
            <label
              key={asset.id}
              className="flex items-start gap-3 rounded-xl border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="asset_id"
                value={asset.id}
                defaultChecked={index === 0}
                className="mt-1 h-4 w-4 accent-brand-700"
                required
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {asset.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {rm(asset.remaining)} still to raise
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Amount (RM)</span>
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          min={minInvest}
          max={maxInvest}
          step="10"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <span className="mt-1 block text-xs text-slate-500">
          {rm(minInvest)} – {rm(maxInvest)} per resident for this pool.
        </span>
      </label>

      {plan ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            What {rm(parsed || 0)} would do
          </p>
          <OutcomeTable amount={parsed} plan={plan} poolId={poolId} />
          <p className="mt-2 text-xs text-slate-500">
            Figures from the Township Green Loop business plan v3. An example,
            not a promise.
          </p>
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-xl border border-slate-300 p-3">
        <input
          type="checkbox"
          name="risk"
          required
          defaultChecked={false}
          className="mt-1 h-4 w-4 accent-brand-700"
        />
        <span className="text-xs leading-relaxed text-slate-600">
          <span className="block text-sm font-medium text-slate-900">
            I have read the risk statement for {poolName}
          </span>
          {riskText}
          {alreadyAcknowledged ? (
            <span className="mt-1 block text-brand-700">
              You accepted this before — please confirm again for this investment.
            </span>
          ) : null}
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Confirm investment
      </button>
    </form>
  );
}
