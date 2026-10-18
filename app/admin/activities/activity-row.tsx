"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Pencil, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import { deleteActivity, updateActivity, type EditActivityState } from "../actions";

const initialState: EditActivityState = { error: null, success: null };

export type ActivityRow = {
  id: number;
  title: string;
  kind: string;
  points: number;
  location: string | null;
  starts_at: string | null;
  checkin_code: string | null;
};

export function ActivityCard({ activity }: { activity: ActivityRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateActivity, initialState);

  if (!editing) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-slate-900">
            {activity.title}
          </span>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            +{activity.points}
          </span>
        </div>

        <p className="mt-1 text-xs capitalize text-slate-500">
          {activity.kind.replace("_", " ")}
        </p>

        {activity.location ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {activity.location}
          </p>
        ) : null}

        {activity.starts_at ? (
          <p className="mt-1 text-xs text-slate-400">
            {dayLabel(activity.starts_at)}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-slate-500">
          Check-in code:{" "}
          {activity.checkin_code ? (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold tracking-widest text-slate-800">
              {activity.checkin_code}
            </code>
          ) : (
            <span className="text-slate-400">none — awarded automatically</span>
          )}
        </p>

        {state.success ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {state.success}
          </p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>

          <form action={deleteActivity}>
            <input type="hidden" name="activity_id" value={activity.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </form>
        </div>
      </Card>
    );
  }

  return (
    <Card className="ring-brand-300">
      <form
        action={async (formData) => {
          await formAction(formData);
          setEditing(false);
        }}
      >
        <input type="hidden" name="activity_id" value={activity.id} />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">Edit activity</span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel"
            className="rounded-full p-1.5 text-slate-400"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-medium text-slate-700">Title</span>
          <input
            name="title"
            type="text"
            required
            defaultValue={activity.title}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          />
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Kind</span>
            <select
              name="kind"
              defaultValue={activity.kind}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
            >
              <option value="event">Event</option>
              <option value="recycling">Recycling</option>
              <option value="energy_saving">Energy saving</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Points</span>
            <input
              name="points"
              type="number"
              min="1"
              required
              defaultValue={activity.points}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
            />
          </label>
        </div>

        <label className="mt-2 block">
          <span className="text-xs font-medium text-slate-700">Location</span>
          <input
            name="location"
            type="text"
            defaultValue={activity.location ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          />
        </label>

        <label className="mt-2 block">
          <span className="text-xs font-medium text-slate-700">Check-in code</span>
          <input
            name="checkin_code"
            type="text"
            autoCapitalize="characters"
            defaultValue={activity.checkin_code ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase tracking-widest outline-none focus:border-brand-600"
          />
        </label>

        {state.error ? (
          <p
            role="alert"
            className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"
          >
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Save changes
        </button>
      </form>
    </Card>
  );
}
