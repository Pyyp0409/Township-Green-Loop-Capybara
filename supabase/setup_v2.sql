-- ============================================================================
-- Township Green Loop — v2 additions
-- Run ONCE in Supabase > SQL Editor, AFTER setup_all.sql.
-- Safe to re-run: every statement is guarded (if not exists / on conflict).
--
-- What this adds
--   A. Settings (points per RM, conversion rate)
--   B. Badges and levels, awarded automatically from points
--   C. Check-in approval: resident requests, admin verifies, then points
--   D. Payment and payout methods (card / online banking / e-wallet / points)
--   E. Feedback from residents, with ratings per area
--   F. Community: posts, comments, reactions, reports — all three roles
--   G. Promotions: admin proposes, the shop accepts before it goes live
--   H. Rewards: general vs mall-specific, and timed offers
--   I. Point rules, for the "how to earn points" table
-- ============================================================================


-- ============ A. SETTINGS ============

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  -- 20 points per RM1 — matches the reward catalogue (RM10 voucher = 200 points)
  ('points_per_rm', '20'::jsonb),
  ('wallet_to_points_enabled', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "settings read" on public.app_settings;
create policy "settings read" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "admin settings write" on public.app_settings;
create policy "admin settings write" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;


-- ============ B. BADGES AND LEVELS ============

create table if not exists public.badges (
  id int primary key,                      -- 1 = lowest level
  name text not null,
  min_points int not null,
  description text not null,
  image_path text not null                 -- served from /badges/<file>
);

insert into public.badges (id, name, min_points, description, image_path) values
  (1, 'Seedling', 100,
   'Took your first green steps: a few recycling drop-offs or your first event.',
   '/badges/seedling.png'),
  (2, 'Green Neighbour', 500,
   'A regular face at recycling corners and community events.',
   '/badges/green-neighbour.png'),
  (3, 'Eco Champion', 1500,
   'Recycles, joins events and cuts home energy month after month.',
   '/badges/eco-champion.png'),
  (4, 'Township Guardian', 3000,
   'One of the township''s most active members for nearly a year.',
   '/badges/township-guardian.png'),
  (5, 'Planet Hero', 6000,
   'Long-term green leader who sets the example for the whole community.',
   '/badges/planet-hero.png')
on conflict (id) do update
  set name = excluded.name,
      min_points = excluded.min_points,
      description = excluded.description,
      image_path = excluded.image_path;

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id int not null references public.badges(id),
  awarded_at timestamptz not null default now(),
  -- false until the app has shown the celebration once
  celebrated boolean not null default false,
  primary key (user_id, badge_id)
);
create index if not exists user_badges_user_idx on public.user_badges (user_id);

-- Lifetime points earned (badges never go down when points are spent).
create or replace function public.lifetime_points(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int
  from public.point_transactions
  where user_id = p_user and points > 0;
$$;

-- Award every badge the user has reached. Runs after any points are earned.
create or replace function public.award_badges()
returns trigger language plpgsql security definer set search_path = public as $$
declare total int;
begin
  if new.points <= 0 then return new; end if;

  select public.lifetime_points(new.user_id) into total;

  insert into public.user_badges (user_id, badge_id)
  select new.user_id, b.id
  from public.badges b
  where b.min_points <= total
  on conflict (user_id, badge_id) do nothing;

  return new;
end;
$$;

drop trigger if exists point_tx_award_badges on public.point_transactions;
create trigger point_tx_award_badges after insert on public.point_transactions
  for each row execute function public.award_badges();

-- The signed-in user's badges, newest first.
create or replace function public.my_badges()
returns table (
  badge_id int, name text, min_points int, description text,
  image_path text, awarded_at timestamptz, celebrated boolean
)
language sql stable security invoker set search_path = public as $$
  select b.id, b.name, b.min_points, b.description, b.image_path,
         ub.awarded_at, ub.celebrated
  from public.user_badges ub
  join public.badges b on b.id = ub.badge_id
  where ub.user_id = auth.uid()
  order by b.min_points desc;
$$;

-- Fireworks: returns badges earned but not yet celebrated, then marks them.
create or replace function public.claim_badge_celebrations()
returns table (badge_id int, name text, description text, image_path text)
language plpgsql security invoker set search_path = public as $$
begin
  return query
  with fresh as (
    update public.user_badges ub
    set celebrated = true
    where ub.user_id = auth.uid() and ub.celebrated = false
    returning ub.badge_id
  )
  select b.id, b.name, b.description, b.image_path
  from fresh join public.badges b on b.id = fresh.badge_id
  order by b.min_points;
end;
$$;

-- Admin: every resident with their level, for monitoring and targeting.
create or replace function public.admin_resident_levels()
returns table (
  user_id uuid, full_name text, township text,
  points_now int, lifetime int,
  badge_id int, badge_name text, image_path text,
  invested numeric, joined_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id,
         p.full_name,
         p.township,
         coalesce((select sum(pt.points) from public.point_transactions pt
                   where pt.user_id = p.id), 0)::int,
         public.lifetime_points(p.id),
         top.id,
         top.name,
         top.image_path,
         coalesce((select sum(i.amount) from public.investments i
                   where i.user_id = p.id and i.status = 'active'), 0),
         p.created_at
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
$$;

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "badges read" on public.badges;
create policy "badges read" on public.badges
  for select to anon, authenticated using (true);

drop policy if exists "own badges read" on public.user_badges;
create policy "own badges read" on public.user_badges
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "own badges update" on public.user_badges;
create policy "own badges update" on public.user_badges
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.badges to anon, authenticated;
grant select, update on public.user_badges to authenticated;

revoke all on function public.award_badges() from public, anon, authenticated;
grant execute on function public.my_badges(), public.claim_badge_celebrations(),
  public.lifetime_points(uuid) to authenticated;
grant execute on function public.admin_resident_levels() to authenticated;


-- ============ C. CHECK-IN APPROVAL ============
-- A code on a poster can be copied and passed around, so a code alone no longer
-- awards points. The resident asks to check in; an admin confirms they were
-- actually there; only then are the points written.

create table if not exists public.checkin_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id bigint not null references public.activities(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  code_given text,                  -- what the resident typed, for the admin to see
  code_matched boolean,             -- did it match the poster code?
  note text,                        -- resident's own note
  proof_path text,                  -- optional photo in the 'proofs' bucket
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_reason text,
  -- one open or approved request per activity per resident
  unique (user_id, activity_id)
);
create index if not exists checkin_requests_status_idx
  on public.checkin_requests (status, created_at);

-- Resident asks to check in. The code is optional evidence, not a key.
create or replace function public.request_checkin(
  p_activity_id bigint,
  p_code text default null,
  p_note text default null
)
returns public.checkin_requests
language plpgsql security definer set search_path = public as $$
declare a public.activities; out_row public.checkin_requests;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

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
$$;

-- Admin confirms the resident was really there, and the points are written.
create or replace function public.review_checkin(
  p_request_id bigint,
  p_approve boolean,
  p_reason text default null
)
returns public.checkin_requests
language plpgsql security definer set search_path = public as $$
declare r public.checkin_requests; a public.activities; out_row public.checkin_requests;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select * into r from public.checkin_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'This request was already reviewed'; end if;

  select * into a from public.activities where id = r.activity_id;

  if p_approve then
    insert into public.point_transactions (user_id, points, reason, activity_id)
    values (r.user_id, a.points, a.kind || ': ' || a.title, a.id)
    on conflict do nothing;
  end if;

  update public.checkin_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_reason = nullif(p_reason, '')
  where id = p_request_id
  returning * into out_row;

  return out_row;
end;
$$;

-- Admin queue, with the resident's name and the activity attached.
create or replace function public.admin_checkin_queue()
returns table (
  id bigint, user_id uuid, full_name text, activity_id bigint,
  activity_title text, points int, location text,
  code_given text, code_matched boolean, note text, proof_path text,
  status text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, p.full_name, c.activity_id, a.title, a.points, a.location,
         c.code_given, c.code_matched, c.note, c.proof_path, c.status, c.created_at
  from public.checkin_requests c
  join public.profiles p on p.id = c.user_id
  join public.activities a on a.id = c.activity_id
  where public.is_admin()
  order by (c.status = 'pending') desc, c.created_at desc;
$$;

alter table public.checkin_requests enable row level security;

drop policy if exists "own checkin read" on public.checkin_requests;
create policy "own checkin read" on public.checkin_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

grant select on public.checkin_requests to authenticated;
grant execute on function public.request_checkin(bigint, text, text),
  public.review_checkin(bigint, boolean, text),
  public.admin_checkin_queue() to authenticated;
revoke all on function public.request_checkin(bigint, text, text),
  public.review_checkin(bigint, boolean, text),
  public.admin_checkin_queue() from public, anon;

-- Private bucket for optional check-in photos, same <user_id>/<file> rule.
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
on conflict (id) do nothing;

drop policy if exists "own proof read" on storage.objects;
create policy "own proof read" on storage.objects for select to authenticated
  using (bucket_id = 'proofs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "own proof upload" on storage.objects;
create policy "own proof upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============ D. PAYMENT AND PAYOUT METHODS ============
-- Demo only: no card number, CVV or bank credential is ever stored. We keep a
-- masked label so the screens feel real and the admin can reconcile.

alter table public.investments
  add column if not exists pay_method text
    check (pay_method in ('card', 'online_banking', 'ewallet')),
  add column if not exists pay_ref text;          -- e.g. 'Visa •••• 4242'

alter table public.payouts
  add column if not exists pay_method text
    check (pay_method in ('bank_transfer', 'ewallet', 'points'));

-- Where this resident wants their money back.
create table if not exists public.payout_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer', 'ewallet', 'points')),
  account_ref text,                               -- masked, e.g. 'Maybank •••• 8891'
  updated_at timestamptz not null default now()
);

-- Wallet money may also leave as points. Widen the kind check.
alter table public.wallet_transactions drop constraint if exists wallet_transactions_kind_check;
alter table public.wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('payout', 'mall_spend', 'withdrawal', 'points_conversion', 'top_up'));

-- Turn wallet ringgit into points. Points can only be bought this way —
-- points never turn back into money.
create or replace function public.convert_wallet_to_points(p_amount numeric)
returns int language plpgsql security definer set search_path = public as $$
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

  insert into public.point_transactions (user_id, points, reason)
  values (auth.uid(), pts, 'Converted RM' || to_char(p_amount, 'FM999999990.00') || ' from wallet');

  return pts;
end;
$$;

-- Save how I want to be paid.
create or replace function public.set_payout_preference(p_method text, p_ref text default null)
returns public.payout_preferences
language plpgsql security definer set search_path = public as $$
declare out_row public.payout_preferences;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_method not in ('bank_transfer', 'ewallet', 'points') then
    raise exception 'Unknown payout method';
  end if;

  insert into public.payout_preferences (user_id, method, account_ref)
  values (auth.uid(), p_method, nullif(p_ref, ''))
  on conflict (user_id) do update
    set method = excluded.method,
        account_ref = excluded.account_ref,
        updated_at = now()
  returning * into out_row;

  return out_row;
end;
$$;

alter table public.payout_preferences enable row level security;

drop policy if exists "own payout pref" on public.payout_preferences;
create policy "own payout pref" on public.payout_preferences
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

grant select on public.payout_preferences to authenticated;
grant execute on function public.convert_wallet_to_points(numeric),
  public.set_payout_preference(text, text) to authenticated;
revoke all on function public.convert_wallet_to_points(numeric),
  public.set_payout_preference(text, text) from public, anon;


-- ============ E. FEEDBACK ============

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  area text not null check (area in
    ('investment', 'activities', 'points', 'rewards', 'wallet', 'community', 'app')),
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'actioned')),
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_area_idx on public.feedback (area, created_at desc);

-- Average rating and count per area, for the admin chart.
create or replace function public.admin_feedback_summary()
returns table (area text, responses bigint, avg_rating numeric, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.area, count(*), round(avg(f.rating)::numeric, 2), max(f.created_at)
  from public.feedback f
  where public.is_admin()
  group by f.area
  order by avg(f.rating) asc;
$$;

alter table public.feedback enable row level security;

drop policy if exists "own feedback read" on public.feedback;
create policy "own feedback read" on public.feedback
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "own feedback insert" on public.feedback;
create policy "own feedback insert" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "admin feedback update" on public.feedback;
create policy "admin feedback update" on public.feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.feedback to authenticated;
grant update on public.feedback to authenticated;
grant execute on function public.admin_feedback_summary() to authenticated;
revoke all on function public.admin_feedback_summary() from public, anon;


-- ============ F. COMMUNITY ============
-- One shared space for residents, merchants and admins. Each role shows its
-- own icon. Admins can pin, hide and post announcements.

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  tag text not null default 'general'
    check (tag in ('general', 'question', 'guidance', 'announcement', 'event')),
  anonymous boolean not null default false,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  pinned boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now()
);
create index if not exists community_posts_feed_idx
  on public.community_posts (status, pinned desc, created_at desc);

create table if not exists public.community_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 1000),
  anonymous boolean not null default false,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

create table if not exists public.community_reactions (
  post_id bigint not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like', 'support', 'celebrate')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  post_id bigint references public.community_posts(id) on delete cascade,
  comment_id bigint references public.community_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

-- The feed, with the author's role, badge and reaction counts already joined.
-- Anonymous posts never leak the author's name (the id stays, for moderation).
create or replace function public.community_feed(p_limit int default 30, p_tag text default null)
returns table (
  id bigint, body text, tag text, pinned boolean, created_at timestamptz,
  author_id uuid, author_name text, author_role text,
  badge_name text, badge_image text,
  likes bigint, supports bigint, celebrates bigint,
  comment_count bigint, my_reaction text
)
language sql stable security definer set search_path = public as $fn$
  select
    p.id,
    p.body,
    p.tag,
    p.pinned,
    p.created_at,
    case when p.anonymous and not public.is_admin() then null else p.author_id end,
    case when p.anonymous then 'Anonymous' else coalesce(pr.full_name, 'Member') end,
    pr.role,
    case when p.anonymous then null else top.name end,
    case when p.anonymous then null else top.image_path end,
    (select count(*) from public.community_reactions r where r.post_id = p.id and r.kind = 'like'),
    (select count(*) from public.community_reactions r where r.post_id = p.id and r.kind = 'support'),
    (select count(*) from public.community_reactions r where r.post_id = p.id and r.kind = 'celebrate'),
    (select count(*) from public.community_comments c
      where c.post_id = p.id and c.status = 'visible'),
    (select r.kind from public.community_reactions r
      where r.post_id = p.id and r.user_id = auth.uid() limit 1)
  from public.community_posts p
  join public.profiles pr on pr.id = p.author_id
  left join lateral (
    select b.name, b.image_path
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = p.author_id
    order by b.min_points desc
    limit 1
  ) top on true
  where (p.status = 'visible' or public.is_admin())
    and (p_tag is null or p.tag = p_tag)
  order by p.pinned desc, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$fn$;

create or replace function public.post_comments(p_post_id bigint)
returns table (
  id bigint, body text, created_at timestamptz,
  author_name text, author_role text, badge_image text
)
language sql stable security definer set search_path = public as $fn$
  select c.id, c.body, c.created_at,
         case when c.anonymous then 'Anonymous' else coalesce(pr.full_name, 'Member') end,
         pr.role,
         case when c.anonymous then null else top.image_path end
  from public.community_comments c
  join public.profiles pr on pr.id = c.author_id
  left join lateral (
    select b.image_path
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = c.author_id
    order by b.min_points desc limit 1
  ) top on true
  where c.post_id = p_post_id and (c.status = 'visible' or public.is_admin())
  order by c.created_at;
$fn$;

-- One reaction per person per post: picking a new one replaces the old.
create or replace function public.react_to_post(p_post_id bigint, p_kind text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  delete from public.community_reactions
  where post_id = p_post_id and user_id = auth.uid();

  if p_kind is not null and p_kind <> '' then
    insert into public.community_reactions (post_id, user_id, kind)
    values (p_post_id, auth.uid(), p_kind)
    on conflict do nothing;
  end if;
end;
$fn$;

-- Admin moderation: hide a post or comment, or pin it to the top.
create or replace function public.moderate_post(
  p_post_id bigint, p_action text, p_reason text default null
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  if p_action = 'hide' then
    update public.community_posts
    set status = 'hidden', hidden_reason = nullif(p_reason, '') where id = p_post_id;
  elsif p_action = 'show' then
    update public.community_posts
    set status = 'visible', hidden_reason = null where id = p_post_id;
  elsif p_action = 'remove' then
    update public.community_posts
    set status = 'removed', hidden_reason = nullif(p_reason, '') where id = p_post_id;
  elsif p_action = 'pin' then
    update public.community_posts set pinned = true where id = p_post_id;
  elsif p_action = 'unpin' then
    update public.community_posts set pinned = false where id = p_post_id;
  else
    raise exception 'Unknown action';
  end if;

  update public.community_reports set status = 'actioned'
  where post_id = p_post_id and status = 'open';
end;
$fn$;

create or replace function public.moderate_comment(
  p_comment_id bigint, p_action text, p_reason text default null
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  if p_action = 'hide' then
    update public.community_comments set status = 'hidden' where id = p_comment_id;
  elsif p_action = 'show' then
    update public.community_comments set status = 'visible' where id = p_comment_id;
  elsif p_action = 'remove' then
    update public.community_comments set status = 'removed' where id = p_comment_id;
  else
    raise exception 'Unknown action';
  end if;

  update public.community_reports set status = 'actioned'
  where comment_id = p_comment_id and status = 'open';
end;
$fn$;

-- Admin report queue, with the reported text attached.
create or replace function public.admin_reports()
returns table (
  id bigint, post_id bigint, comment_id bigint, reason text, status text,
  created_at timestamptz, reporter_name text, body text, author_name text
)
language sql stable security definer set search_path = public as $fn$
  select r.id, r.post_id, r.comment_id, r.reason, r.status, r.created_at,
         rep.full_name,
         coalesce(p.body, c.body),
         coalesce(pa.full_name, ca.full_name)
  from public.community_reports r
  join public.profiles rep on rep.id = r.reporter_id
  left join public.community_posts p on p.id = r.post_id
  left join public.profiles pa on pa.id = p.author_id
  left join public.community_comments c on c.id = r.comment_id
  left join public.profiles ca on ca.id = c.author_id
  where public.is_admin()
  order by (r.status = 'open') desc, r.created_at desc;
$fn$;

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists "community posts read" on public.community_posts;
create policy "community posts read" on public.community_posts
  for select to authenticated using (status = 'visible' or public.is_admin());

drop policy if exists "community posts insert" on public.community_posts;
create policy "community posts insert" on public.community_posts
  for insert to authenticated
  with check (author_id = auth.uid() and (tag <> 'announcement' or public.is_admin()));

drop policy if exists "own post delete" on public.community_posts;
create policy "own post delete" on public.community_posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "community comments read" on public.community_comments;
create policy "community comments read" on public.community_comments
  for select to authenticated using (status = 'visible' or public.is_admin());

drop policy if exists "community comments insert" on public.community_comments;
create policy "community comments insert" on public.community_comments
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "own comment delete" on public.community_comments;
create policy "own comment delete" on public.community_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "reactions read" on public.community_reactions;
create policy "reactions read" on public.community_reactions
  for select to authenticated using (true);

drop policy if exists "reports insert" on public.community_reports;
create policy "reports insert" on public.community_reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "reports read" on public.community_reports;
create policy "reports read" on public.community_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.community_posts to authenticated;
grant select, insert, delete on public.community_comments to authenticated;
grant select on public.community_reactions to authenticated;
grant select, insert on public.community_reports to authenticated;

grant execute on function public.community_feed(int, text), public.post_comments(bigint),
  public.react_to_post(bigint, text), public.moderate_post(bigint, text, text),
  public.moderate_comment(bigint, text, text), public.admin_reports() to authenticated;
revoke all on function public.community_feed(int, text), public.post_comments(bigint),
  public.react_to_post(bigint, text), public.moderate_post(bigint, text, text),
  public.moderate_comment(bigint, text, text), public.admin_reports() from public, anon;


-- ============ G. PROMOTIONS (admin proposes, the shop agrees) ============
-- An admin cannot commit a shop to a discount. The shop sees the proposal,
-- accepts or declines, and only an accepted promotion goes live.

create table if not exists public.promotions (
  id bigint generated always as identity primary key,
  mall_id bigint not null references public.malls(id),
  shop_id bigint references public.shops(id) on delete cascade,  -- null = whole mall
  title text not null,
  description text,
  perk text not null,                       -- '10% off', 'Extra 50 points'
  points_cost int check (points_cost is null or points_cost > 0),
  starts_at date not null,
  ends_at date not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'declined', 'live', 'ended')),
  proposed_by uuid references public.profiles(id),
  responded_by uuid references public.profiles(id),
  responded_at timestamptz,
  response_note text,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index if not exists promotions_shop_idx on public.promotions (shop_id, status);
create index if not exists promotions_mall_idx on public.promotions (mall_id, status);

-- Admin writes a proposal and sends it to one shop, or to a whole mall.
create or replace function public.propose_promotion(
  p_mall_id bigint,
  p_shop_id bigint,
  p_title text,
  p_perk text,
  p_description text,
  p_starts_at date,
  p_ends_at date,
  p_points_cost int default null
)
returns public.promotions
language plpgsql security definer set search_path = public as $fn$
declare out_row public.promotions;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_title is null or btrim(p_title) = '' then raise exception 'Enter a title'; end if;
  if p_ends_at < p_starts_at then raise exception 'The end date is before the start date'; end if;

  insert into public.promotions
    (mall_id, shop_id, title, perk, description, starts_at, ends_at, points_cost, proposed_by)
  values
    (p_mall_id, p_shop_id, btrim(p_title), btrim(p_perk), nullif(btrim(coalesce(p_description, '')), ''),
     p_starts_at, p_ends_at, p_points_cost, auth.uid())
  returning * into out_row;

  return out_row;
end;
$fn$;

-- The shop answers. Accepting makes it live once the start date arrives.
create or replace function public.respond_to_promotion(
  p_promotion_id bigint, p_accept boolean, p_note text default null
)
returns public.promotions
language plpgsql security definer set search_path = public as $fn$
declare pr public.promotions; out_row public.promotions; mine boolean;
begin
  select * into pr from public.promotions where id = p_promotion_id for update;
  if not found then raise exception 'Promotion not found'; end if;
  if pr.status <> 'proposed' then raise exception 'This promotion was already answered'; end if;

  select exists (
    select 1 from public.shops s
    where s.merchant_id = auth.uid()
      and (pr.shop_id = s.id or (pr.shop_id is null and pr.mall_id = s.mall_id))
  ) into mine;

  if not mine then raise exception 'Only the shop this was sent to can answer it'; end if;

  update public.promotions
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_by = auth.uid(),
      responded_at = now(),
      response_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_promotion_id
  returning * into out_row;

  return out_row;
end;
$fn$;

-- Accepted promotions whose dates have arrived become live; past ones end.
create or replace function public.refresh_promotion_status()
returns int language plpgsql security definer set search_path = public as $fn$
declare n int;
begin
  update public.promotions
  set status = 'live'
  where status = 'accepted' and starts_at <= current_date and ends_at >= current_date;

  update public.promotions
  set status = 'ended'
  where status in ('accepted', 'live') and ends_at < current_date;

  get diagnostics n = row_count;
  return n;
end;
$fn$;

-- What a resident may see: live promotions only.
create or replace function public.live_promotions(p_mall_id bigint default null)
returns table (
  id bigint, mall_id bigint, mall_name text, shop_name text,
  title text, perk text, description text,
  starts_at date, ends_at date, points_cost int
)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.mall_id, m.name, s.name, p.title, p.perk, p.description,
         p.starts_at, p.ends_at, p.points_cost
  from public.promotions p
  join public.malls m on m.id = p.mall_id
  left join public.shops s on s.id = p.shop_id
  where p.status in ('accepted', 'live')
    and p.starts_at <= current_date and p.ends_at >= current_date
    and (p_mall_id is null or p.mall_id = p_mall_id)
  order by p.ends_at;
$fn$;

alter table public.promotions enable row level security;

drop policy if exists "promotions read" on public.promotions;
create policy "promotions read" on public.promotions
  for select to authenticated using (
    public.is_admin()
    or status in ('accepted', 'live')
    or shop_id in (select id from public.shops where merchant_id = auth.uid())
    or (shop_id is null and mall_id in (select mall_id from public.shops where merchant_id = auth.uid()))
  );

drop policy if exists "admin promotions write" on public.promotions;
create policy "admin promotions write" on public.promotions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.promotions to authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant execute on function
  public.propose_promotion(bigint, bigint, text, text, text, date, date, int),
  public.respond_to_promotion(bigint, boolean, text),
  public.refresh_promotion_status(),
  public.live_promotions(bigint) to authenticated;
revoke all on function
  public.propose_promotion(bigint, bigint, text, text, text, date, date, int),
  public.respond_to_promotion(bigint, boolean, text),
  public.refresh_promotion_status() from public, anon;


-- ============ H. REWARDS: GENERAL, MALL-SPECIFIC AND TIMED ============

alter table public.rewards
  add column if not exists scope text not null default 'mall'
    check (scope in ('general', 'mall')),
  add column if not exists starts_at date,
  add column if not exists ends_at date,
  add column if not exists description text;

-- A general reward works at every mall, so it has no mall of its own.
alter table public.rewards alter column mall_id drop not null;

-- Mark the two cheapest items as township-wide so the demo has both kinds.
update public.rewards set scope = 'general', mall_id = null
where title in ('Reusable tote bag', 'Free 1-hour parking');

-- One timed offer, so the "limited time" row is not empty in the demo.
update public.rewards
set starts_at = current_date - 3, ends_at = current_date + 21
where title = '10 kWh EV charging credit';

-- The catalogue a resident sees for one mall: general items plus that mall's own.
create or replace function public.rewards_for_mall(p_mall_id bigint)
returns table (
  id bigint, title text, description text, points_cost int, stock int,
  scope text, mall_name text, starts_at date, ends_at date, limited boolean
)
language sql stable security definer set search_path = public as $fn$
  select r.id, r.title, r.description, r.points_cost, r.stock, r.scope, m.name,
         r.starts_at, r.ends_at,
         (r.starts_at is not null or r.ends_at is not null)
  from public.rewards r
  left join public.malls m on m.id = r.mall_id
  where r.active
    and (r.scope = 'general' or r.mall_id = p_mall_id)
    and (r.starts_at is null or r.starts_at <= current_date)
    and (r.ends_at is null or r.ends_at >= current_date)
  order by (r.scope = 'general') desc, r.points_cost;
$fn$;

grant execute on function public.rewards_for_mall(bigint) to authenticated;

-- redeem_reward must respect the new date window too.
create or replace function public.redeem_reward(p_reward_id bigint)
returns public.redemptions language plpgsql security definer set search_path = public as $fn$
declare r public.rewards; bal int; out_row public.redemptions;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into r from public.rewards where id = p_reward_id and active for update;
  if not found then raise exception 'Reward not available'; end if;
  if r.starts_at is not null and r.starts_at > current_date then
    raise exception 'This offer has not started yet';
  end if;
  if r.ends_at is not null and r.ends_at < current_date then
    raise exception 'This offer has ended';
  end if;
  if r.stock <= 0 then raise exception 'Out of stock'; end if;

  select coalesce(sum(points), 0) into bal
  from public.point_transactions where user_id = auth.uid();
  if bal < r.points_cost then
    raise exception 'Not enough points (have %, need %)', bal, r.points_cost;
  end if;

  update public.rewards set stock = stock - 1 where id = r.id;

  insert into public.point_transactions (user_id, points, reason)
  values (auth.uid(), -r.points_cost, 'Redeemed: ' || r.title);

  insert into public.redemptions (user_id, reward_id, points_used)
  values (auth.uid(), r.id, r.points_cost)
  returning * into out_row;

  return out_row;
end;
$fn$;

-- merchant_accept_code must also allow a general reward (mall_id is null).
create or replace function public.merchant_accept_code(p_code text)
returns text language plpgsql security definer set search_path = public as $fn$
declare my_malls bigint[]; n int;
begin
  select array_agg(mall_id) into my_malls from public.shops where merchant_id = auth.uid();
  if my_malls is null then raise exception 'Only mall shops can accept codes'; end if;

  update public.redemptions r set status = 'used'
    from public.rewards w
    where r.reward_id = w.id and r.code = upper(p_code) and r.status = 'issued'
      and (w.mall_id = any(my_malls) or w.scope = 'general');
  get diagnostics n = row_count;
  if n > 0 then return 'Reward accepted'; end if;

  update public.mall_credits set status = 'used'
    where code = upper(p_code) and status = 'issued' and mall_id = any(my_malls);
  get diagnostics n = row_count;
  if n > 0 then return 'Mall credit accepted'; end if;

  raise exception 'Code not valid at this mall or already used';
end;
$fn$;


-- ============ I. POINT RULES (the "how to earn points" table) ============

create table if not exists public.point_rules (
  id bigint generated always as identity primary key,
  title text not null,
  detail text not null,
  points text not null,                    -- text, so '+20 per visit' reads well
  kind text not null check (kind in ('earn', 'spend', 'convert')),
  active boolean not null default true,
  sort int not null default 100
);

insert into public.point_rules (title, detail, points, kind, sort)
select v.title, v.detail, v.points, v.kind, v.sort
from (values
  ('Recycling drop-off',
   'Bring recyclables to a mall recycling corner. Ask to check in, and an admin confirms you were there.',
   '+20 per visit', 'earn', 10),
  ('Used cooking oil collection',
   'Hand in used cooking oil at a participating mall loading bay.',
   '+30 per visit', 'earn', 20),
  ('Community clean-up',
   'Join a township clean-up event. Attendance is confirmed by an admin.',
   '+80 per event', 'earn', 30),
  ('Tree planting day',
   'Join a planting day at Elmina Central Park or another township park.',
   '+100 per event', 'earn', 40),
  ('Cut your home electricity',
   'Upload your monthly bill. If you used at least 10% less than the month before, points are added automatically.',
   '+150 per month', 'earn', 50),
  ('Convert wallet money',
   'Turn ringgit in your wallet into points. Points can never be turned back into money.',
   '20 points per RM1', 'convert', 60),
  ('Redeem a reward',
   'Spend points on vouchers, parking and offers at participating malls.',
   'from 80 points', 'spend', 70)
) as v(title, detail, points, kind, sort)
where not exists (select 1 from public.point_rules pr where pr.title = v.title);

alter table public.point_rules enable row level security;

drop policy if exists "point rules read" on public.point_rules;
create policy "point rules read" on public.point_rules
  for select to anon, authenticated using (true);

drop policy if exists "admin point rules write" on public.point_rules;
create policy "admin point rules write" on public.point_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.point_rules to anon, authenticated;
grant insert, update, delete on public.point_rules to authenticated;
