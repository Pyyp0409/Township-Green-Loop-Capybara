import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { getProfile } from "@/lib/supabase/server";
import { SignOutButton } from "@/app/sign-out-button";
import { TabBar } from "@/components/tab-bar";
import { Celebration } from "@/components/celebration";
import { SproutBubble } from "@/components/sprout-bubble";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects, but a server-side check keeps this safe
  // if the matcher ever changes.
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fapp");

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-24 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800"
        >
          <Leaf className="h-4 w-4" aria-hidden />
          Township Green Loop
        </Link>
        <SignOutButton />
      </header>
      {children}
      <TabBar />
      <SproutBubble />
      <Celebration />
    </div>
  );
}
