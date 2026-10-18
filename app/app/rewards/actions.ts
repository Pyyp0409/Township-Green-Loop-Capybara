"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RedeemState = {
  error: string | null;
  code: string | null;
  title: string | null;
};

export async function redeem(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const rewardId = Number(formData.get("reward_id"));
  const title = String(formData.get("title") ?? "Reward");

  if (!Number.isFinite(rewardId) || rewardId <= 0) {
    return { error: "Pick a reward.", code: null, title: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", {
    p_reward_id: rewardId,
  });

  // "Not enough points (have x, need y)" / "Out of stock" come from the database.
  if (error) return { error: error.message, code: null, title: null };

  revalidatePath("/app", "layout");
  return { error: null, code: data.code as string, title };
}
