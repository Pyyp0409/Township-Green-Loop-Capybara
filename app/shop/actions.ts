"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error: string | null; message: string | null };

export async function acceptCode(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter or scan the customer's code.", message: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("merchant_accept_code", {
    p_code: code,
  });

  // "Code not valid at this mall or already used" comes from the database.
  if (error) return { error: error.message, message: null };

  revalidatePath("/shop");
  return { error: null, message: String(data) };
}
