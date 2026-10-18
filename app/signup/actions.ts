"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SignUpState = { error: string | null; checkEmail: boolean };

export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const membership =
    String(formData.get("membership") ?? "resident") === "supporter"
      ? "supporter"
      : "resident";
  const township = String(formData.get("township") ?? "").trim();
  const homeCity = String(formData.get("home_city") ?? "").trim();

  if (!fullName) return { error: "Enter your name.", checkEmail: false };
  if (!email) return { error: "Enter your email.", checkEmail: false };
  if (password.length < 6) {
    return {
      error: "Use a password of at least 6 characters.",
      checkEmail: false,
    };
  }

  // Build the return address from the request, so it is right on localhost
  // and on the deployed site without another environment variable.
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // A database trigger creates the profile and gives every new account the
      // resident role; full_name is read from here.
      data: { full_name: fullName },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) return { error: error.message, checkEmail: false };

  // Email confirmation is on: there is no session until they click the link.
  if (!data.session) return { error: null, checkEmail: true };

  // A supporter funds the township from elsewhere, so they have a home city
  // instead of a township.
  await supabase
    .from("profiles")
    .update({
      membership,
      township: membership === "resident" ? township || "City of Elmina" : null,
      home_city: membership === "supporter" ? homeCity || null : null,
    })
    .eq("id", data.user?.id ?? "");

  revalidatePath("/", "layout");
  redirect("/app");
}
