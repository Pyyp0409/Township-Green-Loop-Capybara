import Link from "next/link";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-xl font-semibold text-brand-800">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="text-sm text-slate-500">{children}</Card>
  );
}

export function RiskBadge({ poolId, risk }: { poolId: string; risk: string }) {
  if (poolId === "ev") {
    return (
      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
        High risk – capital not guaranteed
      </span>
    );
  }
  const tone =
    risk === "low"
      ? "bg-brand-50 text-brand-700 ring-brand-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${tone}`}>
      {risk} risk
    </span>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={Math.round(share)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-all"
        style={{ width: `${share}%` }}
      />
    </div>
  );
}

export function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"
    >
      <span className="text-brand-700">{icon}</span>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </Link>
  );
}
