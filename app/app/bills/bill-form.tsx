"use client";

import { useActionState, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  ScanLine,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { addBill, type BillState } from "./actions";

const initialState: BillState = { error: null, success: null, pointsEarned: null };

type Scan = {
  kwh: number | null;
  amount_rm: number | null;
  bill_month: string | null;
  confidence: "high" | "low";
};

export function BillForm() {
  const [state, formAction, pending] = useActionState(addBill, initialState);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  // Controlled so a scan can fill them and the resident can still correct them.
  const [month, setMonth] = useState("");
  const [kwh, setKwh] = useState("");
  const [amount, setAmount] = useState("");

  async function scan() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setScanNote("Choose a photo or PDF of your bill first.");
      return;
    }

    setScanning(true);
    setScanNote(null);
    setScanned(false);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/scan-bill", { method: "POST", body });
      const data: Scan & { error?: string } = await response.json();

      if (data.error) {
        setScanNote(data.error);
        return;
      }

      if (data.bill_month) setMonth(data.bill_month);
      if (data.kwh !== null) setKwh(String(data.kwh));
      if (data.amount_rm !== null) setAmount(String(data.amount_rm));

      const found = [data.bill_month, data.kwh, data.amount_rm].filter(
        (v) => v !== null,
      ).length;

      if (found === 0) {
        setScanNote("Nothing readable in that image. Type the numbers in instead.");
      } else {
        setScanned(true);
        setScanNote(
          data.confidence === "high" && found === 3
            ? "Read your bill. Check the numbers before you save."
            : "Read what I could — please check and fill in anything missing.",
        );
      }
    } catch {
      setScanNote("Could not reach the scanner. Type the numbers in instead.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      {/* Upload first: it can fill the rest of the form in. */}
      <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-3">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-brand-800">
          <Upload className="h-4 w-4" aria-hidden />
          Your TNB bill (optional)
        </p>
        <p className="mt-1 text-xs text-brand-900">
          Snap a photo or attach the PDF. Stored privately — only you can open it.
        </p>

        <input
          ref={fileRef}
          name="file"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null);
            setScanNote(null);
            setScanned(false);
          }}
          className="mt-2.5 w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-800"
        />

        <button
          type="button"
          onClick={scan}
          disabled={scanning || !fileName}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-500"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ScanLine className="h-4 w-4" aria-hidden />
          )}
          {scanning ? "Reading your bill" : "Scan bill and fill the form"}
        </button>

        {scanNote ? (
          <p
            className={`mt-2 inline-flex items-start gap-2 text-xs ${
              scanned ? "text-brand-800" : "text-amber-800"
            }`}
          >
            {scanned ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {scanNote}
          </p>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">Bill month</span>
        <input
          name="bill_month"
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Used (kWh)</span>
          <input
            name="kwh"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            required
            value={kwh}
            onChange={(e) => setKwh(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Amount (RM)</span>
          <input
            name="amount_rm"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
          />
        </label>
      </div>

      {state.success ? (
        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
          <p className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {state.success}
          </p>
          {state.pointsEarned ? (
            <p className="mt-1 inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden />
              You cut your electricity by at least 10% — {state.pointsEarned} points
              added.
            </p>
          ) : (
            <p className="mt-1 text-brand-800">
              Use at least 10% less than last month to earn energy-saving points.
            </p>
          )}
        </div>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Add bill
      </button>
    </form>
  );
}
