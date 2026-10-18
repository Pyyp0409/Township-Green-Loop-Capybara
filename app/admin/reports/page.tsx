import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { createClient, getProfile } from "@/lib/supabase/server";
import { Card, Section, Stat } from "@/components/ui";
import { RoleShell } from "@/app/role-shell";
import { num, rm } from "@/lib/format";

export const metadata = { title: "Reports · Admin" };

const REPORTS = [
  {
    name: "investments",
    label: "Investments",
    hint: "Every investment with the resident, pool, asset, amount and how they paid.",
  },
  {
    name: "points",
    label: "Points ledger",
    hint: "Every point earned and spent, with the reason and the date.",
  },
  {
    name: "impact",
    label: "Impact by asset",
    hint: "Funding target, raised so far, investors, kWh and tCO₂e a year.",
  },
  {
    name: "feedback",
    label: "Feedback",
    hint: "Every rating and comment, with your reply and who it was passed to.",
  },
];

export default async function AdminReportsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=%2Fadmin%2Freports");

  const supabase = await createClient();
  const [{ data: overview }, { error: probeError }] = await Promise.all([
    supabase.rpc("admin_overview"),
    // One cheap call tells us whether the report functions exist at all.
    supabase.rpc("report_impact"),
  ]);
  const reportsMissing =
    !!probeError && /not find the function|does not exist/i.test(probeError.message);
  const o = (overview as {
    residents: number;
    investors: number;
    paid_out: number;
    points_issued: number;
    co2_t_per_year: number;
  } | null) ?? null;

  return (
    <RoleShell profile={profile} area="Developer admin">
      <Link
        href="/admin"
        className="mt-5 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Overview
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-600">
        Download the township&apos;s numbers as CSV — opens straight in Excel or
        Google Sheets, ready for the sustainability report.
      </p>

      {reportsMissing ? (
        <Card className="mt-5 ring-amber-300">
          <p className="text-sm font-semibold text-amber-800">
            Reports are not set up yet
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Run <code>supabase/setup_v4.sql</code> in the Supabase SQL editor.
            It creates the four functions these downloads read from. Until then
            the buttons below will return an error instead of a file.
          </p>
        </Card>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Residents" value={num(o?.residents ?? 0)} />
        <Stat label="Investors" value={num(o?.investors ?? 0)} />
        <Stat label="Paid out" value={rm(o?.paid_out ?? 0)} />
        <Stat label="tCO₂e / year" value={num(o?.co2_t_per_year ?? 0, 1)} />
      </div>

      <Section title="Download">
        <div className="space-y-3">
          {REPORTS.map((report) => (
            <Card key={report.name}>
              <div className="flex items-start gap-3">
                <FileSpreadsheet
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {report.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {report.hint}
                  </p>
                </div>
              </div>
              <a
                href={`/api/report?name=${report.name}`}
                download
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download CSV
              </a>
            </Card>
          ))}
        </div>
      </Section>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Every report runs through a database function that checks you are an
        admin, so these links do nothing for anyone else.
      </p>
    </RoleShell>
  );
}
