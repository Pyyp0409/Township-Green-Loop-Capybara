"use client";

import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export type Poster = {
  id: number;
  title: string;
  points: number;
  location: string | null;
  checkin_code: string | null;
};

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Print posters
    </button>
  );
}

/**
 * Hidden on screen, one A4-ish page per activity when printed.
 * The QR encodes the check-in code so a resident can scan it at the event.
 */
export function PosterSheet({ activities }: { activities: Poster[] }) {
  const printable = activities.filter((a) => a.checkin_code);

  return (
    <div className="hidden print:block">
      {printable.map((activity) => (
        <section
          key={activity.id}
          className="flex h-screen break-after-page flex-col items-center justify-center gap-6 text-center"
        >
          <p className="text-xl font-semibold text-brand-800">
            Township Green Loop
          </p>
          <h2 className="px-8 text-4xl font-bold text-slate-900">
            {activity.title}
          </h2>
          <QRCodeSVG value={activity.checkin_code ?? ""} size={260} level="M" />
          <p className="text-3xl font-bold tracking-[0.3em] text-slate-900">
            {activity.checkin_code}
          </p>
          <p className="text-lg text-slate-600">
            Scan or type this code in the app to earn {activity.points} points
          </p>
          {activity.location ? (
            <p className="text-base text-slate-500">{activity.location}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
