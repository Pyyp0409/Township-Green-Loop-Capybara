"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckInState = { error: string | null; earned: number | null };

export async function checkIn(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const activityId = Number(formData.get("activity_id"));
  const code = String(formData.get("code") ?? "").trim();

  if (!Number.isFinite(activityId) || activityId <= 0) {
    return { error: "Pick an activity.", earned: null };
  }
  if (!code) {
    return { error: "Enter the code from the poster at the activity.", earned: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", {
    p_activity_id: activityId,
    p_code: code,
  });

  // "Wrong check-in code" / "already checked in" come from the database.
  if (error) return { error: error.message, earned: null };

  revalidatePath("/app", "layout");
  return { error: null, earned: Number(data) };
}
