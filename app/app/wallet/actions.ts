"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SpendState = {
  error: string | null;
  credit: { code: string; value: number; mall: string } | null;
};

export async function spendAtMall(
  _prev: SpendState,
  formData: FormData,
): Promise<SpendState> {
  const mallId = Number(formData.get("mall_id"));
  const mallName = String(formData.get("mall_name") ?? "the mall");
  const amount = Number(formData.get("amount"));

  if (!Number.isFinite(mallId) || mallId <= 0) {
    return { error: "Pick a mall.", credit: null };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount more than RM0.", credit: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spend_at_mall", {
    p_mall_id: mallId,
    p_amount: amount,
  });

  // "Not enough in wallet (have RMx, need RMy)" comes from the database.
  if (error) return { error: error.message, credit: null };

  revalidatePath("/app", "layout");
  return {
    error: null,
    credit: {
      code: data.code as string,
      value: Number(data.value),
      mall: mallName,
    },
  };
}

export type ConvertState = { error: string | null; points: number | null };

export async function convertToPoints(
  _prev: ConvertState,
  formData: FormData,
): Promise<ConvertState> {
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount more than RM0.", points: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_wallet_to_points", {
    p_amount: amount,
  });

  // "Not enough in wallet" comes from the database.
  if (error) return { error: error.message, points: null };

  revalidatePath("/app", "layout");
  return { error: null, points: Number(data) };
}

export type PayoutPrefState = { error: string | null; saved: boolean };

export async function savePayoutPreference(
  _prev: PayoutPrefState,
  formData: FormData,
): Promise<PayoutPrefState> {
  const method = String(formData.get("method") ?? "");
  const ref = String(formData.get("account_ref") ?? "").trim();

  if (!["bank_transfer", "ewallet", "points"].includes(method)) {
    return { error: "Pick how you want to be paid.", saved: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payout_preference", {
    p_method: method,
    p_ref: ref || null,
  });

  if (error) return { error: error.message, saved: false };

  revalidatePath("/app/wallet");
  return { error: null, saved: true };
}
