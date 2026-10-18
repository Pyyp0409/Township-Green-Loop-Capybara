"use client";

import { useActionState } from "react";
import { Clock, Loader2, ShieldCheck } from "lucide-react";
import { requestCheckIn, type CheckInState } from "./actions";

const initialState: CheckInState = { error: null, submitted: false };

export function CheckInForm({
  activities,
}: {
  activities: { id: number; title: string; points: number }[];
}) {
  const [state, formAction, pending] = useActionState(requestCheckIn, initialState);

  if (state.submitted) {
    return (
      <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="inline-flex items-center gap-2 font-medium text-brand-800">
          <Clock className="h-5 w-5" aria-hidden />
          Sent to the township team
        </p>
        <p className="mt-1 text-sm text-brand-900">
          An admin will check you were there and add the points. You can see the
          status under &ldquo;My check-in requests&rdquo; below.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <p className="mb-3 flex gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <span>
          Points are added after a township admin confirms you took part. This
          keeps it fair — a code alone is not enough, because codes can be shared.
        </span>
      </p>

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
        <span className="text-sm font-medium text-slate-700">
          Code from the poster
        </span>
        <input
          name="code"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Optional, but it helps"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base uppercase tracking-widest outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">
          Anything to add?
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={300}
          placeholder="What you did, who you came with…"
          className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

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
        Ask to check in
      </button>
    </form>
  );
}
