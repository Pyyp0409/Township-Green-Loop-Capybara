-- ============================================================================
-- Township Green Loop — v3: residents and supporters
-- Run ONCE in Supabase > SQL Editor, AFTER setup_v2.sql.
-- Safe to re-run.
--
-- Why: the app was only open to people who live in the township, which shuts
-- out anyone who wants to fund the township's solar from elsewhere. Both are
-- now welcome, but the parts that only work on the ground — checking in to a
-- recycling drop-off or a clean-up — stay with the people who are there.
--
--   resident  — lives in the township: everything
--   supporter — funds it from elsewhere: invest, wallet, points, community,
--               but no activity check-ins
-- ============================================================================

alter table public.profiles
  add column if not exists membership text not null default 'resident'
    check (membership in ('resident', 'supporter'));

comment on column public.profiles.membership is
  'resident = lives in the township; supporter = invests from elsewhere';

-- Everyone already in the database lives here.
update public.profiles set membership = 'resident' where membership is null;

-- A supporter sets this instead of a township.
alter table public.profiles
  add column if not exists home_city text;

-- Users may set their own membership and city, but still never their role.
grant update (full_name, township, membership, home_city) on public.profiles to authenticated;

-- Only people who are actually in the township may ask for activity points.
create or replace function public.request_checkin(
  p_activity_id bigint,
  p_code text default null,
  p_note text default null
)
returns public.checkin_requests
language plpgsql security definer set search_path = public as $fn$
declare a public.activities; m text; out_row public.checkin_requests;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select membership into m from public.profiles where id = auth.uid();
  if m = 'supporter' then
    raise exception 'Activity points are for residents who take part in person. You can still earn points by converting wallet money.';
  end if;

  select * into a from public.activities where id = p_activity_id;
  if not found then raise exception 'Activity not found'; end if;
  if a.kind = 'energy_saving' then
    raise exception 'Energy-saving points come from your bill upload';
  end if;

  if exists (select 1 from public.point_transactions
             where user_id = auth.uid() and activity_id = p_activity_id) then
    raise exception 'You have already received points for this activity';
  end if;

  insert into public.checkin_requests (user_id, activity_id, code_given, code_matched, note)
  values (
    auth.uid(),
    p_activity_id,
    nullif(upper(coalesce(p_code, '')), ''),
    case when a.checkin_code is null then null
         else upper(coalesce(p_code, '')) = upper(a.checkin_code) end,
    nullif(p_note, '')
  )
  returning * into out_row;

  return out_row;
exception when unique_violation then
  raise exception 'You have already asked to check in to this activity';
end;
$fn$;

grant execute on function public.request_checkin(bigint, text, text) to authenticated;
revoke all on function public.request_checkin(bigint, text, text) from public, anon;

-- Admin: how much of the money came from outside the township.
create or replace function public.admin_membership_split()
returns json language sql stable security definer set search_path = public as $fn$
  select json_build_object(
    'residents',  (select count(*) from public.profiles
                   where role = 'resident' and membership = 'resident'),
    'supporters', (select count(*) from public.profiles
                   where role = 'resident' and membership = 'supporter'),
    'raised_residents',  (select coalesce(sum(i.amount), 0)
                          from public.investments i
                          join public.profiles p on p.id = i.user_id
                          where i.status = 'active' and p.membership = 'resident'),
    'raised_supporters', (select coalesce(sum(i.amount), 0)
                          from public.investments i
                          join public.profiles p on p.id = i.user_id
                          where i.status = 'active' and p.membership = 'supporter')
  )
  where public.is_admin();
$fn$;

grant execute on function public.admin_membership_split() to authenticated;
revoke all on function public.admin_membership_split() from public, anon;

-- Show the membership on the admin's resident list.
-- The return type gains a column, and Postgres will not change the shape of an
-- existing function in place, so it has to be dropped first.
drop function if exists public.admin_resident_levels();
create or replace function public.admin_resident_levels()
returns table (
  user_id uuid, full_name text, township text,
  points_now int, lifetime int,
  badge_id int, badge_name text, image_path text,
  invested numeric, joined_at timestamptz,
  membership text
)
language sql stable security definer set search_path = public as $fn$
  select p.id,
         p.full_name,
         coalesce(p.township, p.home_city),
         coalesce((select sum(pt.points) from public.point_transactions pt
                   where pt.user_id = p.id), 0)::int,
         public.lifetime_points(p.id),
         top.id,
         top.name,
         top.image_path,
         coalesce((select sum(i.amount) from public.investments i
                   where i.user_id = p.id and i.status = 'active'), 0),
         p.created_at,
         p.membership
  from public.profiles p
  left join lateral (
    select b.id, b.name, b.image_path
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = p.id
    order by b.min_points desc
    limit 1
  ) top on true
  where p.role = 'resident' and public.is_admin()
  order by public.lifetime_points(p.id) desc;
$fn$;

grant execute on function public.admin_resident_levels() to authenticated;


-- ---------- one demo supporter, so the split is not empty ----------
-- Create supporter@demo.com in Authentication > Users first (password 123456),
-- then this fills in their profile and a solar investment.
do $$
declare v_sup uuid;
begin
  select id into v_sup from auth.users where email = 'supporter@demo.com';
  if v_sup is null then
    raise notice 'Skipped: create supporter@demo.com in Authentication > Users, then re-run.';
    return;
  end if;

  update public.profiles
  set full_name = 'Nurul Hidayah',
      role = 'resident',
      membership = 'supporter',
      township = null,
      home_city = 'Penang'
  where id = v_sup;

  delete from public.investments where user_id = v_sup;
  delete from public.risk_acknowledgements where user_id = v_sup;

  insert into public.risk_acknowledgements (user_id, pool_id)
  select v_sup, p.id from public.pools p on conflict do nothing;

  insert into public.investments
    (user_id, pool_id, asset_id, amount, status, created_at, pay_method, pay_ref)
  select v_sup, 'solar', a.id, 2000, 'active', now() - interval '2 months',
         'online_banking', 'Maybank2u'
  from public.assets a
  where a.pool_id = 'solar'
  order by a.id
  limit 1;

  raise notice 'Supporter demo account ready.';
end $$;

select public.admin_membership_split();
