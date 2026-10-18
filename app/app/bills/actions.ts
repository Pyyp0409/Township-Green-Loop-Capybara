"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BillState = {
  error: string | null;
  success: string | null;
  pointsEarned: number | null;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function addBill(
  _prev: BillState,
  formData: FormData,
): Promise<BillState> {
  const month = String(formData.get("bill_month") ?? ""); // "2026-09" from <input type="month">
  const kwh = Number(formData.get("kwh"));
  const amount = Number(formData.get("amount_rm"));
  const file = formData.get("file");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Pick the bill month.", success: null, pointsEarned: null };
  }
  if (!Number.isFinite(kwh) || kwh < 0) {
    return { error: "Enter the kWh used.", success: null, pointsEarned: null };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Enter the bill amount in RM.", success: null, pointsEarned: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in again.", success: null, pointsEarned: null };
  }

  // energy_bills.bill_month is the 1st of the month.
  const billMonth = `${month}-01`;

  let filePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        error: "That file is larger than 5 MB.",
        success: null,
        pointsEarned: null,
      };
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    // Storage policy only allows writing under <user id>/.
    const path = `${user.id}/${billMonth}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("bills")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) {
      return { error: uploadError.message, success: null, pointsEarned: null };
    }
    filePath = path;
  }

  const { data: inserted, error } = await supabase
    .from("energy_bills")
    .insert({
      user_id: user.id,
      bill_month: billMonth,
      kwh,
      amount_rm: amount,
      file_path: filePath,
    })
    .select("id")
    .single();

  if (error) {
    const friendly = error.message.includes("energy_bills_user_id_bill_month_key")
      ? "You already added a bill for that month."
      : error.message;
    return { error: friendly, success: null, pointsEarned: null };
  }

  // A trigger awards energy-saving points when the bill is >=10% below last
  // month's, so read back whether it fired.
  const { data: award } = await supabase
    .from("point_transactions")
    .select("points")
    .eq("bill_id", inserted.id)
    .maybeSingle();

  revalidatePath("/app", "layout");
  return {
    error: null,
    success: "Bill added.",
    pointsEarned: award ? Number(award.points) : null,
  };
}
