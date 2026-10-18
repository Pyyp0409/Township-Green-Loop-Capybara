import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { getProfile, homeFor } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile));

  const { next, message } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-16 pt-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-semibold text-brand-800"
      >
        <Leaf className="h-5 w-5" aria-hidden />
        Township Green Loop
      </Link>

      <h1 className="mt-10 text-2xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        You land on the right screen for your role. Judging this? Pick an account
        below and the form fills itself.
      </p>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200"
        >
          {message}
        </p>
      ) : null}

      <LoginForm next={next ?? ""} />

      <p className="mt-6 text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-700">
          Create an account
        </Link>
      </p>

    </main>
  );
}
