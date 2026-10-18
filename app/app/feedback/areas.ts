/** The parts of the app a resident can rate. Shared by the form, the list and
 *  the admin dashboard, so the labels never drift apart. */
export const AREAS = [
  { value: "investment", label: "Investing" },
  { value: "activities", label: "Activities" },
  { value: "points", label: "Points and check-ins" },
  { value: "rewards", label: "Rewards" },
  { value: "wallet", label: "Wallet and mall credit" },
  { value: "community", label: "Community" },
  { value: "app", label: "The app overall" },
] as const;

export type AreaValue = (typeof AREAS)[number]["value"];
