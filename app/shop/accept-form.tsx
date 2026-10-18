"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptCode, type AcceptState } from "./actions";

const initialState: AcceptState = { error: null, message: null };

export function AcceptForm() {
  const [state, formAction, pending] = useActionState(acceptCode, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Customer code</span>
        <input
          name="code"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          required
          placeholder="8 characters from their QR"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-lg uppercase tracking-widest outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Works for both reward codes and mall credits.
        </span>
      </label>

      {state.message ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {state.message}
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
        Accept code
      </button>
    </form>
  );
}
