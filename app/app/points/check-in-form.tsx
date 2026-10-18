"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { checkIn, type CheckInState } from "./actions";

const initialState: CheckInState = { error: null, earned: null };

export function CheckInForm({
  activities,
}: {
  activities: { id: number; title: string; points: number }[];
}) {
  const [state, formAction, pending] = useActionState(checkIn, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Activity</span>
        <select
          name="activity_id"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-brand-600"
        >
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.title} (+{activity.points})
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">Check-in code</span>
        <input
          name="code"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          required
          placeholder="From the QR poster at the activity"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base uppercase tracking-widest outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      {state.earned !== null ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Checked in — you earned {state.earned} points.
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
        disabled={pending || activities.length === 0}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Check in
      </button>
    </form>
  );
}
