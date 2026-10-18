"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { proposePromotion, type PromotionState } from "../actions";

const initialState: PromotionState = { error: null, success: null };

export type ShopOption = { id: number; name: string; mall_id: number };

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function PromotionForm({
  malls,
  shops,
}: {
  malls: { id: number; name: string }[];
  shops: ShopOption[];
}) {
  const [state, formAction, pending] = useActionState(proposePromotion, initialState);
  const [mallId, setMallId] = useState(String(malls[0]?.id ?? ""));

  const shopsHere = shops.filter((s) => String(s.mall_id) === mallId);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="grid grid-cols-2 gap-3">
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

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Shop</span>
          <select
            name="shop_id"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600"
          >
            <option value="">Every shop in the mall</option>
            {shopsHere.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          name="title"
          type="text"
          required
          placeholder="Green Hour coffee"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">
          What the resident gets
        </span>
        <input
          name="perk"
          type="text"
          required
          placeholder="RM2 off any coffee"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">
          Details for the shop
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          placeholder="When it runs, who qualifies, anything the shop should know…"
          className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Starts</span>
          <input
            name="starts_at"
            type="date"
            required
            defaultValue={isoDate(3)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Ends</span>
          <input
            name="ends_at"
            type="date"
            required
            defaultValue={isoDate(33)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600"
          />
        </label>
      </div>

      {state.success ? (
        <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
        Send proposal to the shop
      </button>
    </form>
  );
}
