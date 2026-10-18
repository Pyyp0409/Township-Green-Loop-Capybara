"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Reply } from "lucide-react";
import { replyToFeedback, type FeedbackReplyState } from "../actions";

const initialState: FeedbackReplyState = { error: null, success: null };

const ROUTES = [
  { value: "none", label: "Keep it with us" },
  { value: "shop", label: "Pass to the mall shop" },
  { value: "developer", label: "Pass to the developer" },
  { value: "platform", label: "Pass to the platform team" },
];

export function ReplyForm({
  feedbackId,
  existingNote,
  routedTo,
}: {
  feedbackId: number;
  existingNote: string | null;
  routedTo: string | null;
}) {
  const [state, formAction, pending] = useActionState(replyToFeedback, initialState);
  const [open, setOpen] = useState(false);

  if (existingNote && !open && !state.success) {
    return (
      <div className="mt-3 rounded-xl bg-brand-50 p-3">
        <p className="text-xs font-medium text-brand-800">Your reply</p>
        <p className="mt-1 text-sm leading-relaxed text-brand-900">{existingNote}</p>
        {routedTo && routedTo !== "none" ? (
          <p className="mt-1 text-xs text-brand-700">Passed to the {routedTo}.</p>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-medium text-brand-700 underline"
        >
          Edit reply
        </button>
      </div>
    );
  }

  if (state.success) {
    return (
      <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {state.success}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-300"
      >
        <Reply className="h-3.5 w-3.5" aria-hidden />
        Reply
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 rounded-xl bg-slate-50 p-3">
      <input type="hidden" name="feedback_id" value={feedbackId} />

      <label className="block">
        <span className="text-xs font-medium text-slate-700">
          Your reply to the resident
        </span>
        <textarea
          name="note"
          rows={3}
          required
          defaultValue={existingNote ?? ""}
          placeholder="Thank them, say what you will do, and by when."
          className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Pass it on to</span>
          <select
            name="routed_to"
            defaultValue={routedTo ?? "none"}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          >
            {ROUTES.map((route) => (
              <option key={route.value} value={route.value}>
                {route.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">Mark as</span>
          <select
            name="status"
            defaultValue="reviewed"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          >
            <option value="reviewed">Read</option>
            <option value="actioned">Acted on</option>
            <option value="new">Still open</option>
          </select>
        </label>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Send reply
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
