import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Leaf } from "lucide-react";
import { getProfile, homeFor } from "@/lib/supabase/server";
import { RoleIcon, roleLabel } from "@/components/role-icon";
import { SignOutButton } from "@/app/sign-out-button";
import { SproutBubble } from "@/components/sprout-bubble";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fcommunity");

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-20 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800"
        >
          <Leaf className="h-4 w-4" aria-hidden />
          Township Green Loop
        </Link>
        <SignOutButton />
      </header>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <RoleIcon role={profile.role} membership={profile.membership} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {profile.full_name ?? "Member"}
          </p>
          <p className="text-xs text-slate-500">
            {roleLabel(profile.role, profile.membership)}
            {profile.membership === "supporter" && profile.home_city
              ? ` · ${profile.home_city}`
              : ""}
          </p>
        </div>
        <Link
          href={homeFor(profile)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          My app
        </Link>
      </div>

      {children}
      {profile.role === "resident" ? <SproutBubble /> : null}
    </div>
  );
}
