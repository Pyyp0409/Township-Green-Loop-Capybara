"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { saveReward, type RewardState } from "../actions";

const initialState: RewardState = { error: null, success: null };

export function RewardForm({ malls }: { malls: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveReward, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Mall</span>
        <select
          name="mall_id"
          required
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
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          name="title"
          type="text"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Points cost</span>
          <input
            name="points_cost"
            type="number"
            min="1"
            step="10"
            required
            defaultValue={200}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Stock</span>
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={100}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      {state.success ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {state.success}
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
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Add reward
      </button>
    </form>
  );
}
