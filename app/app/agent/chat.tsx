"use client";

import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

type Turn = { role: "user" | "model"; text: string };

const SUGGESTED = [
  "Which pool suits RM1,000 and low risk?",
  "How do I earn more points?",
  "What happens to my money in the EV pool?",
  "How much could RM500 in solar pay me?",
];

export function Chat() {
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

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setTurns((current) => [...current, { role: "model", text: data.reply }]);
    } catch {
      setError("Could not reach the advisor. Check your connection.");
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
          <p className="text-sm text-slate-600">
            Ask about the three pools, your own investments, your points or your
            electricity bills. I only see your own data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
          {turns.map((turn, index) => (
            <div
              key={index}
              className={
                turn.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  turn.role === "user"
                    ? "bg-brand-700 text-white"
                    : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                }`}
              >
                {turn.text}
              </p>
            </div>
          ))}
          {pending ? (
            <div className="flex justify-start">
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
          placeholder="Ask a question"
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
