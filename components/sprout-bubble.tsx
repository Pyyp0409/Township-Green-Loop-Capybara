"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Maximize2, Send, X } from "lucide-react";
import { streamAgent } from "@/lib/stream-agent";
import Link from "next/link";

type Turn = { role: "user" | "model"; text: string };

const SUGGESTED = [
  "How do I earn more points?",
  "How do I get my next badge?",
  "Which pool is lowest risk?",
];

/** Sprout follows the user around: a bubble bottom-right that opens a chat. */
export function SproutBubble() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Escape closes the panel, like any other dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    setError(null);
    setInput("");
    const history = turns;
    setTurns([...history, { role: "user", text }]);
    setPending(true);

    // An empty model turn goes in first, then fills as the stream arrives.
    setTurns((current) => [...current, { role: "model", text: "" }]);

    try {
      await streamAgent(text, history, (soFar) => {
        setTurns((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "model", text: soFar };
          return next;
        });
      });
    } catch (e) {
      setTurns((current) => current.slice(0, -1));
      setError(
        e instanceof Error ? e.message : "Could not reach Sprout. Check your connection.",
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Sprout"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 transition-transform active:scale-95"
      >
        <Image
          src="/agent/agent.jpg"
          alt=""
          width={44}
          height={44}
          className="rounded-full"
        />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-brand-500 ring-2 ring-white" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Sprout"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[78dvh] w-full max-w-screen-sm flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:bottom-4 sm:right-4 sm:left-auto sm:mx-0 sm:h-[32rem] sm:w-96 sm:rounded-3xl"
    >
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Image
          src="/agent/agent.jpg"
          alt=""
          width={36}
          height={36}
          className="rounded-full bg-amber-50"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Sprout</p>
          <p className="text-[11px] text-slate-500">Here to help with anything</p>
        </div>
        <Link
          href="/app/agent"
          onClick={() => setOpen(false)}
          aria-label="Open the full chat"
          className="rounded-full p-2 text-slate-400"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-full p-2 text-slate-400"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 ? (
          <>
            <p className="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
              Hello. Ask me anything about investing, points, your bills, rewards
              or badges.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-800 ring-1 ring-brand-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        ) : (
          turns.map((turn, index) =>
            turn.role === "model" && turn.text === "" ? null : (
            <div
              key={index}
              className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  turn.role === "user"
                    ? "bg-brand-700 text-white"
                    : "bg-slate-50 text-slate-800"
                }`}
              >
                {turn.text}
              </p>
            </div>
            ),
          )
        )}

        {pending && !turns[turns.length - 1]?.text ? (
          <p className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Thinking
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Sprout"
          autoFocus
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-700 px-4 text-white disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
