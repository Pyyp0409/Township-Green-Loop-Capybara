import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { HOME_FOR_ROLE, type Profile } from "@/lib/types";

/** Server client for server components, server actions and route handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component, where cookies are read-only.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** The signed-in user's profile, or null when not signed in. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, township, membership, home_city")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Where this user belongs after signing in. */
export function homeFor(profile: Profile | null): string {
  return profile ? HOME_FOR_ROLE[profile.role] : "/login";
}
