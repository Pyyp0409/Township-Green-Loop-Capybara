import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { getProfile, homeFor } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile));

  const { next } = await searchParams;

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
        Use your township account. You will land on the right screen for your role.
      </p>

      <LoginForm next={next ?? ""} />

      <p className="mt-6 text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-700">
          Create an account
        </Link>
      </p>

      <div className="mt-6 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
        <p className="font-medium text-slate-800">Demo accounts</p>
        <ul className="mt-2 space-y-1 text-slate-600">
          <li>
            <code>resident@demo.com</code> — resident
          </li>
          <li>
            <code>shop@demo.com</code> — merchant (Kopi Hijau Café)
          </li>
          <li>
            <code>admin@demo.com</code> — developer admin
          </li>
        </ul>
      </div>
    </main>
  );
}
