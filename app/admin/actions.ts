"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PayoutState = { error: string | null; paid: number | null };

export async function runDemoPayout(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  const month = String(formData.get("month") ?? ""); // "2026-10"
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Pick a month.", paid: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_demo_payouts", {
    p_paid_at: `${month}-01`,
  });

  if (error) return { error: error.message, paid: null };

  revalidatePath("/admin");
  return { error: null, paid: Number(data) };
}

export type ActivityState = { error: string | null; success: string | null };

export async function saveActivity(
  _prev: ActivityState,
  formData: FormData,
): Promise<ActivityState> {
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const points = Number(formData.get("points"));
  const location = String(formData.get("location") ?? "").trim();
  const code = String(formData.get("checkin_code") ?? "").trim().toUpperCase();

  if (!title) return { error: "Enter a title.", success: null };
  if (!["recycling", "event", "energy_saving"].includes(kind)) {
    return { error: "Pick a kind.", success: null };
  }
  if (!Number.isFinite(points) || points <= 0) {
    return { error: "Points must be more than 0.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    title,
    kind,
    points,
    location: location || null,
    checkin_code: code || null,
  });

  if (error) return { error: error.message, success: null };

  revalidatePath("/admin/activities");
  revalidatePath("/app/points");
  return { error: null, success: `Added "${title}".` };
}

export type RewardState = { error: string | null; success: string | null };

export async function saveReward(
  _prev: RewardState,
  formData: FormData,
): Promise<RewardState> {
  const mallId = Number(formData.get("mall_id"));
  const title = String(formData.get("title") ?? "").trim();
  const cost = Number(formData.get("points_cost"));
  const stock = Number(formData.get("stock"));

  if (!Number.isFinite(mallId) || mallId <= 0) {
    return { error: "Pick a mall.", success: null };
  }
  if (!title) return { error: "Enter a title.", success: null };
  if (!Number.isFinite(cost) || cost <= 0) {
    return { error: "Points cost must be more than 0.", success: null };
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "Stock cannot be negative.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rewards").insert({
    mall_id: mallId,
    title,
    points_cost: cost,
    stock,
    active: true,
  });

  if (error) return { error: error.message, success: null };

  revalidatePath("/admin/rewards");
  revalidatePath("/app/rewards");
  return { error: null, success: `Added "${title}".` };
}

export async function toggleReward(formData: FormData) {
  const id = Number(formData.get("reward_id"));
  const active = formData.get("active") === "true";
  if (!Number.isFinite(id)) return;

  const supabase = await createClient();
  await supabase.from("rewards").update({ active: !active }).eq("id", id);

  revalidatePath("/admin/rewards");
  revalidatePath("/app/rewards");
}
