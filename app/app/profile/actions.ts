"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error: string | null; success: string | null };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const township = String(formData.get("township") ?? "").trim();

  if (!fullName) return { error: "Enter your name.", success: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", success: null };

  // Only full_name and township are granted for update — role cannot change.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, township })
    .eq("id", user.id);

  if (error) return { error: error.message, success: null };

  revalidatePath("/app", "layout");
  return { error: null, success: "Saved." };
}
