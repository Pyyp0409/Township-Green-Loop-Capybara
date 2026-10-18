"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { sendFeedback, type FeedbackState } from "./actions";
import { AREAS } from "./areas";

const initialState: FeedbackState = { error: null, sent: false };

const RATING_WORD = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

export function FeedbackForm() {
  const [state, formAction, pending] = useActionState(sendFeedback, initialState);
  const [rating, setRating] = useState(0);

  if (state.sent) {
    return (
      <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="inline-flex items-center gap-2 font-medium text-brand-800">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Thank you
        </p>
        <p className="mt-1 text-sm text-brand-900">
          The township team can see this now. It goes straight into their
          dashboard alongside everyone else&apos;s.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          What is this about?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {AREAS.map((area, index) => (
            <label key={area.value} className="cursor-pointer">
              <input
                type="radio"
                name="area"
                value={area.value}
                defaultChecked={index === 0}
                className="peer sr-only"
              />
              <span className="block rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 peer-checked:bg-brand-700 peer-checked:text-white peer-checked:ring-brand-700">
                {area.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">
          How is it working for you?
        </legend>
        <input type="hidden" name="rating" value={rating} />
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} out of 5`}
              aria-pressed={rating === value}
              className="rounded-lg p-1"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300"
                }`}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-1 text-sm text-slate-500">
            {RATING_WORD[rating]}
          </span>
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">
          Anything you would change? (optional)
        </span>
        <textarea
          name="comment"
          rows={4}
          maxLength={1000}
          placeholder="What worked, what confused you, what is missing…"
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
        disabled={pending || rating === 0}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:bg-slate-200 disabled:text-slate-500"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {rating === 0 ? "Pick a rating first" : "Send feedback"}
      </button>
    </form>
  );
}
