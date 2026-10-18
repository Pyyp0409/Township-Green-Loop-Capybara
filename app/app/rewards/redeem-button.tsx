"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { CodeQR } from "@/components/qr";
import { redeem, type RedeemState } from "./actions";

const initialState: RedeemState = { error: null, code: null, title: null };

export function RedeemButton({
  rewardId,
  title,
  disabled,
}: {
  rewardId: number;
  title: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(redeem, initialState);

  if (state.code) {
    return (
      <div className="mt-3 rounded-xl bg-brand-50 p-3">
        <p className="text-center text-xs font-medium text-brand-800">
          Redeemed — show this code
        </p>
        <div className="mt-2">
          <CodeQR code={state.code} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="reward_id" value={rewardId} />
      <input type="hidden" name="title" value={title} />
      {state.error ? (
        <p
          role="alert"
          className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-500"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {disabled ? "Not enough points" : "Redeem"}
      </button>
    </form>
  );
}
