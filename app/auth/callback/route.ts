import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Where the email confirmation link comes back to. Supabase sends a one-time
 * code that has to be exchanged for a session before the person is signed in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const supabaseError = searchParams.get("error_description");

  if (supabaseError) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(supabaseError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(
        "That confirmation link is incomplete. Try signing in instead.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(
        "That link has expired or was already used. Please sign in.",
      )}`,
    );
  }

  // Signed in now, so send them into the app.
  return NextResponse.redirect(`${origin}${next}`);
}
