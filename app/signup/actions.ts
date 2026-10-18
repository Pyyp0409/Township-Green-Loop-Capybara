"use server";

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
  const township = String(formData.get("township") ?? "").trim();

  if (!fullName) return { error: "Enter your name.", checkEmail: false };
  if (!email) return { error: "Enter your email.", checkEmail: false };
  if (password.length < 6) {
    return {
      error: "Use a password of at least 6 characters.",
      checkEmail: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // A database trigger creates the profile and gives every new account the
    // resident role; full_name is read from here.
    options: { data: { full_name: fullName } },
  });

  if (error) return { error: error.message, checkEmail: false };

  // Email confirmation is on: there is no session until they click the link.
  if (!data.session) return { error: null, checkEmail: true };

  if (township) {
    await supabase
      .from("profiles")
      .update({ township })
      .eq("id", data.user?.id ?? "");
  }

  revalidatePath("/", "layout");
  redirect("/app");
}
