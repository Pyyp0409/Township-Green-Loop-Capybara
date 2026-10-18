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

export async function respondToPromotion(formData: FormData) {
  const promotionId = Number(formData.get("promotion_id"));
  const accept = formData.get("accept") === "true";
  const note = String(formData.get("note") ?? "");
  if (!Number.isFinite(promotionId)) return;

  const supabase = await createClient();
  // The database checks this shop is the one the proposal was sent to.
  await supabase.rpc("respond_to_promotion", {
    p_promotion_id: promotionId,
    p_accept: accept,
    p_note: note || null,
  });

  revalidatePath("/shop/promotions");
  revalidatePath("/shop");
  revalidatePath("/admin/promotions");
}
