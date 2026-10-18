/** How money comes in. Demo only — no real card or bank detail is ever stored. */
export const PAY_METHODS = [
  {
    value: "online_banking",
    label: "Online banking",
    hint: "FPX — Maybank2u, CIMB Clicks, RHB Now",
    refLabel: "Bank",
    options: ["Maybank2u", "CIMB Clicks", "RHB Now", "Public Bank", "Hong Leong Connect"],
  },
  {
    value: "card",
    label: "Card",
    hint: "Debit or credit card",
    refLabel: "Card",
    options: ["Visa •••• 4242", "Mastercard •••• 7781", "Visa •••• 9013"],
  },
  {
    value: "ewallet",
    label: "E-wallet",
    hint: "Touch 'n Go, GrabPay, Boost",
    refLabel: "Wallet",
    options: ["Touch 'n Go", "GrabPay", "Boost", "ShopeePay"],
  },
] as const;

/** How money goes out. Points are one-way: ringgit can become points, never back. */
export const PAYOUT_METHODS = [
  {
    value: "bank_transfer",
    label: "Bank transfer",
    hint: "Straight to your account each month",
    options: ["Maybank •••• 8891", "CIMB •••• 2204", "Public Bank •••• 5517"],
  },
  {
    value: "ewallet",
    label: "E-wallet",
    hint: "Topped up each month",
    options: ["Touch 'n Go", "GrabPay", "Boost"],
  },
  {
    value: "points",
    label: "Green points",
    hint: "Payouts arrive as points instead of ringgit",
    options: [],
  },
] as const;

export const PAY_METHOD_LABEL: Record<string, string> = {
  online_banking: "Online banking",
  card: "Card",
  ewallet: "E-wallet",
  bank_transfer: "Bank transfer",
  points: "Green points",
};

/** Points given per RM1 when converting wallet money. Matches app_settings. */
export const POINTS_PER_RM = 20;
