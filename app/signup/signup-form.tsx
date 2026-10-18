"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = { error: null, checkEmail: false };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.checkEmail) {
    return (
      <div className="mt-8 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="inline-flex items-center gap-2 font-medium text-brand-800">
          <MailCheck className="h-5 w-5" aria-hidden />
          Check your email
        </p>
        <p className="mt-1 text-sm text-brand-900">
          We sent you a confirmation link. Open it, then come back and sign in.
        </p>
        <a
          href="/login"
          className="mt-3 inline-block rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Full name</span>
        <input
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <span className="mt-1 block text-xs text-slate-500">
          At least 6 characters.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Township</span>
        <input
          name="township"
          type="text"
          defaultValue="City of Elmina"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
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
        Create account
      </button>

      <p className="text-xs leading-relaxed text-slate-500">
        New accounts join as residents. Merchant and admin roles are assigned by
        the township.
      </p>
    </form>
  );
}
