import Image from "next/image";
import Link from "next/link";
import { EyeOff, Flag, Heart, MessageCircle, Pin, PartyPopper, Sparkles } from "lucide-react";
import { RoleIcon, roleLabel } from "@/components/role-icon";
import { dayLabel } from "@/lib/format";
import { moderate, react, reportPost } from "./actions";

export type FeedPost = {
  id: number;
  body: string;
  tag: string;
  pinned: boolean;
  created_at: string;
  author_name: string;
  author_role: string;
  author_membership: string | null;
  badge_name: string | null;
  badge_image: string | null;
  likes: number;
  supports: number;
  celebrates: number;
  comment_count: number;
  my_reaction: string | null;
};

const TAG_TONE: Record<string, string> = {
  announcement: "bg-amber-50 text-amber-800 ring-amber-200",
  question: "bg-sky-50 text-sky-800 ring-sky-200",
  guidance: "bg-brand-50 text-brand-800 ring-brand-200",
  event: "bg-violet-50 text-violet-800 ring-violet-200",
  general: "bg-slate-100 text-slate-600 ring-slate-200",
};

const REACTIONS = [
  { kind: "like", label: "Like", Icon: Heart },
  { kind: "support", label: "Support", Icon: Sparkles },
  { kind: "celebrate", label: "Celebrate", Icon: PartyPopper },
] as const;

export function PostCard({
  post,
  isAdmin,
  hidden = false,
}: {
  post: FeedPost;
  isAdmin: boolean;
  hidden?: boolean;
}) {
  const counts: Record<string, number> = {
    like: post.likes,
    support: post.supports,
    celebrate: post.celebrates,
  };

  return (
    <article
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
        post.pinned ? "ring-amber-300" : "ring-slate-200"
      } ${hidden ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <RoleIcon
          role={post.author_role}
          membership={post.author_membership}
          size={40}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-slate-900">
              {post.author_name}
            </span>

            {post.badge_image ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-0.5 pr-2 ring-1 ring-brand-200"
                title={post.badge_name ?? ""}
              >
                <Image
                  src={post.badge_image}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-full"
                />
                <span className="text-[11px] font-medium text-brand-800">
                  {post.badge_name}
                </span>
              </span>
            ) : null}

            <span className="text-[11px] text-slate-400">
              {roleLabel(post.author_role, post.author_membership)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ring-1 ${
                TAG_TONE[post.tag] ?? TAG_TONE.general
              }`}
            >
              {post.tag}
            </span>
            {post.pinned ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            ) : null}
            <span className="text-[11px] text-slate-400">
              {dayLabel(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
        {post.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {REACTIONS.map(({ kind, label, Icon }) => {
          const mine = post.my_reaction === kind;
          return (
            <form action={react} key={kind}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="current" value={post.my_reaction ?? ""} />
              <button
                type="submit"
                aria-label={label}
                aria-pressed={mine}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ${
                  mine
                    ? "bg-brand-50 text-brand-800 ring-brand-300"
                    : "text-slate-500 ring-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {counts[kind]}
              </button>
            </form>
          );
        })}

        <Link
          href={`/community/${post.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          {post.comment_count}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {isAdmin ? (
            <>
              <form action={moderate}>
                <input type="hidden" name="post_id" value={post.id} />
                <input
                  type="hidden"
                  name="action"
                  value={post.pinned ? "unpin" : "pin"}
                />
                <button
                  type="submit"
                  className="rounded-full px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200"
                >
                  {post.pinned ? "Unpin" : "Pin"}
                </button>
              </form>
              <form action={moderate}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="action" value={hidden ? "show" : "hide"} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-rose-700 ring-1 ring-rose-200"
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  {hidden ? "Show" : "Hide"}
                </button>
              </form>
            </>
          ) : (
            <form action={reportPost}>
              <input type="hidden" name="post_id" value={post.id} />
              <input
                type="hidden"
                name="reason"
                value="Reported from the feed"
              />
              <button
                type="submit"
                aria-label="Report this post"
                className="rounded-full p-1.5 text-slate-400 ring-1 ring-slate-200"
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
