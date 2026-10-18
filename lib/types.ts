export type Role = "resident" | "merchant" | "developer_admin";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  township: string | null;
};

/** Where each role lands after sign-in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  resident: "/app",
  merchant: "/shop",
  developer_admin: "/admin",
};

export type TownshipImpact = {
  raised: number;
  investors: number;
  co2_t_per_year: number;
  solar_kwp: number;
};

export type Pool = {
  id: string;
  name: string;
  risk: string;
  rate: number;
  rate_type: string;
  payback_years: number | null;
  min_invest: number;
  max_invest: number;
  description: string | null;
  risk_text: string | null;
};
