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

export async function reviewCheckIn(formData: FormData) {
  const requestId = Number(formData.get("request_id"));
  const approve = formData.get("approve") === "true";
  const reason = String(formData.get("reason") ?? "");
  if (!Number.isFinite(requestId)) return;

  const supabase = await createClient();
  await supabase.rpc("review_checkin", {
    p_request_id: requestId,
    p_approve: approve,
    p_reason: reason || null,
  });

  revalidatePath("/admin/checkins");
  revalidatePath("/app/points");
}

export type PromotionState = { error: string | null; success: string | null };

export async function proposePromotion(
  _prev: PromotionState,
  formData: FormData,
): Promise<PromotionState> {
  const mallId = Number(formData.get("mall_id"));
  const shopRaw = String(formData.get("shop_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const perk = String(formData.get("perk") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");

  if (!Number.isFinite(mallId) || mallId <= 0) {
    return { error: "Pick a mall.", success: null };
  }
  if (!title) return { error: "Enter a title.", success: null };
  if (!perk) return { error: "Say what the resident gets.", success: null };
  if (!startsAt || !endsAt) {
    return { error: "Pick the start and end dates.", success: null };
  }
  if (endsAt < startsAt) {
    return { error: "The end date is before the start date.", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_promotion", {
    p_mall_id: mallId,
    // Empty means the whole mall, so every shop in it is asked.
    p_shop_id: shopRaw ? Number(shopRaw) : null,
    p_title: title,
    p_perk: perk,
    p_description: description || null,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_points_cost: null,
  });

  if (error) return { error: error.message, success: null };

  revalidatePath("/admin/promotions");
  revalidatePath("/shop/promotions");
  return {
    error: null,
    success: `Sent "${title}" to the shop. It stays off until they accept.`,
  };
}

export type EditActivityState = { error: string | null; success: string | null };

export async function updateActivity(
  _prev: EditActivityState,
  formData: FormData,
): Promise<EditActivityState> {
  const id = Number(formData.get("activity_id"));
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const points = Number(formData.get("points"));
  const location = String(formData.get("location") ?? "").trim();
  const code = String(formData.get("checkin_code") ?? "").trim();

  if (!Number.isFinite(id)) return { error: "Unknown activity.", success: null };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_activity", {
    p_activity_id: id,
    p_title: title,
    p_kind: kind,
    p_points: points,
    p_location: location || null,
    p_checkin_code: code || null,
  });

  if (error) return { error: error.message, success: null };

  revalidatePath("/admin/activities");
  revalidatePath("/app/points");
  return { error: null, success: "Saved." };
}

export async function deleteActivity(formData: FormData) {
  const id = Number(formData.get("activity_id"));
  if (!Number.isFinite(id)) return;

  const supabase = await createClient();
  // Refuses if anyone already earned points for it.
  await supabase.rpc("delete_activity", { p_activity_id: id });

  revalidatePath("/admin/activities");
  revalidatePath("/app/points");
}

export type FeedbackReplyState = { error: string | null; success: string | null };

export async function replyToFeedback(
  _prev: FeedbackReplyState,
  formData: FormData,
): Promise<FeedbackReplyState> {
  const id = Number(formData.get("feedback_id"));
  const note = String(formData.get("note") ?? "").trim();
  const routedTo = String(formData.get("routed_to") ?? "none");
  const status = String(formData.get("status") ?? "reviewed");

  if (!Number.isFinite(id)) return { error: "Unknown feedback.", success: null };
  if (!note) return { error: "Write a reply first.", success: null };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_feedback", {
    p_feedback_id: id,
    p_note: note,
    p_routed_to: routedTo,
    p_status: status,
  });

  if (error) return { error: error.message, success: null };

  revalidatePath("/admin/feedback");
  revalidatePath("/app/feedback");
  return {
    error: null,
    success:
      routedTo === "none"
        ? "Replied. The resident can see it on their feedback screen."
        : `Replied and passed to the ${routedTo}.`,
  };
}
