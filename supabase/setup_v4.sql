-- ============================================================================
-- Township Green Loop — v4
-- Run ONCE in Supabase > SQL Editor, AFTER setup_v3.sql. Safe to re-run.
--
--   A. New caps from Township_Green_Loop_Business_Plan_Final
--   B. Admin can edit and remove activities
--   C. Admin can reply to feedback, and the resident sees the reply
--   D. Report exports for the admin
-- ============================================================================


-- ============ A. NEW INVESTMENT CAPS ============
-- Final plan: Solar RM2,000, Upgrades RM1,000, EV RM500 per resident.
-- These sit well inside the retail limit of RM10,000 per issuer and
-- RM50,000 per 12 months.

update public.pools set max_invest = 2000 where id = 'solar';
update public.pools set max_invest = 1000 where id = 'upgrade';
update public.pools set max_invest =  500 where id = 'ev';

update public.pools set risk_text = case id
  when 'solar' then 'You are funding solar panels owned and run by the developer/JV, not renting out a roof. Payouts come from tenants'' power payments. Fixed 5% a year (minimum 4.5%), repaid monthly over 5 years. Most you can hold: RM2,000. Your money is held in trust by a licensed market operator, never by us. Not a deposit; not covered by PIDM.'
  when 'upgrade' then 'You are funding energy upgrades for mall shops, repaid from 80% of their bill savings over 3 years at 6.5%. The installer guarantees at least RM800 a month of saving per shop. If a shop closes you can lose part of your money; a reserve and that guarantee reduce this. Most you can hold: RM1,000. Not a deposit; not covered by PIDM.'
  when 'ev' then 'High risk. Payouts come only from charging profit over 7 years; the expected return is about 6.6% a year but is NOT guaranteed. In our conservative test you get back about 60%; in a severe case you can lose most of your money. Most you can hold: RM500. Not a deposit; not covered by PIDM.'
end;

-- Demo investments were sized against the old caps, so bring them inside the
-- new ones. Without this the seeded portfolios contradict the limits on screen.
update public.investments i
set amount = least(i.amount, p.max_invest)
from public.pools p
where p.id = i.pool_id and i.amount > p.max_invest;


-- ============ B. ADMIN MANAGES ACTIVITIES ============

create or replace function public.update_activity(
  p_activity_id bigint,
  p_title text,
  p_kind text,
  p_points int,
  p_location text,
  p_checkin_code text,
  p_starts_at timestamptz default null
)
returns public.activities
language plpgsql security definer set search_path = public as $fn$
declare out_row public.activities;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_title is null or btrim(p_title) = '' then raise exception 'Enter a title'; end if;
  if p_points is null or p_points <= 0 then raise exception 'Points must be more than 0'; end if;
  if p_kind not in ('recycling', 'event', 'energy_saving') then
    raise exception 'Unknown kind';
  end if;

  update public.activities
  set title = btrim(p_title),
      kind = p_kind,
      points = p_points,
      location = nullif(btrim(coalesce(p_location, '')), ''),
      checkin_code = nullif(upper(btrim(coalesce(p_checkin_code, ''))), ''),
      starts_at = coalesce(p_starts_at, starts_at)
  where id = p_activity_id
  returning * into out_row;

  if not found then raise exception 'Activity not found'; end if;
  return out_row;
end;
$fn$;

-- Removing an activity must not silently delete points people already earned.
create or replace function public.delete_activity(p_activity_id bigint)
returns void language plpgsql security definer set search_path = public as $fn$
declare awarded int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select count(*) into awarded
  from public.point_transactions where activity_id = p_activity_id;

  if awarded > 0 then
    raise exception 'Cannot remove: % residents already earned points for this activity. Edit it instead.', awarded;
  end if;

  delete from public.checkin_requests where activity_id = p_activity_id;
  delete from public.activities where id = p_activity_id;
end;
$fn$;

grant execute on function
  public.update_activity(bigint, text, text, int, text, text, timestamptz),
  public.delete_activity(bigint) to authenticated;
revoke all on function
  public.update_activity(bigint, text, text, int, text, text, timestamptz),
  public.delete_activity(bigint) from public, anon;


-- ============ C. ADMIN REPLIES TO FEEDBACK ============

alter table public.feedback
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references public.profiles(id),
  -- which other party the admin passed it to, so the resident can see it moved
  add column if not exists routed_to text
    check (routed_to is null or routed_to in ('shop', 'developer', 'platform', 'none'));

create or replace function public.reply_to_feedback(
  p_feedback_id bigint,
  p_note text,
  p_routed_to text default 'none',
  p_status text default 'reviewed'
)
returns public.feedback
language plpgsql security definer set search_path = public as $fn$
declare out_row public.feedback;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_note is null or btrim(p_note) = '' then raise exception 'Write a reply first'; end if;
  if p_status not in ('new', 'reviewed', 'actioned') then
    raise exception 'Unknown status';
  end if;

  update public.feedback
  set admin_note = btrim(p_note),
      status = p_status,
      replied_at = now(),
      replied_by = auth.uid(),
      routed_to = nullif(p_routed_to, '')
  where id = p_feedback_id
  returning * into out_row;

  if not found then raise exception 'Feedback not found'; end if;
  return out_row;
end;
$fn$;

grant execute on function
  public.reply_to_feedback(bigint, text, text, text) to authenticated;
revoke all on function
  public.reply_to_feedback(bigint, text, text, text) from public, anon;


-- ============ D. REPORTS FOR THE ADMIN ============
-- One row per line of each report, ready to be written out as CSV.

create or replace function public.report_investments()
returns table (
  made_on date, resident text, membership text, pool text, asset text,
  amount numeric, pay_method text, status text
)
language sql stable security definer set search_path = public as $fn$
  select i.created_at::date, p.full_name, p.membership, po.name, a.name,
         i.amount, i.pay_method, i.status
  from public.investments i
  join public.profiles p on p.id = i.user_id
  join public.pools po on po.id = i.pool_id
  left join public.assets a on a.id = i.asset_id
  where public.is_admin()
  order by i.created_at desc;
$fn$;

create or replace function public.report_points()
returns table (
  happened_on date, resident text, points int, reason text
)
language sql stable security definer set search_path = public as $fn$
  select pt.created_at::date, p.full_name, pt.points, pt.reason
  from public.point_transactions pt
  join public.profiles p on p.id = pt.user_id
  where public.is_admin()
  order by pt.created_at desc;
$fn$;

create or replace function public.report_impact()
returns table (
  asset text, pool text, status text, funding_target numeric,
  raised numeric, investors bigint, kwh_per_year numeric, co2_t_per_year numeric
)
language sql stable security definer set search_path = public as $fn$
  select a.name, po.name, a.status, a.funding_target,
         coalesce(pr.raised, 0), coalesce(pr.investors, 0),
         a.kwh_per_year, a.co2_t_per_year
  from public.assets a
  join public.pools po on po.id = a.pool_id
  left join public.asset_progress() pr on pr.asset_id = a.id
  where public.is_admin()
  order by a.id;
$fn$;

create or replace function public.report_feedback()
returns table (
  sent_on date, resident text, area text, rating int,
  comment text, status text, admin_note text, routed_to text
)
language sql stable security definer set search_path = public as $fn$
  select f.created_at::date, p.full_name, f.area, f.rating,
         f.comment, f.status, f.admin_note, f.routed_to
  from public.feedback f
  join public.profiles p on p.id = f.user_id
  where public.is_admin()
  order by f.created_at desc;
$fn$;

grant execute on function public.report_investments(), public.report_points(),
  public.report_impact(), public.report_feedback() to authenticated;
revoke all on function public.report_investments(), public.report_points(),
  public.report_impact(), public.report_feedback() from public, anon;


-- ---------- check ----------
select id, name, min_invest, max_invest from public.pools order by rate;
