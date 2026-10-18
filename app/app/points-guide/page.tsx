import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Section } from "@/components/ui";

export const metadata = { title: "How points work" };

type Rule = {
  id: number;
  title: string;
  detail: string;
  points: string;
  kind: string;
};

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  earn: { label: "Earn", tone: "bg-brand-50 text-brand-800 ring-brand-200" },
  convert: { label: "Convert", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  spend: { label: "Spend", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export default async function PointsGuidePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("point_rules")
    .select("id, title, detail, points, kind")
    .eq("active", true)
    .order("sort");

  const rules = (data as Rule[] | null) ?? [];
  const groups = [
    { kind: "earn", heading: "Ways to earn points" },
    { kind: "convert", heading: "Turning ringgit into points" },
    { kind: "spend", heading: "Spending points" },
  ];

  return (
    <main>
      <Link
        href="/app/points"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Points
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">How points work</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every way to earn and spend points, in one place.
      </p>

      {groups.map((group) => {
        const rows = rules.filter((r) => r.kind === group.kind);
        if (rows.length === 0) return null;
        return (
          <Section key={group.kind} title={group.heading}>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500">
                    <th scope="col" className="px-4 py-2 font-medium">
                      What
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {rule.title}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                              KIND_LABEL[rule.kind]?.tone ?? ""
                            }`}
                          >
                            {KIND_LABEL[rule.kind]?.label ?? rule.kind}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {rule.detail}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-semibold text-brand-800">
                        {rule.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Section>
        );
      })}

      <Section title="Why an admin has to approve">
        <Card>
          <p className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              A poster code can be photographed and passed to someone who never
              came. So a code alone does not pay out. You ask to check in, the
              township team confirms you took part, and only then are the points
              added. It takes a little longer, but it keeps the points worth
              something for everyone who really turns up.
            </span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Energy-saving points are the exception: those are worked out straight
            from your uploaded bill, so no approval is needed.
          </p>
        </Card>
      </Section>

      <Section title="Points never become money">
        <Card className="text-sm leading-relaxed text-slate-700">
          You can turn wallet ringgit into points, but not the other way round.
          Points are a reward for taking part, not a currency — so they cannot be
          cashed out, transferred or sold.
        </Card>
      </Section>
    </main>
  );
}
