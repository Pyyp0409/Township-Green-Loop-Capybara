import { getProfile } from "@/lib/supabase/server";
import { Chat } from "./chat";

export const metadata = { title: "Sprout" };

export default async function AgentPage() {
  const profile = await getProfile();
  const firstName = (profile?.full_name ?? "neighbour").split(" ")[0];

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Ask Sprout</h1>
      <p className="mt-1 text-sm text-slate-600">
        Your helper for everything in the app. Answers use the township&apos;s own
        figures and your own numbers — never anyone else&apos;s.
      </p>

      <Chat firstName={firstName} />

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Sprout can make mistakes — check anything important against the Invest
        and Points screens.
      </p>
    </main>
  );
}
