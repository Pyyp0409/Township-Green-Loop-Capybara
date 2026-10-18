-- ============================================================================
-- Township Green Loop — v6
-- Run ONCE in Supabase > SQL Editor, AFTER setup_v5.sql. Safe to re-run.
--
-- The community feed only knew each author's role, so a supporter looked like
-- any other resident. Both feed functions now return membership as well, so
-- the app can show the supporter icon.
-- ============================================================================

drop function if exists public.community_feed(int, text);
create or replace function public.community_feed(p_limit int default 30, p_tag text default null)
returns table (
  id bigint, body text, tag text, pinned boolean, created_at timestamptz,
  author_id uuid, author_name text, author_role text, author_membership text,
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
    -- anonymous posts give nothing away, not even which kind of member
    case when p.anonymous then null else pr.membership end,
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

drop function if exists public.post_comments(bigint);
create or replace function public.post_comments(p_post_id bigint)
returns table (
  id bigint, body text, created_at timestamptz,
  author_name text, author_role text, author_membership text, badge_image text
)
language sql stable security definer set search_path = public as $fn$
  select c.id, c.body, c.created_at,
         case when c.anonymous then 'Anonymous' else coalesce(pr.full_name, 'Member') end,
         pr.role,
         case when c.anonymous then null else pr.membership end,
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

grant execute on function public.community_feed(int, text),
  public.post_comments(bigint) to authenticated;
revoke all on function public.community_feed(int, text),
  public.post_comments(bigint) from public, anon;

-- ---------- check ----------
select author_name, author_role, author_membership, badge_name
from public.community_feed(10, null);
