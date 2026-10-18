-- Township Green Loop – database setup (run once in Supabase > SQL Editor)
-- Demo data only. No real money moves through this app.
-- Auto-expose is OFF, so every table gets explicit GRANTs below. RLS is ON for every table.

-- ============ 1. TABLES ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'resident' check (role in ('resident', 'merchant', 'developer_admin')),
  township text default 'City of Elmina',
  created_at timestamptz not null default now()
);

create table public.pools (
  id text primary key,                       -- 'solar' | 'upgrade' | 'ev'
  name text not null,
  risk text not null,                        -- low | medium | high
  rate numeric(6,4) not null,                -- per year
  rate_type text not null,
  payback_years int not null,
  min_invest numeric(12,2) not null,
  max_invest numeric(12,2) not null,
  description text
);

create table public.investments (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pool_id text not null references public.pools(id),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'repaid', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.payouts (
  id bigint generated always as identity primary key,
  investment_id bigint not null references public.investments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  kind text not null check (kind in ('profit', 'principal', 'top_up')),
  paid_at date not null default current_date
);

create table public.energy_bills (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bill_month date not null,
  kwh numeric(10,2) not null check (kwh >= 0),
  amount_rm numeric(10,2) not null check (amount_rm >= 0),
  file_path text,                            -- path in the 'bills' storage bucket
  created_at timestamptz not null default now(),
  unique (user_id, bill_month)
);

create table public.activities (
  id bigint generated always as identity primary key,
  title text not null,
  kind text not null check (kind in ('recycling', 'event', 'energy_saving')),
  points int not null check (points > 0),
  location text,
  starts_at timestamptz
);

create table public.point_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points int not null,                       -- + earned, − spent
  reason text not null,
  activity_id bigint references public.activities(id),
  created_at timestamptz not null default now()
);

create table public.malls (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table public.rewards (
  id bigint generated always as identity primary key,
  mall_id bigint not null references public.malls(id),
  merchant_id uuid references public.profiles(id),
  title text not null,
  points_cost int not null check (points_cost > 0),
  stock int not null default 100 check (stock >= 0),
  active boolean not null default true
);

create table public.redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id bigint not null references public.rewards(id),
  points_used int not null,
  code text not null default upper(substr(md5(random()::text), 1, 8)),
  status text not null default 'issued' check (status in ('issued', 'used')),
  created_at timestamptz not null default now()
);

create index on public.investments (user_id);
create index on public.payouts (user_id);
create index on public.energy_bills (user_id);
create index on public.point_transactions (user_id);
create index on public.redemptions (user_id);

-- ============ 2. HELPERS ============

-- Is the current user a developer admin? (security definer avoids RLS recursion on profiles)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'developer_admin');
$$;

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Enforce each pool's minimum and maximum (total per resident per pool)
create or replace function public.check_investment_limits()
returns trigger language plpgsql set search_path = public as $$
declare p public.pools; already numeric;
begin
  select * into p from public.pools where id = new.pool_id;
  select coalesce(sum(amount), 0) into already from public.investments
    where user_id = new.user_id and pool_id = new.pool_id and status = 'active';
  if new.amount < p.min_invest then
    raise exception 'Minimum for % is RM%', p.name, p.min_invest;
  end if;
  if already + new.amount > p.max_invest then
    raise exception 'Maximum for % is RM% per resident', p.name, p.max_invest;
  end if;
  return new;
end;
$$;
create trigger investments_limits before insert on public.investments
  for each row execute function public.check_investment_limits();

-- Points balance for the signed-in user
create or replace function public.my_points()
returns int language sql stable security invoker set search_path = public as $$
  select coalesce(sum(points), 0)::int from public.point_transactions where user_id = auth.uid();
$$;

-- Redeem a reward: checks balance and stock, deducts points, issues a code (all in one step)
create or replace function public.redeem_reward(p_reward_id bigint)
returns public.redemptions language plpgsql security definer set search_path = public as $$
declare r public.rewards; bal int; out_row public.redemptions;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into r from public.rewards where id = p_reward_id and active for update;
  if not found then raise exception 'Reward not available'; end if;
  if r.stock <= 0 then raise exception 'Out of stock'; end if;
  select coalesce(sum(points), 0) into bal from public.point_transactions where user_id = auth.uid();
  if bal < r.points_cost then raise exception 'Not enough points (have %, need %)', bal, r.points_cost; end if;
  update public.rewards set stock = stock - 1 where id = r.id;
  insert into public.point_transactions (user_id, points, reason)
    values (auth.uid(), -r.points_cost, 'Redeemed: ' || r.title);
  insert into public.redemptions (user_id, reward_id, points_used)
    values (auth.uid(), r.id, r.points_cost) returning * into out_row;
  return out_row;
end;
$$;

-- Check in to an activity (recycling drop-off, community event): one check-in per activity per user
create unique index point_tx_one_checkin on public.point_transactions (user_id, activity_id) where activity_id is not null;
create or replace function public.check_in(p_activity_id bigint)
returns int language plpgsql security definer set search_path = public as $$
declare a public.activities;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into a from public.activities where id = p_activity_id;
  if not found then raise exception 'Activity not found'; end if;
  insert into public.point_transactions (user_id, points, reason, activity_id)
    values (auth.uid(), a.points, a.kind || ': ' || a.title, a.id);
  return a.points;
end;
$$;

-- ============ 3. ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.investments enable row level security;
alter table public.payouts enable row level security;
alter table public.energy_bills enable row level security;
alter table public.activities enable row level security;
alter table public.point_transactions enable row level security;
alter table public.malls enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

-- Profiles: see and edit your own; admins see all. Role cannot be changed by the user.
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());   -- role column is not granted for update (see GRANTS)

-- Public catalogue: anyone can read
create policy "pools read" on public.pools for select to anon, authenticated using (true);
create policy "activities read" on public.activities for select to anon, authenticated using (true);
create policy "malls read" on public.malls for select to anon, authenticated using (true);
create policy "rewards read" on public.rewards for select to anon, authenticated using (active or public.is_admin());

-- Investments: residents create and read their own; admins read all
create policy "own investments read" on public.investments for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own investments insert" on public.investments for insert to authenticated with check (user_id = auth.uid());

-- Payouts: read own; admins read and create
create policy "own payouts read" on public.payouts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admin payouts insert" on public.payouts for insert to authenticated with check (public.is_admin());

-- Energy bills: full control of your own
create policy "own bills read" on public.energy_bills for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own bills insert" on public.energy_bills for insert to authenticated with check (user_id = auth.uid());
create policy "own bills update" on public.energy_bills for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bills delete" on public.energy_bills for delete to authenticated using (user_id = auth.uid());

-- Points and redemptions: read own (writes only through check_in / redeem_reward)
create policy "own points read" on public.point_transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own redemptions read" on public.redemptions for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Admins manage the catalogue
create policy "admin activities write" on public.activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin rewards write" on public.rewards for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ 4. GRANTS (needed because auto-expose is off) ============

grant usage on schema public to anon, authenticated;
grant select on public.pools, public.activities, public.malls, public.rewards to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, township) on public.profiles to authenticated;   -- users cannot change their own role
grant select, insert on public.investments to authenticated;
grant select, insert on public.payouts to authenticated;
grant select, insert, update, delete on public.energy_bills to authenticated;
grant select on public.point_transactions, public.redemptions to authenticated;
grant insert, update, delete on public.activities, public.rewards to authenticated;
revoke all on function public.redeem_reward(bigint), public.check_in(bigint), public.my_points() from public, anon;
grant execute on function public.redeem_reward(bigint), public.check_in(bigint), public.my_points() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ============ 5. STORAGE: private bucket for bill uploads (path = <user id>/<file>) ============

insert into storage.buckets (id, name, public) values ('bills', 'bills', false) on conflict (id) do nothing;
create policy "own bill files read" on storage.objects for select to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own bill files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own bill files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ 6. DEMO DATA (numbers from the v3 business plan) ============

insert into public.pools (id, name, risk, rate, rate_type, payback_years, min_invest, max_invest, description) values
 ('solar', 'Rooftop Solar', 'low', 0.0500, 'Fixed payout backed by tenant power payments (not roof leasing); minimum 4.5%', 5, 100, 5000,
  'Residents fund part of commercial rooftop solar owned and run by the developer/JV. Tenants pay for the power; residents are paid first.'),
 ('upgrade', 'Shop Energy Upgrades', 'medium', 0.0650, 'Fixed; installer guarantees shop savings', 3, 100, 3000,
  'Efficient air-con, fridges and LED for mall shops, repaid from 80% of the bill savings.'),
 ('ev', 'EV Charging', 'high', 0.0660, 'Variable, not guaranteed; partners top up to 60 kWh/day (capped)', 7, 100, 1000,
  'DC 60 kW + AC 22 kW chargers co-funded with a licensed charge point operator. Capital at risk.');

insert into public.malls (name) values ('KL East Mall'), ('Elmina Lakeside Mall'), ('KLGCC Mall');

insert into public.rewards (mall_id, title, points_cost, stock)
select m.id, r.title, r.cost, r.stock from public.malls m
join (values
  ('KL East Mall', 'RM10 food court voucher', 200, 100),
  ('KL East Mall', 'Free 1-hour parking', 80, 300),
  ('Elmina Lakeside Mall', 'RM20 grocery voucher', 400, 50),
  ('Elmina Lakeside Mall', 'Reusable tote bag', 120, 150),
  ('KLGCC Mall', 'RM15 café voucher', 300, 80),
  ('KLGCC Mall', '10 kWh EV charging credit', 250, 60)
) as r(mall, title, cost, stock) on r.mall = m.name;

insert into public.activities (title, kind, points, location, starts_at) values
 ('Recycling drop-off (per visit)', 'recycling', 20, 'Elmina Lakeside Mall recycling corner', now()),
 ('Tree planting day', 'event', 100, 'Elmina Central Park', now() + interval '7 days'),
 ('Community clean-up', 'event', 80, 'KL East Mall riverside', now() + interval '14 days'),
 ('Used cooking oil collection', 'recycling', 30, 'KLGCC Mall loading bay', now()),
 ('Cut home electricity 10% vs last month', 'energy_saving', 150, 'Upload your bill in the app', null);


-- ===================== PART 2 =====================

-- Township Green Loop – additions (run AFTER 01_setup.sql, once)
-- Fills the gaps between the database and the business plan:
--  A. Wallet: payouts land in a wallet; spending them at a mall gives +10% (shop-funded)
--  B. Assets and impact: the actual solar roofs, shop upgrades and chargers, with CO2
--  C. Mall shops for merchants: shop list, energy-saving dashboard, code scanning
--  D. Investor protection: risk acknowledgement per pool + RM50,000 a year total limit
--  E. Fair points: QR code for check-ins; energy-saving points awarded from bills automatically
--  F. Demo payouts generator and admin / public summaries

-- ============ A. WALLET ============

create table public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,             -- + in, − out
  kind text not null check (kind in ('payout', 'mall_spend', 'withdrawal')),
  note text,
  created_at timestamptz not null default now()
);
create index on public.wallet_transactions (user_id);

create table public.mall_credits (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mall_id bigint not null references public.malls(id),
  wallet_amount numeric(12,2) not null check (wallet_amount > 0),
  bonus numeric(12,2) not null,              -- paid by participating shops
  value numeric(12,2) generated always as (wallet_amount + bonus) stored,
  code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  status text not null default 'issued' check (status in ('issued', 'used')),
  created_at timestamptz not null default now()
);
create index on public.mall_credits (user_id);

create or replace function public.my_wallet()
returns numeric language sql stable security invoker set search_path = public as $$
  select coalesce(sum(amount), 0) from public.wallet_transactions where user_id = auth.uid();
$$;

-- Turn wallet money into a mall credit worth 10% more
create or replace function public.spend_at_mall(p_mall_id bigint, p_amount numeric)
returns public.mall_credits language plpgsql security definer set search_path = public as $$
declare bal numeric; mname text; out_row public.mall_credits;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be more than 0'; end if;
  select name into mname from public.malls where id = p_mall_id;
  if mname is null then raise exception 'Mall not found'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select coalesce(sum(amount), 0) into bal from public.wallet_transactions where user_id = auth.uid();
  if bal < p_amount then raise exception 'Not enough in wallet (have RM%, need RM%)', bal, p_amount; end if;
  insert into public.wallet_transactions (user_id, amount, kind, note)
    values (auth.uid(), -p_amount, 'mall_spend', 'Mall credit at ' || mname);
  insert into public.mall_credits (user_id, mall_id, wallet_amount, bonus)
    values (auth.uid(), p_mall_id, p_amount, round(p_amount * 0.10, 2)) returning * into out_row;
  return out_row;
end;
$$;

-- ============ B. ASSETS AND IMPACT ============

create table public.assets (
  id bigint generated always as identity primary key,
  pool_id text not null references public.pools(id),
  name text not null,
  mall_id bigint references public.malls(id),
  size_kw numeric(10,2),                     -- kWp for solar, kW for chargers; null for upgrades
  funding_target numeric(12,2) not null,     -- residents' share to raise
  status text not null default 'raising' check (status in ('raising', 'running', 'repaid')),
  kwh_per_year numeric(12,0),                -- solar output, or electricity saved for upgrades
  co2_t_per_year numeric(10,1),
  note text
);
alter table public.investments add column asset_id bigint references public.assets(id);

-- Money raised per asset (aggregate only, no personal data)
create or replace function public.asset_progress()
returns table (asset_id bigint, raised numeric, investors bigint)
language sql stable security definer set search_path = public as $$
  select a.id, coalesce(sum(i.amount), 0), count(distinct i.user_id)
  from public.assets a left join public.investments i on i.asset_id = a.id and i.status = 'active'
  group by a.id;
$$;

-- ============ C. MALL SHOPS (merchant role) ============

create table public.shops (
  id bigint generated always as identity primary key,
  mall_id bigint not null references public.malls(id),
  merchant_id uuid references public.profiles(id),
  name text not null,
  category text,
  upgraded boolean not null default false,
  upgrade_asset_id bigint references public.assets(id)
);

create table public.shop_energy (
  id bigint generated always as identity primary key,
  shop_id bigint not null references public.shops(id) on delete cascade,
  month date not null,
  kwh numeric(10,0) not null,
  baseline_kwh numeric(10,0) not null,       -- before the upgrade
  bill_rm numeric(10,2) not null,
  saving_rm numeric(10,2) generated always as (round((baseline_kwh - kwh) * 0.4540, 2)) stored,
  unique (shop_id, month)
);

-- Merchant scans a resident's code (reward or mall credit) at the till
create or replace function public.merchant_accept_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare my_malls bigint[]; n int;
begin
  select array_agg(mall_id) into my_malls from public.shops where merchant_id = auth.uid();
  if my_malls is null then raise exception 'Only mall shops can accept codes'; end if;
  update public.redemptions r set status = 'used'
    from public.rewards w
    where r.reward_id = w.id and r.code = upper(p_code) and r.status = 'issued' and w.mall_id = any(my_malls);
  get diagnostics n = row_count;
  if n > 0 then return 'Reward accepted'; end if;
  update public.mall_credits set status = 'used'
    where code = upper(p_code) and status = 'issued' and mall_id = any(my_malls);
  get diagnostics n = row_count;
  if n > 0 then return 'Mall credit accepted'; end if;
  raise exception 'Code not valid at this mall or already used';
end;
$$;

-- ============ D. INVESTOR PROTECTION ============

create table public.risk_acknowledgements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pool_id text not null references public.pools(id),
  version text not null default 'v1',
  accepted_at timestamptz not null default now(),
  primary key (user_id, pool_id, version)
);
alter table public.pools add column risk_text text;

-- Replace the limit check: risk acknowledged + pool min/max + RM50,000 in 12 months across all pools
create or replace function public.check_investment_limits()
returns trigger language plpgsql set search_path = public as $$
declare p public.pools; already numeric; year_total numeric;
begin
  select * into p from public.pools where id = new.pool_id;
  if not exists (select 1 from public.risk_acknowledgements where user_id = new.user_id and pool_id = new.pool_id) then
    raise exception 'Please read and accept the risk statement for % first', p.name;
  end if;
  select coalesce(sum(amount), 0) into already from public.investments
    where user_id = new.user_id and pool_id = new.pool_id and status = 'active';
  select coalesce(sum(amount), 0) into year_total from public.investments
    where user_id = new.user_id and created_at > now() - interval '12 months';
  if new.amount < p.min_invest then raise exception 'Minimum for % is RM%', p.name, p.min_invest; end if;
  if already + new.amount > p.max_invest then raise exception 'Maximum for % is RM% per resident', p.name, p.max_invest; end if;
  if year_total + new.amount > 50000 then raise exception 'Retail limit: RM50,000 in 12 months across all pools'; end if;
  return new;
end;
$$;

-- ============ E. FAIR POINTS ============

alter table public.activities add column checkin_code text;
alter table public.point_transactions add column bill_id bigint unique references public.energy_bills(id) on delete set null;

-- Check-in now needs the code shown on the QR poster at the event; energy saving cannot be self-claimed
drop function public.check_in(bigint);
create or replace function public.check_in(p_activity_id bigint, p_code text)
returns int language plpgsql security definer set search_path = public as $$
declare a public.activities;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into a from public.activities where id = p_activity_id;
  if not found then raise exception 'Activity not found'; end if;
  if a.kind = 'energy_saving' then raise exception 'Energy-saving points come from your bill upload'; end if;
  if a.checkin_code is not null and upper(coalesce(p_code, '')) <> upper(a.checkin_code) then
    raise exception 'Wrong check-in code';
  end if;
  insert into public.point_transactions (user_id, points, reason, activity_id)
    values (auth.uid(), a.points, a.kind || ': ' || a.title, a.id);
  return a.points;
exception when unique_violation then
  raise exception 'You have already checked in to this activity';
end;
$$;

-- When a bill is saved, award points if usage is at least 10% below the previous month
create or replace function public.award_energy_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare prev numeric; pts int;
begin
  select kwh into prev from public.energy_bills
    where user_id = new.user_id and bill_month = (new.bill_month - interval '1 month')::date;
  select points into pts from public.activities where kind = 'energy_saving' order by id limit 1;
  if prev is not null and prev > 0 and new.kwh <= prev * 0.9 and pts is not null then
    insert into public.point_transactions (user_id, points, reason, bill_id)
      values (new.user_id, pts, 'energy_saving: ' || to_char(new.bill_month, 'Mon YYYY') || ' used ' ||
              round((1 - new.kwh / prev) * 100) || '% less', new.id)
      on conflict (bill_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger energy_bill_points after insert on public.energy_bills
  for each row execute function public.award_energy_points();

-- ============ F. DEMO PAYOUTS AND SUMMARIES ============

-- Admin button: pay one month to every active investment (annuity at the pool's rate and payback)
create or replace function public.run_demo_payouts(p_paid_at date default current_date)
returns int language plpgsql security definer set search_path = public as $$
declare inv record; r numeric; n int; pmt numeric; owed numeric; intr numeric; prin numeric; cnt int := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  for inv in select i.*, p.rate, p.payback_years from public.investments i join public.pools p on p.id = i.pool_id where i.status = 'active' loop
    r := inv.rate / 12; n := inv.payback_years * 12;
    pmt := round(inv.amount * r / (1 - power(1 + r, -n)), 2);
    select inv.amount - coalesce(sum(amount), 0) into owed from public.payouts where investment_id = inv.id and kind = 'principal';
    if owed <= 0.005 then update public.investments set status = 'repaid' where id = inv.id; continue; end if;
    intr := round(owed * r, 2);
    prin := least(owed, pmt - intr);
    insert into public.payouts (investment_id, user_id, amount, kind, paid_at) values
      (inv.id, inv.user_id, intr, 'profit', p_paid_at), (inv.id, inv.user_id, prin, 'principal', p_paid_at);
    insert into public.wallet_transactions (user_id, amount, kind, note)
      values (inv.user_id, intr + prin, 'payout', inv.pool_id || ' payout ' || to_char(p_paid_at, 'Mon YYYY'));
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

-- Admin dashboard numbers
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'residents', (select count(*) from public.profiles where role = 'resident'),
    'investors', (select count(distinct user_id) from public.investments),
    'raised_by_pool', (select coalesce(json_object_agg(pool_id, total), '{}'::json) from
                        (select pool_id, sum(amount) total from public.investments where status = 'active' group by pool_id) t),
    'paid_out', (select coalesce(sum(amount), 0) from public.payouts),
    'points_issued', (select coalesce(sum(points), 0) from public.point_transactions where points > 0),
    'mall_credits_value', (select coalesce(sum(value), 0) from public.mall_credits),
    'co2_t_per_year', (select coalesce(sum(co2_t_per_year), 0) from public.assets where status <> 'raising')
  );
end;
$$;

-- Public landing-page numbers (totals only)
create or replace function public.township_impact()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'raised', (select coalesce(sum(amount), 0) from public.investments where status = 'active'),
    'investors', (select count(distinct user_id) from public.investments),
    'co2_t_per_year', (select coalesce(sum(co2_t_per_year), 0) from public.assets where status <> 'raising'),
    'solar_kwp', (select coalesce(sum(size_kw), 0) from public.assets where pool_id = 'solar')
  );
$$;

-- ============ RLS ============

alter table public.wallet_transactions enable row level security;
alter table public.mall_credits enable row level security;
alter table public.assets enable row level security;
alter table public.shops enable row level security;
alter table public.shop_energy enable row level security;
alter table public.risk_acknowledgements enable row level security;

create policy "own wallet read" on public.wallet_transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own credits read" on public.mall_credits for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or mall_id in (select mall_id from public.shops where merchant_id = auth.uid()));
create policy "assets read" on public.assets for select to anon, authenticated using (true);
create policy "admin assets write" on public.assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shops read" on public.shops for select to anon, authenticated using (true);
create policy "admin shops write" on public.shops for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shop energy read" on public.shop_energy for select to authenticated
  using (public.is_admin() or shop_id in (select id from public.shops where merchant_id = auth.uid()));
create policy "admin shop energy write" on public.shop_energy for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "own risk read" on public.risk_acknowledgements for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "own risk insert" on public.risk_acknowledgements for insert to authenticated with check (user_id = auth.uid());
-- Merchants see redemptions of their own mall's rewards
create policy "merchant redemptions read" on public.redemptions for select to authenticated
  using (reward_id in (select w.id from public.rewards w join public.shops s on s.mall_id = w.mall_id where s.merchant_id = auth.uid()));

-- ============ GRANTS ============

grant select on public.wallet_transactions, public.mall_credits to authenticated;
grant select on public.assets, public.shops to anon, authenticated;
grant insert, update, delete on public.assets, public.shops, public.shop_energy to authenticated;
grant select on public.shop_energy to authenticated;
grant select, insert on public.risk_acknowledgements to authenticated;
revoke all on function public.my_wallet(), public.spend_at_mall(bigint, numeric), public.merchant_accept_code(text),
  public.check_in(bigint, text), public.run_demo_payouts(date), public.admin_overview() from public, anon;
grant execute on function public.my_wallet(), public.spend_at_mall(bigint, numeric), public.merchant_accept_code(text),
  public.check_in(bigint, text), public.run_demo_payouts(date), public.admin_overview() to authenticated;
grant execute on function public.township_impact(), public.asset_progress() to anon, authenticated;
revoke all on function public.award_energy_points() from public, anon, authenticated;

-- ============ DEMO DATA (fictional shops and assets; sizes follow the business plan) ============

update public.pools set risk_text = case id
  when 'solar' then 'You are funding solar panels owned and run by the developer/JV, not renting out a roof. Payouts come from tenants'' power payments. Fixed 5% a year (minimum 4.5%), repaid monthly over 5 years. Not a deposit; not covered by PIDM.'
  when 'upgrade' then 'You are funding energy upgrades for mall shops, repaid from 80% of their bill savings over 3 years at 6.5%. If a shop closes you can lose part of your money; a reserve and the installer''s saving guarantee reduce this. Not a deposit; not covered by PIDM.'
  when 'ev' then 'High risk. Payouts come only from charging profit over 7 years; the expected return is about 6.6% a year but is NOT guaranteed. In our conservative test you get back about 60%; in a severe case you can lose most of your money. Maximum RM1,000 per resident. Not a deposit; not covered by PIDM.'
end;

update public.activities set checkin_code = case title
  when 'Recycling drop-off (per visit)' then 'RECYCLE'
  when 'Tree planting day' then 'TREE2026'
  when 'Community clean-up' then 'CLEANUP'
  when 'Used cooking oil collection' then 'UCO'
  else null end;

insert into public.assets (pool_id, name, mall_id, size_kw, funding_target, status, kwh_per_year, co2_t_per_year, note)
select a.pool_id, a.name, m.id, a.size_kw, a.target, a.status, a.kwh, a.co2, a.note
from (values
  ('solar',   'Elmina Lakeside Mall rooftop solar', 'Elmina Lakeside Mall', 320, 307200, 'running', 400000, 296.0, '320 kWp × RM3,200 × 30% residents'' share'),
  ('solar',   'KL East Mall car-park canopy solar', 'KL East Mall', 500, 480000, 'raising', 625000, 462.5, 'Fictional demo asset'),
  ('upgrade', 'Shop upgrades – batch 1 (15 shops)', 'KL East Mall', null, 300000, 'running', 396000, 293.0, '15 shops × RM20,000'),
  ('upgrade', 'Shop upgrades – batch 2 (10 shops)', 'KLGCC Mall', null, 200000, 'raising', 264000, 195.4, '10 shops × RM20,000'),
  ('ev',      'EV pilot – 1 DC 60 kW + 1 AC 22 kW', 'Elmina Lakeside Mall', 82, 45000, 'raising', null, null, 'Co-funded 50/50 with a licensed charge point operator')
) as a(pool_id, name, mall, size_kw, target, status, kwh, co2, note)
join public.malls m on m.name = a.mall;

insert into public.shops (mall_id, name, category, upgraded, upgrade_asset_id)
select m.id, s.name, s.cat, s.upg, (select id from public.assets where name = s.asset)
from (values
  ('KL East Mall', 'Kopi Hijau Café', 'F&B', true, 'Shop upgrades – batch 1 (15 shops)'),
  ('KL East Mall', 'FreshMart Mini', 'Grocery', true, 'Shop upgrades – batch 1 (15 shops)'),
  ('Elmina Lakeside Mall', 'Lakeside Books', 'Retail', false, null),
  ('KLGCC Mall', 'Green Bowl Salads', 'F&B', false, null)
) as s(mall, name, cat, upg, asset)
join public.malls m on m.name = s.mall;

insert into public.shop_energy (shop_id, month, kwh, baseline_kwh, bill_rm)
select s.id, d.m, d.kwh, 9000, round(d.kwh * 0.4540, 2)
from public.shops s
cross join (values (date '2026-07-01', 6900), (date '2026-08-01', 6750), (date '2026-09-01', 6800)) as d(m, kwh)
where s.upgraded;
