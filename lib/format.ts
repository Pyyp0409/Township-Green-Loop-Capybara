/** RM1,234.56 — the money format used on every screen. */
export function rm(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return `RM${(Number.isFinite(n) ? n : 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole numbers with thousands separators (points, kWh, investors). */
export function num(value: number | string | null | undefined, digits = 0): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-MY", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** pools.rate is stored as a fraction (0.0500) — show it as 5%. */
export function pct(rate: number | string | null | undefined): string {
  const n = typeof rate === "string" ? Number(rate) : (rate ?? 0);
  const asPercent = (Number.isFinite(n) ? n : 0) * 100;
  return `${Number(asPercent.toFixed(2))}%`;
}

/** "Sep 2026" for a bill month or payout date. */
export function monthLabel(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-MY", { month: "short", year: "numeric" });
}

/** "12 Sep 2026" for transaction rows. */
export function dayLabel(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
