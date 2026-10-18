-- ============================================================================
-- Township Green Loop — v7: trends for the admin overview
-- Run ONCE in Supabase > SQL Editor, AFTER setup_v6.sql. Safe to re-run.
--
-- One row per month for the last 12, so the admin can see direction rather
-- than only today's totals.
-- ============================================================================

create or replace function public.admin_trends(p_months int default 12)
returns table (
  month date,
  label text,
  new_investments bigint,
  new_investors bigint,
  raised numeric,
  raised_solar numeric,
  raised_upgrade numeric,
  raised_ev numeric,
  cumulative_raised numeric,
  paid_out numeric,
  points_issued bigint,
  new_members bigint,
  raised_residents numeric,
  raised_supporters numeric
)
language sql stable security definer set search_path = public as $fn$
  with months as (
    select generate_series(
      date_trunc('month', current_date) - ((greatest(1, least(coalesce(p_months, 12), 24)) - 1) || ' months')::interval,
      date_trunc('month', current_date),
      interval '1 month'
    )::date as m
  ),
  inv as (
    select date_trunc('month', i.created_at)::date as m,
           count(*) as n,
           count(distinct i.user_id) as investors,
           sum(i.amount) as total,
           sum(i.amount) filter (where i.pool_id = 'solar') as solar,
           sum(i.amount) filter (where i.pool_id = 'upgrade') as upgrade,
           sum(i.amount) filter (where i.pool_id = 'ev') as ev,
           sum(i.amount) filter (where p.membership = 'resident') as residents,
           sum(i.amount) filter (where p.membership = 'supporter') as supporters
    from public.investments i
    join public.profiles p on p.id = i.user_id
    where i.status = 'active'
    group by 1
  ),
  pay as (
    select date_trunc('month', paid_at)::date as m, sum(amount) as total
    from public.payouts group by 1
  ),
  pts as (
    select date_trunc('month', created_at)::date as m, sum(points) as total
    from public.point_transactions where points > 0 group by 1
  ),
  mem as (
    select date_trunc('month', created_at)::date as m, count(*) as n
    from public.profiles where role = 'resident' group by 1
  )
  select months.m,
         to_char(months.m, 'Mon YY'),
         coalesce(inv.n, 0),
         coalesce(inv.investors, 0),
         coalesce(inv.total, 0),
         coalesce(inv.solar, 0),
         coalesce(inv.upgrade, 0),
         coalesce(inv.ev, 0),
         -- running total, so the line climbs instead of bouncing
         sum(coalesce(inv.total, 0)) over (order by months.m),
         coalesce(pay.total, 0),
         coalesce(pts.total, 0)::bigint,
         coalesce(mem.n, 0),
         coalesce(inv.residents, 0),
         coalesce(inv.supporters, 0)
  from months
  left join inv on inv.m = months.m
  left join pay on pay.m = months.m
  left join pts on pts.m = months.m
  left join mem on mem.m = months.m
  where public.is_admin()
  order by months.m;
$fn$;

grant execute on function public.admin_trends(int) to authenticated;
revoke all on function public.admin_trends(int) from public, anon;


-- Where each pool stands right now: raised against target, and who funded it.
create or replace function public.pool_totals()
returns table (
  pool_id text, pool_name text, risk text,
  target numeric, raised numeric, investors bigint,
  resident_amount numeric, supporter_amount numeric
)
language sql stable security definer set search_path = public as $fn$
  select po.id,
         po.name,
         po.risk,
         coalesce((select sum(a.funding_target) from public.assets a
                   where a.pool_id = po.id), 0),
         coalesce(sum(i.amount), 0),
         count(distinct i.user_id),
         coalesce(sum(i.amount) filter (where pr.membership = 'resident'), 0),
         coalesce(sum(i.amount) filter (where pr.membership = 'supporter'), 0)
  from public.pools po
  left join public.investments i on i.pool_id = po.id and i.status = 'active'
  left join public.profiles pr on pr.id = i.user_id
  group by po.id, po.name, po.risk, po.rate
  order by po.rate;
$fn$;

grant execute on function public.pool_totals() to authenticated;

-- ---------- check ----------
select label, new_investments, raised, cumulative_raised, paid_out, points_issued
from public.admin_trends(12);
