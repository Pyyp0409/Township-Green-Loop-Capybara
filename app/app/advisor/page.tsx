import { Chat } from "./chat";

export const metadata = { title: "Advisor" };

export default function AdvisorPage() {
  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Green advisor</h1>
      <p className="mt-1 text-sm text-slate-600">
        Answers use the pool rates from the database and your own numbers — never
        anyone else&apos;s.
      </p>

      <Chat />

      <p className="mt-4 text-xs text-slate-500">
        This is not financial advice. Demo only. Not a deposit; not covered by
        PIDM. Investments are offered through a licensed platform.
      </p>
    </main>
  );
}
