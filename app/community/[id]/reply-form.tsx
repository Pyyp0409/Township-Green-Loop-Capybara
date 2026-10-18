"use client";

import { useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { addComment, type PostState } from "../actions";

const initialState: PostState = { error: null, ok: false };

export function ReplyForm({ postId }: { postId: number }) {
  const [state, formAction, pending] = useActionState(addComment, initialState);
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
      <input type="hidden" name="post_id" value={postId} />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Your reply</span>
        <textarea
          name="body"
          rows={3}
          required
          maxLength={1000}
          className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="anonymous" className="h-4 w-4 accent-brand-700" />
          Reply anonymously
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Reply
        </button>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
