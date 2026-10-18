"use client";

import { QRCodeSVG } from "qrcode.react";

/** The code itself is shown as text too — a cashier can always type it in. */
export function CodeQR({ code, label }: { code: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
        <QRCodeSVG value={code} size={128} level="M" />
      </div>
      <code className="rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold tracking-widest text-slate-800">
        {code}
      </code>
      {label ? <span className="text-xs text-slate-500">{label}</span> : null}
    </div>
  );
}
