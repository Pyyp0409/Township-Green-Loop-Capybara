"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "./areas";

export type FeedbackState = { error: string | null; sent: boolean };

export async function sendFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const area = String(formData.get("area") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!AREAS.some((a) => a.value === area)) {
    return { error: "Pick what your feedback is about.", sent: false };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Give it a rating from 1 to 5.", sent: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", sent: false };

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    area,
    rating,
    comment: comment || null,
  });

  if (error) return { error: error.message, sent: false };

  revalidatePath("/app/feedback");
  revalidatePath("/admin/feedback");
  return { error: null, sent: true };
}
