import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { getProfile, homeFor } from "@/lib/supabase/server";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile));

  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-16 pt-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-semibold text-brand-800"
      >
        <Leaf className="h-5 w-5" aria-hidden />
        Township Green Loop
      </Link>

      <h1 className="mt-10 text-2xl font-bold text-slate-900">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Join your township&apos;s green loop. It takes a minute.
      </p>

      <SignUpForm />

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Sign in
        </Link>
      </p>
    </main>
  );
}
