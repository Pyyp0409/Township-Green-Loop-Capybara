/** Required on every money screen. */
export const DEMO_DISCLAIMER =
  "Demo only. Not a deposit; not covered by PIDM. Investments are offered through a licensed platform.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      {DEMO_DISCLAIMER}
    </p>
  );
}
