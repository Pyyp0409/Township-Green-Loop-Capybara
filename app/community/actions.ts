"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PostState = { error: string | null; ok: boolean };

export async function createPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const body = String(formData.get("body") ?? "").trim();
  const tag = String(formData.get("tag") ?? "general");
  const anonymous = formData.get("anonymous") === "on";

  if (!body) return { error: "Write something first.", ok: false };
  if (body.length > 2000) {
    return { error: "That is longer than 2,000 characters.", ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", ok: false };

  // RLS refuses an announcement from anyone who is not an admin.
  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    body,
    tag,
    anonymous,
  });

  if (error) return { error: error.message, ok: false };

  revalidatePath("/community");
  return { error: null, ok: true };
}

export async function addComment(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const postId = Number(formData.get("post_id"));
  const body = String(formData.get("body") ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";

  if (!Number.isFinite(postId)) return { error: "Unknown post.", ok: false };
  if (!body) return { error: "Write a reply first.", ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again.", ok: false };

  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    author_id: user.id,
    body,
    anonymous,
  });

  if (error) return { error: error.message, ok: false };

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { error: null, ok: true };
}

export async function react(formData: FormData) {
  const postId = Number(formData.get("post_id"));
  const kind = String(formData.get("kind") ?? "");
  const current = String(formData.get("current") ?? "");

  if (!Number.isFinite(postId)) return;

  const supabase = await createClient();
  // Tapping the same one again clears it.
  await supabase.rpc("react_to_post", {
    p_post_id: postId,
    p_kind: current === kind ? "" : kind,
  });

  revalidatePath("/community");
}

export async function reportPost(formData: FormData) {
  const postId = Number(formData.get("post_id"));
  const reason = String(formData.get("reason") ?? "Reported by a member").trim();
  if (!Number.isFinite(postId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("community_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason: reason || "Reported by a member",
  });

  revalidatePath("/community");
}

export async function moderate(formData: FormData) {
  const postId = Number(formData.get("post_id"));
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!Number.isFinite(postId) || !action) return;

  const supabase = await createClient();
  await supabase.rpc("moderate_post", {
    p_post_id: postId,
    p_action: action,
    p_reason: reason,
  });

  revalidatePath("/community");
  revalidatePath("/admin/community");
}
