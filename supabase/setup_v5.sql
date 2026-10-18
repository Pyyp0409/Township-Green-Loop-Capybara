-- ============================================================================
-- Township Green Loop — v5
-- Run ONCE in Supabase > SQL Editor, AFTER setup_v4.sql. Safe to re-run.
--
-- Brings the database in line with Business_Plan_Final Ver:
--   A. Badges reward green actions only, never money
--   B. Resident priority on every raise, recorded so the app can show it
--   C. One top investor demo account, for checking every screen at once
-- ============================================================================


-- ============ 0. SAFETY NET ============
-- v4 adds these. If v4 was skipped or stopped early, add them here so this
-- file still runs. Harmless when v4 has already been applied.

alter table public.feedback
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references public.profiles(id),
  add column if not exists routed_to text
    check (routed_to is null or routed_to in ('shop', 'developer', 'platform', 'none'));

alter table public.investments
  add column if not exists pay_method text
    check (pay_method in ('card', 'online_banking', 'ewallet')),
  add column if not exists pay_ref text;

alter table public.payouts
  add column if not exists pay_method text
    check (pay_method in ('bank_transfer', 'ewallet', 'points'));

-- The caps from Business_Plan_Final, in case v4 did not get this far.
update public.pools set max_invest = 2000 where id = 'solar'   and max_invest <> 2000;
update public.pools set max_invest = 1000 where id = 'upgrade' and max_invest <> 1000;
update public.pools set max_invest =  500 where id = 'ev'      and max_invest <>  500;

update public.investments i
set amount = least(i.amount, p.max_invest)
from public.pools p
where p.id = i.pool_id and i.amount > p.max_invest;


-- ============ A. BADGES REWARD GREEN ACTIONS ONLY ============
-- Plan rule: "Badges reward green actions only (recycling, events, energy
-- saving), never the amount invested." Converting wallet money into points is
-- buying points, so it must not climb the badge ladder.

alter table public.point_transactions
  add column if not exists counts_for_badge boolean not null default true;

comment on column public.point_transactions.counts_for_badge is
  'false for points bought by converting wallet money — those do not earn badges';

-- Anything already created by a conversion should not count.
update public.point_transactions
set counts_for_badge = false
where points > 0 and reason like 'Converted RM%';

-- Points that climb the ladder: green actions only.
create or replace function public.lifetime_points(p_user uuid)
returns int language sql stable security definer set search_path = public as $fn$
  select coalesce(sum(points), 0)::int
  from public.point_transactions
  where user_id = p_user and points > 0 and counts_for_badge;
$fn$;

-- The badge trigger must ignore bought points too.
create or replace function public.award_badges()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare total int;
begin
  if new.points <= 0 or not new.counts_for_badge then return new; end if;

  select public.lifetime_points(new.user_id) into total;

  insert into public.user_badges (user_id, badge_id)
  select new.user_id, b.id
  from public.badges b
  where b.min_points <= total
  on conflict (user_id, badge_id) do nothing;

  return new;
end;
$fn$;

-- Converting wallet money gives spendable points, but not badge progress.
create or replace function public.convert_wallet_to_points(p_amount numeric)
returns int language plpgsql security definer set search_path = public as $fn$
declare bal numeric; rate int; pts int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than 0';
  end if;

  select (value #>> '{}')::int into rate from public.app_settings where key = 'points_per_rm';
  rate := coalesce(rate, 20);

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select coalesce(sum(amount), 0) into bal
  from public.wallet_transactions where user_id = auth.uid();

  if bal < p_amount then
    raise exception 'Not enough in wallet (have RM%, need RM%)', bal, p_amount;
  end if;

  pts := floor(p_amount * rate);

  insert into public.wallet_transactions (user_id, amount, kind, note)
  values (auth.uid(), -p_amount, 'points_conversion',
          'Converted to ' || pts || ' points');

  insert into public.point_transactions (user_id, points, reason, counts_for_badge)
  values (auth.uid(), pts,
          'Converted RM' || to_char(p_amount, 'FM999999990.00') || ' from wallet',
          false);

  return pts;
end;
$fn$;

-- Badges awarded under the old rule may no longer be earned. Clear any that
-- the green-action total no longer supports, so the ladder tells the truth.
delete from public.user_badges ub
using public.badges b
where b.id = ub.badge_id
  and b.min_points > public.lifetime_points(ub.user_id);


-- ============ B. RESIDENT PRIORITY ON EVERY RAISE ============
-- Plan rule: "Residents get the first 14 days of every raise and at least 70%
-- of each pool." Stored as settings so the app can state it on screen.

insert into public.app_settings (key, value) values
  ('resident_priority_days', '14'::jsonb),
  ('resident_minimum_share', '0.70'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- How much of each pool residents hold, so the rule can be shown and watched.
create or replace function public.resident_share()
returns table (pool_id text, pool_name text, resident_amount numeric,
               supporter_amount numeric, resident_share numeric)
language sql stable security definer set search_path = public as $fn$
  select po.id,
         po.name,
         coalesce(sum(i.amount) filter (where pr.membership = 'resident'), 0),
         coalesce(sum(i.amount) filter (where pr.membership = 'supporter'), 0),
         case when coalesce(sum(i.amount), 0) = 0 then 1
              else round(
                coalesce(sum(i.amount) filter (where pr.membership = 'resident'), 0)
                / sum(i.amount), 4)
         end
  from public.pools po
  left join public.investments i on i.pool_id = po.id and i.status = 'active'
  left join public.profiles pr on pr.id = i.user_id
  group by po.id, po.name
  order by po.rate;
$fn$;

grant execute on function public.resident_share() to authenticated;


-- ============ C. TOP INVESTOR DEMO ACCOUNT ============
-- STEP 1: Authentication > Users > Add user
--         zara@demo.com, password 123456, tick "Auto Confirm User"
-- STEP 2: run this file.
--
-- Zara holds the maximum in all three pools (RM2,000 + RM1,000 + RM500 =
-- RM3,500, the cap across all pools), has every badge, and has something on
-- every screen: payouts, a mall credit, bills, points history, an approved and
-- a pending check-in, feedback with a reply, and a community post.

do $$
declare
  v_zara uuid;
  v_inv  bigint;
  v_mall bigint;
  v_act  bigint;
begin
  select id into v_zara from auth.users where email = 'zara@demo.com';
  if v_zara is null then
    raise notice 'Skipped: create zara@demo.com in Authentication > Users, then re-run.';
    return;
  end if;

  update public.profiles
  set full_name = 'Zara Abdullah',
      role = 'resident',
      membership = 'resident',
      township = 'City of Elmina',
      home_city = null
  where id = v_zara;

  -- Clear anything from a previous run so this file can be repeated.
  delete from public.community_reactions   where user_id = v_zara;
  delete from public.community_comments    where author_id = v_zara;
  delete from public.community_posts       where author_id = v_zara;
  delete from public.feedback              where user_id = v_zara;
  delete from public.checkin_requests      where user_id = v_zara;
  delete from public.redemptions           where user_id = v_zara;
  delete from public.user_badges           where user_id = v_zara;
  delete from public.point_transactions    where user_id = v_zara;
  delete from public.mall_credits          where user_id = v_zara;
  delete from public.wallet_transactions   where user_id = v_zara;
  delete from public.payouts               where user_id = v_zara;
  delete from public.investments           where user_id = v_zara;
  delete from public.energy_bills          where user_id = v_zara;
  delete from public.risk_acknowledgements where user_id = v_zara;
  delete from public.payout_preferences    where user_id = v_zara;

  -- ---------- risk acknowledged for all three pools ----------
  insert into public.risk_acknowledgements (user_id, pool_id)
  select v_zara, p.id from public.pools p
  on conflict do nothing;

  -- ---------- the maximum in every pool, each a different payment method ----
  insert into public.investments
    (user_id, pool_id, asset_id, amount, status, created_at, pay_method, pay_ref)
  select v_zara, x.pool, a.id, x.amt, 'active', now() - (x.ago || ' months')::interval,
         x.method, x.ref
  from (values
    ('solar',   2000::numeric, 14, 'online_banking', 'Maybank2u'),
    ('upgrade', 1000::numeric, 10, 'card',           'Visa .... 4242'),
    ('ev',       500::numeric,  7, 'ewallet',        'Touch n Go')
  ) as x(pool, amt, ago, method, ref)
  cross join lateral (
    select a2.id from public.assets a2
    where a2.pool_id = x.pool and a2.status <> 'repaid'
    order by a2.id limit 1
  ) a;

  -- ---------- six months of payouts, landing in the wallet ----------
  for v_inv in select id from public.investments where user_id = v_zara loop
    insert into public.payouts (investment_id, user_id, amount, kind, paid_at, pay_method)
    select v_inv, v_zara,
           round((select amount from public.investments where id = v_inv) * 0.0042, 2),
           'profit',
           (date_trunc('month', current_date) - (g || ' months')::interval)::date,
           'bank_transfer'
    from generate_series(1, 6) g;

    insert into public.payouts (investment_id, user_id, amount, kind, paid_at, pay_method)
    select v_inv, v_zara,
           round((select amount from public.investments where id = v_inv) * 0.0150, 2),
           'principal',
           (date_trunc('month', current_date) - (g || ' months')::interval)::date,
           'bank_transfer'
    from generate_series(1, 6) g;
  end loop;

  insert into public.wallet_transactions (user_id, amount, kind, note, created_at)
  select v_zara, sum(p.amount), 'payout',
         'Monthly payout ' || to_char(p.paid_at, 'Mon YYYY'), p.paid_at::timestamptz
  from public.payouts p
  where p.user_id = v_zara
  group by p.paid_at;

  -- ---------- an unused mall credit, so the QR screen has something ----------
  select id into v_mall from public.malls where name = 'Elmina Lakeside Mall';
  insert into public.wallet_transactions (user_id, amount, kind, note)
  values (v_zara, -40, 'mall_spend', 'Mall credit at Elmina Lakeside Mall');
  insert into public.mall_credits (user_id, mall_id, wallet_amount, bonus)
  values (v_zara, v_mall, 40, 4);

  -- ---------- green-action points: enough for Planet Hero (6,000) ----------
  insert into public.point_transactions (user_id, points, reason, created_at, counts_for_badge)
  select v_zara, g.pts, g.why, now() - (g.ago || ' days')::interval, true
  from (values
    ( 150, 'energy_saving: Sep used 15% less', 12),
    ( 150, 'energy_saving: Aug used 11% less', 42),
    ( 100, 'event: Tree planting day', 66),
    (  80, 'event: Community clean-up', 88),
    (  30, 'recycling: Used cooking oil collection', 104),
    (  20, 'recycling: Recycling drop-off', 119),
    (7000, 'Carried over from the township pilot programme', 240)
  ) as g(pts, why, ago);

  -- a spend, so the history shows both directions
  insert into public.point_transactions (user_id, points, reason, created_at, counts_for_badge)
  values (v_zara, -200, 'Redeemed: RM10 food court voucher', now() - interval '9 days', true);

  -- bought points do NOT count towards badges
  insert into public.point_transactions (user_id, points, reason, created_at, counts_for_badge)
  values (v_zara, 400, 'Converted RM20.00 from wallet', now() - interval '5 days', false);
  insert into public.wallet_transactions (user_id, amount, kind, note, created_at)
  values (v_zara, -20, 'points_conversion', 'Converted to 400 points', now() - interval '5 days');

  -- ---------- every badge, with the top one left to celebrate ----------
  insert into public.user_badges (user_id, badge_id)
  select v_zara, b.id from public.badges b
  where b.min_points <= public.lifetime_points(v_zara)
  on conflict do nothing;

  update public.user_badges set celebrated = true  where user_id = v_zara;
  update public.user_badges set celebrated = false
  where user_id = v_zara and badge_id = (select max(id) from public.badges);

  -- ---------- four months of bills, the last one well down ----------
  insert into public.energy_bills (user_id, bill_month, kwh, amount_rm)
  select v_zara,
         (date_trunc('month', current_date) - (x.ago || ' months')::interval)::date,
         x.kwh, round(x.kwh * 0.454, 2)
  from (values (4, 512::numeric), (3, 488::numeric), (2, 455::numeric), (1, 384::numeric))
    as x(ago, kwh)
  on conflict (user_id, bill_month) do nothing;

  -- ---------- one approved check-in and one still waiting ----------
  select id into v_act from public.activities where title like 'Tree planting%' limit 1;
  if v_act is not null then
    insert into public.checkin_requests
      (user_id, activity_id, code_given, code_matched, note, status,
       reviewed_at, created_at)
    values (v_zara, v_act, 'TREE2026', true, 'Brought my neighbours along.',
            'approved', now() - interval '60 days', now() - interval '66 days')
    on conflict do nothing;
  end if;

  select id into v_act from public.activities where title like 'Used cooking oil%' limit 1;
  if v_act is not null then
    insert into public.checkin_requests
      (user_id, activity_id, code_given, code_matched, note, created_at)
    values (v_zara, v_act, 'UCO', true, 'Dropped off two bottles this morning.',
            now() - interval '3 hours')
    on conflict do nothing;
  end if;

  -- ---------- payout preference ----------
  insert into public.payout_preferences (user_id, method, account_ref)
  values (v_zara, 'bank_transfer', 'Maybank .... 3307')
  on conflict (user_id) do update
    set method = excluded.method, account_ref = excluded.account_ref;

  -- ---------- feedback that already has a reply ----------
  insert into public.feedback
    (user_id, area, rating, comment, status, admin_note, routed_to, replied_at, created_at)
  values
    (v_zara, 'investment', 5,
     'Seeing my carbon share before I confirm is the part I like most.',
     'actioned', 'Thank you. We are adding the same figure to the portfolio screen.',
     'none', now() - interval '2 days', now() - interval '4 days'),
    (v_zara, 'rewards', 3,
     'The RM10 voucher sold out before I could redeem it.',
     'reviewed', 'Noted. We have asked the mall to raise the stock.',
     'shop', now() - interval '1 day', now() - interval '6 days');

  -- ---------- a community post, so the top badge shows in the feed ----------
  insert into public.community_posts (author_id, body, tag, created_at)
  values (v_zara,
    'Four years of recycling with my two girls and the badge finally turned gold. If you are just starting, the drop-off corner at Elmina Lakeside takes five minutes on the way to the car park.',
    'general', now() - interval '8 hours');

  raise notice 'Zara Abdullah is ready: RM3,500 invested, every badge, data on every screen.';
end $$;


-- ---------- check ----------
select p.full_name,
       p.membership,
       public.lifetime_points(p.id) as green_points,
       (select count(*) from public.user_badges ub where ub.user_id = p.id) as badges,
       coalesce((select sum(i.amount) from public.investments i
                 where i.user_id = p.id and i.status = 'active'), 0) as invested
from public.profiles p
where p.role = 'resident'
order by public.lifetime_points(p.id) desc;

select * from public.resident_share();
