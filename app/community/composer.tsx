"use client";

import { useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { RoleIcon } from "@/components/role-icon";
import { createPost, type PostState } from "./actions";

const initialState: PostState = { error: null, ok: false };

const TAGS = [
  { value: "general", label: "General" },
  { value: "question", label: "Question" },
  { value: "guidance", label: "Guidance" },
  { value: "event", label: "Event" },
];

export function Composer({
  role,
  membership,
  canAnnounce,
}: {
  role: string;
  membership?: string | null;
  canAnnounce: boolean;
}) {
  const [state, formAction, pending] = useActionState(createPost, initialState);
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
      <div className="flex items-start gap-3">
        <RoleIcon role={role} membership={membership} size={40} />
        <textarea
          name="body"
          rows={3}
          required
          maxLength={2000}
          placeholder="Share something with the community…"
          className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Tag:</span>
        {TAGS.map((tag, index) => (
          <label key={tag.value} className="cursor-pointer">
            <input
              type="radio"
              name="tag"
              value={tag.value}
              defaultChecked={index === 0}
              className="peer sr-only"
            />
            <span className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 peer-checked:bg-brand-700 peer-checked:text-white peer-checked:ring-brand-700">
              {tag.label}
            </span>
          </label>
        ))}
        {canAnnounce ? (
          <label className="cursor-pointer">
            <input type="radio" name="tag" value="announcement" className="peer sr-only" />
            <span className="rounded-full px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-300 peer-checked:bg-amber-500 peer-checked:text-white peer-checked:ring-amber-500">
              Announcement
            </span>
          </label>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            name="anonymous"
            className="h-4 w-4 accent-brand-700"
          />
          Post anonymously
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Post
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
