"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckInState = { error: string | null; submitted: boolean };

/**
 * A poster code can be photographed and passed around, so it no longer awards
 * points by itself. The resident asks, and an admin confirms attendance.
 */
export async function requestCheckIn(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const activityId = Number(formData.get("activity_id"));
  const code = String(formData.get("code") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(activityId) || activityId <= 0) {
    return { error: "Pick an activity.", submitted: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_checkin", {
    p_activity_id: activityId,
    p_code: code || null,
    p_note: note || null,
  });

  // "already asked" / "already received points" come from the database.
  if (error) return { error: error.message, submitted: false };

  revalidatePath("/app/points");
  return { error: null, submitted: true };
}
