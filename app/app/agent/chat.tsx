"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Send } from "lucide-react";
import { streamAgent } from "@/lib/stream-agent";

type Turn = { role: "user" | "model"; text: string };

const SUGGESTED = [
  "How do I earn more points?",
  "Which pool suits RM1,000 and low risk?",
  "How do I get my next badge?",
  "What happens to my money in the EV pool?",
  "How does the mall credit bonus work?",
];

export function Chat({ firstName }: { firstName: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="mt-5">
      {turns.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <Sprout size={52} />
            <p className="text-sm text-slate-600">
              Hello {firstName}. I am Sprout. Ask me anything about the app —
              investing, points, your bills, rewards or badges. I only ever see
              your own numbers.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => ask(question)}
                className="rounded-full bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-800 ring-1 ring-brand-200"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {turns.map((turn, index) =>
            turn.role === "model" && turn.text === "" ? null : turn.role === "user" ? (
              <div key={index} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-brand-700 px-3.5 py-2.5 text-sm text-white">
                  {turn.text}
                </p>
              </div>
            ) : (
              <div key={index} className="flex items-start gap-2">
                <Sprout size={32} />
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200">
                  {turn.text}
                </p>
              </div>
            ),
          )}

          {pending && !turns[turns.length - 1]?.text ? (
            <div className="flex items-center gap-2">
              <Sprout size={32} />
              <p className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Thinking
              </p>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-20 mt-4 flex gap-2 bg-[var(--page)] py-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Sprout anything"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
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

function Sprout({ size }: { size: number }) {
  return (
    <Image
      src="/agent/agent.jpg"
      alt="Sprout"
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-amber-50"
      priority
    />
  );
}
