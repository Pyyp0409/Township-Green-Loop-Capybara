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
