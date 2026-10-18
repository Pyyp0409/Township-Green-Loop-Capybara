import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { dayLabel, num } from "@/lib/format";
import { PostCard, type FeedPost } from "@/app/community/post-card";
import { moderate } from "@/app/community/actions";
import { Composer } from "@/app/community/composer";

export const metadata = { title: "Community · Admin" };

type Report = {
  id: number;
  post_id: number | null;
  comment_id: number | null;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string | null;
  body: string | null;
  author_name: string | null;
};

export default async function AdminCommunityPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Fcommunity");

  const supabase = await createClient();
  const [{ data: feed }, { data: reportData }, { data: hiddenRows }] =
    await Promise.all([
      supabase.rpc("community_feed", { p_limit: 60, p_tag: null }),
      supabase.rpc("admin_reports"),
      supabase
        .from("community_posts")
        .select("id, status")
        .neq("status", "visible"),
    ]);

  const posts = (feed as FeedPost[] | null) ?? [];
  const reports = (reportData as Report[] | null) ?? [];
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.id as number));
  const open = reports.filter((r) => r.status === "open");

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Manage community</h1>
      <p className="mt-1 text-sm text-slate-600">
        Hide anything unsafe, pin what matters, and post announcements from the{" "}
        <Link href="/community" className="font-medium text-brand-700">
          community feed
        </Link>
        .
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Posts" value={num(posts.length)} />
        <Stat
          label="Open reports"
          value={num(open.length)}
          hint={hiddenIds.size > 0 ? `${hiddenIds.size} hidden` : undefined}
        />
      </div>

      <Section title="Post an announcement">
        <Composer role={profile.role} canAnnounce />
        <p className="mt-2 text-xs text-slate-500">
          Pick the Announcement tag to pin it as official township news. Residents
          and shops both see it. To reply to someone, open their post from the
          feed below.
        </p>
      </Section>

      <Section title={`Reported (${open.length})`}>
        {open.length > 0 ? (
          <div className="space-y-3">
            {open.map((report) => (
              <Card key={report.id} className="ring-rose-200">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-rose-700">
                  <Flag className="h-3.5 w-3.5" aria-hidden />
                  {report.reason}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                  &ldquo;{report.body ?? "(deleted)"}&rdquo;
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  by {report.author_name ?? "unknown"} · reported by{" "}
                  {report.reporter_name ?? "a member"} · {dayLabel(report.created_at)}
                </p>

                {report.post_id ? (
                  <div className="mt-3 flex gap-2">
                    <form action={moderate} className="flex-1">
                      <input type="hidden" name="post_id" value={report.post_id} />
                      <input type="hidden" name="action" value="hide" />
                      <input
                        type="hidden"
                        name="reason"
                        value={report.reason}
                      />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white"
                      >
                        Hide it
                      </button>
                    </form>
                    <form action={moderate} className="flex-1">
                      <input type="hidden" name="post_id" value={report.post_id} />
                      <input type="hidden" name="action" value="show" />
                      <button
                        type="submit"
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300"
                      >
                        Leave it up
                      </button>
                    </form>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing reported. The feed is clear.</Empty>
        )}
      </Section>

      <Section title="Every post">
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin
                hidden={hiddenIds.has(post.id)}
              />
            ))}
          </div>
        ) : (
          <Empty>No posts yet.</Empty>
        )}
      </Section>
    </RoleShell>
  );
}
