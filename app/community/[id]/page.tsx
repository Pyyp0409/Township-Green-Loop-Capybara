import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section } from "@/components/ui";
import { RoleIcon, roleLabel } from "@/components/role-icon";
import { dayLabel } from "@/lib/format";
import { PostCard, type FeedPost } from "../post-card";
import { ReplyForm } from "./reply-form";

export const metadata = { title: "Post" };

type Comment = {
  id: number;
  body: string;
  created_at: string;
  author_name: string;
  author_role: string;
  author_membership: string | null;
  badge_image: string | null;
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: feed }, { data: comments }] = await Promise.all([
    supabase.rpc("community_feed", { p_limit: 100, p_tag: null }),
    supabase.rpc("post_comments", { p_post_id: postId }),
  ]);

  const post = ((feed as FeedPost[] | null) ?? []).find((p) => p.id === postId);
  if (!post) notFound();

  const replies = (comments as Comment[] | null) ?? [];

  return (
    <main>
      <Link
        href="/community"
        className="mt-6 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the feed
      </Link>

      <div className="mt-3">
        <PostCard post={post} isAdmin={profile?.role === "developer_admin"} />
      </div>

      <Section title={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}>
        {replies.length > 0 ? (
          <div className="space-y-3">
            {replies.map((reply) => (
              <Card key={reply.id}>
                <div className="flex items-start gap-3">
                  <RoleIcon
                    role={reply.author_role}
                    membership={reply.author_membership}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-sm font-medium text-slate-900">
                        {reply.author_name}
                      </span>
                      {reply.badge_image ? (
                        <Image
                          src={reply.badge_image}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      ) : null}
                      <span className="text-[11px] text-slate-400">
                        {roleLabel(reply.author_role, reply.author_membership)} ·{" "}
                        {dayLabel(reply.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {reply.body}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No replies yet. Be the first to answer.</Empty>
        )}
      </Section>

      <Section title="Write a reply">
        <ReplyForm postId={postId} />
      </Section>
    </main>
  );
}
