import Image from "next/image";
import { CheckCircle2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Progress, Section } from "@/components/ui";
import { dayLabel, num } from "@/lib/format";

export const metadata = { title: "Badges" };

type Badge = {
  id: number;
  name: string;
  min_points: number;
  description: string;
  image_path: string;
};

type Mine = { badge_id: number; awarded_at: string };

export default async function BadgesPage() {
  const supabase = await createClient();

  const [{ data: allBadges }, { data: mine }, { data: points }] = await Promise.all([
    supabase
      .from("badges")
      .select("id, name, min_points, description, image_path")
      .order("min_points"),
    supabase.rpc("my_badges"),
    supabase.rpc("my_points"),
  ]);

  const badges = (allBadges as Badge[] | null) ?? [];
  const earned = new Map(
    ((mine as Mine[] | null) ?? []).map((b) => [b.badge_id, b.awarded_at]),
  );

  // Badges are based on points earned over time, not the balance left after
  // spending — so the ladder never goes backwards.
  const lifetime = badges.reduce(
    (max, b) => (earned.has(b.id) ? Math.max(max, b.min_points) : max),
    0,
  );
  const current = [...badges].reverse().find((b) => earned.has(b.id)) ?? null;
  const next = badges.find((b) => !earned.has(b.id)) ?? null;
  const toGo = next ? Math.max(0, next.min_points - Math.max(lifetime, Number(points ?? 0))) : 0;

  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Badges</h1>
      <p className="mt-1 text-sm text-slate-600">
        Earned from the points you collect over time. Spending points on rewards
        never takes a badge away.
      </p>

      <Card className="mt-5 text-center">
        {current ? (
          <>
            <div className="flex justify-center">
              <Image
                src={current.image_path}
                alt=""
                width={132}
                height={132}
                priority
              />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">{current.name}</p>
            <p className="mt-1 text-sm text-slate-600">{current.description}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-900">No badge yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Earn {num(badges[0]?.min_points ?? 100)} points to become a{" "}
              {badges[0]?.name ?? "Seedling"}.
            </p>
          </>
        )}

        {next ? (
          <div className="mt-4 text-left">
            <div className="flex items-baseline justify-between text-xs text-slate-500">
              <span>Next: {next.name}</span>
              <span className="tabular">
                {num(toGo)} point{toGo === 1 ? "" : "s"} to go
              </span>
            </div>
            <div className="mt-1.5">
              <Progress
                value={Math.max(lifetime, Number(points ?? 0))}
                max={next.min_points}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm font-medium text-brand-700">
            Every badge earned. You are one of the township&apos;s leaders.
          </p>
        )}
      </Card>

      <Section title="All five levels">
        <div className="space-y-3">
          {badges.map((badge) => {
            const got = earned.get(badge.id);
            return (
              <Card
                key={badge.id}
                className={got ? "" : "opacity-70"}
              >
                <div className="flex items-start gap-3">
                  <Image
                    src={badge.image_path}
                    alt=""
                    width={56}
                    height={56}
                    className={got ? "" : "grayscale"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {badge.name}
                      </span>
                      {got ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-brand-600"
                          aria-label="Earned"
                        />
                      ) : (
                        <Lock
                          className="h-4 w-4 shrink-0 text-slate-300"
                          aria-label="Not yet earned"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-brand-700">
                      {num(badge.min_points)} points
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {badge.description}
                    </p>
                    {got ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Earned {dayLabel(got)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Your badge appears next to your name in the community, so neighbours can
        see who keeps the township green.
      </p>
    </main>
  );
}
