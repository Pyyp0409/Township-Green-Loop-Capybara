"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InvestState = { error: string | null; success: string | null };

export async function invest(
  _prev: InvestState,
  formData: FormData,
): Promise<InvestState> {
  const poolId = String(formData.get("pool_id") ?? "");
  const assetId = String(formData.get("asset_id") ?? "");
  const amount = Number(formData.get("amount"));
  const acknowledged = formData.get("risk") === "on";
  const payMethod = String(formData.get("pay_method") ?? "");
  const payRef = String(formData.get("pay_ref") ?? "").trim();

  if (!poolId) return { error: "Pick a pool.", success: null };
  if (!assetId) return { error: "Pick an asset to fund.", success: null };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount.", success: null };
  }
  if (!acknowledged) {
    return {
      error: "Please read and tick the risk statement first.",
      success: null,
    };
  }
  if (!["card", "online_banking", "ewallet"].includes(payMethod)) {
    return { error: "Choose how you want to pay.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", success: null };

  // The investments trigger refuses an insert without this row, so it has to
  // land first. The primary key makes a repeat tick harmless.
  const { error: ackError } = await supabase
    .from("risk_acknowledgements")
    .upsert(
      { user_id: user.id, pool_id: poolId, version: "v1" },
      { onConflict: "user_id,pool_id,version", ignoreDuplicates: true },
    );
  if (ackError) return { error: ackError.message, success: null };

  const { error } = await supabase.from("investments").insert({
    user_id: user.id,
    pool_id: poolId,
    asset_id: Number(assetId),
    amount,
    pay_method: payMethod,
    // A label only — never a card number, CVV or bank credential.
    pay_ref: payRef || null,
  });

  // The database trigger writes the min/max and RM50,000 messages; show them as-is.
  if (error) return { error: error.message, success: null };

  revalidatePath("/app", "layout");
  return {
    error: null,
    success: `Invested ${amount.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}. You can see it in your portfolio.`,
  };
}
