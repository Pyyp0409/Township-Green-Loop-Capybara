import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { HOME_FOR_ROLE, type Role } from "@/lib/types";
import { supabaseEnv } from "./env";

const ROLE_HOME_PREFIX: Record<string, Role> = {
  "/app": "resident",
  "/shop": "merchant",
  "/admin": "developer_admin",
};

/** Refresh the auth cookie and keep each role inside its own area. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() (not getSession()) so the token is verified and refreshed here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const area = Object.keys(ROLE_HOME_PREFIX).find(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!area) return response;

  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }

  // RLS is the real guard; this only keeps people from landing on a page
  // that would be empty for them.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as Role | undefined) ?? "resident";
  if (role !== ROLE_HOME_PREFIX[area]) {
    const home = request.nextUrl.clone();
    home.pathname = HOME_FOR_ROLE[role];
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
