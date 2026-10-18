import Link from "next/link";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Empty } from "@/components/ui";
import { Composer } from "./composer";
import { PostCard, type FeedPost } from "./post-card";

export const metadata = { title: "Community" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "announcement", label: "Announcements" },
  { value: "question", label: "Questions" },
  { value: "guidance", label: "Guidance" },
  { value: "event", label: "Events" },
  { value: "general", label: "General" },
];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("community_feed", {
    p_limit: 40,
    p_tag: tag && tag !== "" ? tag : null,
  });

  const posts = (data as FeedPost[] | null) ?? [];
  const isAdmin = profile?.role === "developer_admin";

  return (
    <main>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Community</h1>
      <p className="mt-1 text-sm text-slate-600">
        One space for residents, mall shops and the township team.
      </p>

      <nav className="-mx-4 mt-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {FILTERS.map((filter) => {
            const active = (tag ?? "") === filter.value;
            return (
              <li key={filter.label}>
                <Link
                  href={filter.value ? `/community?tag=${filter.value}` : "/community"}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                    active
                      ? "bg-brand-700 text-white ring-brand-700"
                      : "bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4">
        <Composer
          role={profile?.role ?? "resident"}
          membership={profile?.membership}
          canAnnounce={isAdmin}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          Could not load the feed: {error.message}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} isAdmin={isAdmin} />
        ))}

        {posts.length === 0 && !error ? (
          <Empty>
            Nothing here yet. Be the first to share something with your township.
          </Empty>
        ) : null}
      </div>
    </main>
  );
}
