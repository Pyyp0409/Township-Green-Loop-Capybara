-- ============================================================================
-- Township Green Loop — demo residents, merchants and activity
-- Run AFTER setup_all.sql and setup_v2.sql.
--
-- STEP 1 FIRST — create the sign-in accounts by hand.
--   Supabase Dashboard > Authentication > Users > "Add user"
--   Tick "Auto Confirm User" for every one, password: 123456
--
--     aisyah@demo.com      resident   (high points - Planet Hero)
--     ravi@demo.com        resident   (mid points  - Eco Champion)
--     mei@demo.com         resident   (low points  - Seedling)
--     daniel@demo.com      resident   (no points, fresh account)
--     freshmart@demo.com   merchant   (FreshMart Mini, KL East Mall)
--     bakery@demo.com      merchant   (Lakeside Books, Elmina Lakeside)
--
-- STEP 2 — run this whole file. It finds those users by email, sets their
-- role and township, and fills in investments, points, bills, badges,
-- community posts, feedback and promotions.
--
-- Safe to re-run: it clears only these demo users' own rows first.
-- ============================================================================

do $$
declare
  v_aisyah uuid; v_ravi uuid; v_mei uuid; v_daniel uuid;
  v_fresh uuid;  v_books uuid;
  v_missing text := '';
begin
  select id into v_aisyah from auth.users where email = 'aisyah@demo.com';
  select id into v_ravi   from auth.users where email = 'ravi@demo.com';
  select id into v_mei    from auth.users where email = 'mei@demo.com';
  select id into v_daniel from auth.users where email = 'daniel@demo.com';
  select id into v_fresh  from auth.users where email = 'freshmart@demo.com';
  select id into v_books  from auth.users where email = 'bakery@demo.com';

  if v_aisyah is null then v_missing := v_missing || ' aisyah@demo.com'; end if;
  if v_ravi   is null then v_missing := v_missing || ' ravi@demo.com';   end if;
  if v_mei    is null then v_missing := v_missing || ' mei@demo.com';    end if;
  if v_daniel is null then v_missing := v_missing || ' daniel@demo.com'; end if;
  if v_fresh  is null then v_missing := v_missing || ' freshmart@demo.com'; end if;
  if v_books  is null then v_missing := v_missing || ' bakery@demo.com'; end if;

  if v_missing <> '' then
    raise exception 'Create these users in Authentication > Users first:%', v_missing;
  end if;

  -- ---------- profiles ----------
  update public.profiles set full_name = 'Aisyah binti Rahman', role = 'resident',
    township = 'City of Elmina' where id = v_aisyah;
  update public.profiles set full_name = 'Ravi Kumar', role = 'resident',
    township = 'City of Elmina' where id = v_ravi;
  update public.profiles set full_name = 'Mei Ling Tan', role = 'resident',
    township = 'Bandar Bukit Raja' where id = v_mei;
  update public.profiles set full_name = 'Daniel Wong', role = 'resident',
    township = 'City of Elmina' where id = v_daniel;
  update public.profiles set full_name = 'FreshMart Mini', role = 'merchant',
    township = 'City of Elmina' where id = v_fresh;
  update public.profiles set full_name = 'Lakeside Books', role = 'merchant',
    township = 'City of Elmina' where id = v_books;

  -- ---------- clear this demo set only, so the file can be re-run ----------
  delete from public.community_reports  where reporter_id in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.community_reactions where user_id   in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.community_comments where author_id  in (v_aisyah, v_ravi, v_mei, v_daniel, v_fresh, v_books);
  delete from public.community_posts    where author_id  in (v_aisyah, v_ravi, v_mei, v_daniel, v_fresh, v_books);
  delete from public.feedback           where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.checkin_requests   where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.user_badges        where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.point_transactions where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.mall_credits       where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.wallet_transactions where user_id   in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.payouts            where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.investments        where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.energy_bills       where user_id    in (v_aisyah, v_ravi, v_mei, v_daniel);
  delete from public.risk_acknowledgements where user_id in (v_aisyah, v_ravi, v_mei, v_daniel);

  -- ---------- shops owned by the two new merchants ----------
  update public.shops set merchant_id = v_fresh where name = 'FreshMart Mini';
  update public.shops set merchant_id = v_books where name = 'Lakeside Books';

  -- give Lakeside Books some energy history so its dashboard is not empty
  insert into public.shop_energy (shop_id, month, kwh, baseline_kwh, bill_rm)
  select s.id, d.m, d.kwh, 7200, round(d.kwh * 0.4540, 2)
  from public.shops s
  cross join (values
    (date_trunc('month', current_date - interval '3 months')::date, 6900),
    (date_trunc('month', current_date - interval '2 months')::date, 6600),
    (date_trunc('month', current_date - interval '1 month')::date,  6450)
  ) as d(m, kwh)
  where s.name = 'Lakeside Books'
  on conflict (shop_id, month) do nothing;

  -- ---------- risk acknowledgements (needed before any investment) ----------
  insert into public.risk_acknowledgements (user_id, pool_id)
  select u.id, p.id
  from (values (v_aisyah), (v_ravi), (v_mei)) as u(id)
  cross join public.pools p
  on conflict do nothing;

  -- ---------- investments, with payment methods ----------
  insert into public.investments (user_id, pool_id, asset_id, amount, status, created_at, pay_method, pay_ref)
  select x.uid, x.pool, a.id, x.amt, 'active', x.made, x.method, x.ref
  from (values
    (v_aisyah, 'solar',   'Elmina Lakeside Mall rooftop solar', 5000::numeric, now() - interval '11 months', 'online_banking', 'Maybank2u'),
    (v_aisyah, 'upgrade', 'Shop upgrades - batch 1 (15 shops)', 3000::numeric, now() - interval '9 months',  'card',           'Visa .... 4242'),
    (v_aisyah, 'ev',      'EV pilot - 1 DC 60 kW + 1 AC 22 kW',1000::numeric, now() - interval '6 months',  'ewallet',        'Touch n Go'),
    (v_ravi,   'solar',   'Elmina Lakeside Mall rooftop solar', 2500::numeric, now() - interval '8 months',  'card',           'Mastercard .... 7781'),
    (v_ravi,   'upgrade', 'Shop upgrades - batch 1 (15 shops)', 1200::numeric, now() - interval '5 months',  'online_banking', 'CIMB Clicks'),
    (v_mei,    'solar',   'Elmina Lakeside Mall rooftop solar',  600::numeric, now() - interval '4 months',  'ewallet',        'GrabPay')
  ) as x(uid, pool, asset, amt, made, method, ref)
  -- Exactly one asset per row. A plain join on a name prefix would match both
  -- "Shop upgrades - batch 1" and "batch 2" and double every upgrade stake.
  -- The asset names use an en dash, so match on the part before it.
  cross join lateral (
    select a2.id
    from public.assets a2
    where a2.pool_id = x.pool
      and a2.name like split_part(replace(x.asset, '-', '~'), ' ~', 1) || '%'
    order by a2.id
    limit 1
  ) a;

  -- ---------- payouts and wallet, two months each ----------
  insert into public.payouts (investment_id, user_id, amount, kind, paid_at, pay_method)
  select i.id, i.user_id, round(i.amount * 0.0042, 2), 'profit',
         (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer'
  from public.investments i where i.user_id in (v_aisyah, v_ravi, v_mei);

  insert into public.payouts (investment_id, user_id, amount, kind, paid_at, pay_method)
  select i.id, i.user_id, round(i.amount * 0.0150, 2), 'principal',
         (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer'
  from public.investments i where i.user_id in (v_aisyah, v_ravi, v_mei);

  insert into public.wallet_transactions (user_id, amount, kind, note, created_at)
  select p.user_id, sum(p.amount), 'payout',
         'Monthly payout ' || to_char(p.paid_at, 'Mon YYYY'), p.paid_at::timestamptz
  from public.payouts p
  where p.user_id in (v_aisyah, v_ravi, v_mei)
  group by p.user_id, p.paid_at;

  -- ---------- points history, sized to land on the right badge ----------
  -- Aisyah: Planet Hero (6,000+)
  insert into public.point_transactions (user_id, points, reason, created_at)
  select v_aisyah, g.pts, g.why, now() - (g.ago || ' days')::interval
  from (values
    (150, 'energy_saving: used 14% less', 20),
    (150, 'energy_saving: used 11% less', 50),
    (100, 'event: Tree planting day', 70),
    ( 80, 'event: Community clean-up', 95),
    ( 20, 'recycling: Recycling drop-off', 110),
    (5520, 'Carried over from the township pilot programme', 200)
  ) as g(pts, why, ago);

  -- Ravi: Eco Champion (1,500+)
  insert into public.point_transactions (user_id, points, reason, created_at)
  select v_ravi, g.pts, g.why, now() - (g.ago || ' days')::interval
  from (values
    (150, 'energy_saving: used 12% less', 25),
    (100, 'event: Tree planting day', 60),
    ( 30, 'recycling: Used cooking oil collection', 80),
    (1300, 'Carried over from the township pilot programme', 180)
  ) as g(pts, why, ago);

  -- Mei: Seedling (100+)
  insert into public.point_transactions (user_id, points, reason, created_at)
  select v_mei, g.pts, g.why, now() - (g.ago || ' days')::interval
  from (values
    ( 20, 'recycling: Recycling drop-off', 12),
    ( 30, 'recycling: Used cooking oil collection', 30),
    ( 80, 'event: Community clean-up', 45)
  ) as g(pts, why, ago);

  -- Daniel earns nothing yet, so a fresh account can be demonstrated.

  -- the badge trigger fires on insert, but make sure anything historic is caught
  insert into public.user_badges (user_id, badge_id)
  select u.id, b.id
  from (values (v_aisyah), (v_ravi), (v_mei), (v_daniel)) as u(id)
  join public.badges b on b.min_points <= public.lifetime_points(u.id)
  on conflict do nothing;

  -- let the newest badge still celebrate for Mei, so fireworks can be shown
  update public.user_badges set celebrated = true
  where user_id in (v_aisyah, v_ravi);
  update public.user_badges set celebrated = false
  where user_id = v_mei;

  -- ---------- electricity bills ----------
  insert into public.energy_bills (user_id, bill_month, kwh, amount_rm)
  select x.uid, x.m, x.kwh, round(x.kwh * 0.454, 2)
  from (values
    (v_aisyah, (date_trunc('month', current_date) - interval '3 months')::date, 420::numeric),
    (v_aisyah, (date_trunc('month', current_date) - interval '2 months')::date, 388::numeric),
    (v_aisyah, (date_trunc('month', current_date) - interval '1 month')::date,  333::numeric),
    (v_ravi,   (date_trunc('month', current_date) - interval '2 months')::date, 512::numeric),
    (v_ravi,   (date_trunc('month', current_date) - interval '1 month')::date,  448::numeric),
    (v_mei,    (date_trunc('month', current_date) - interval '1 month')::date,  295::numeric)
  ) as x(uid, m, kwh)
  on conflict (user_id, bill_month) do nothing;

  -- ---------- check-in requests waiting for the admin ----------
  insert into public.checkin_requests (user_id, activity_id, code_given, code_matched, note, created_at)
  select x.uid, a.id, x.code,
         case when a.checkin_code is null then null else upper(x.code) = upper(a.checkin_code) end,
         x.note, now() - (x.ago || ' hours')::interval
  from (values
    (v_mei,    'Tree planting day',   'TREE2026', 'Planted two saplings near the lake.', 6),
    (v_daniel, 'Community clean-up',  'CLEANUP',  'Joined the riverside group.', 20),
    (v_ravi,   'Recycling drop-off',  'WRONGCODE','Dropped off cardboard.', 30)
  ) as x(uid, title, code, note, ago)
  join public.activities a on a.title like x.title || '%'
  on conflict do nothing;

  -- ---------- payout preferences ----------
  insert into public.payout_preferences (user_id, method, account_ref) values
    (v_aisyah, 'bank_transfer', 'Maybank .... 8891'),
    (v_ravi,   'ewallet',       'Touch n Go'),
    (v_mei,    'points',        null)
  on conflict (user_id) do update
    set method = excluded.method, account_ref = excluded.account_ref;

  -- ---------- feedback ----------
  insert into public.feedback (user_id, area, rating, comment, created_at)
  select x.uid, x.area, x.rating, x.note, now() - (x.ago || ' days')::interval
  from (values
    (v_aisyah, 'investment', 5, 'The risk statement before investing is very clear. I knew what I was signing.', 3),
    (v_aisyah, 'rewards',    4, 'Would like more rewards at Elmina Lakeside.', 9),
    (v_ravi,   'points',     3, 'Waiting for the admin to approve my check-in takes too long.', 2),
    (v_ravi,   'activities', 5, 'Tree planting day was well organised.', 14),
    (v_mei,    'app',        4, 'Easy to use on my phone. The bill scanner saved me typing.', 1),
    (v_mei,    'wallet',     2, 'I did not understand the 10 percent mall bonus at first.', 7),
    (v_daniel, 'investment', 3, 'I want to see more detail on how the EV pool can lose money.', 5)
  ) as x(uid, area, rating, note, ago);

  -- ---------- community ----------
  insert into public.community_posts (author_id, body, tag, anonymous, pinned, created_at)
  select x.uid, x.body, x.tag, x.anon, x.pin, now() - (x.ago || ' hours')::interval
  from (values
    (v_aisyah, 'Just hit Planet Hero. Three years of recycling with my kids finally paid off. The badge is lovely.', 'general', false, false, 5),
    (v_ravi,   'Question for the group: does the solar payout change if the mall has a quiet month?', 'question', false, false, 14),
    (v_fresh,  'FreshMart Mini here. Our new fridges cut our bill by about a quarter. Happy to answer questions from anyone thinking about the upgrade pool.', 'guidance', false, false, 26),
    (v_mei,    'First recycling drop-off done today. The corner at Elmina Lakeside is easy to find, next to the car park lift.', 'general', false, false, 38),
    (v_daniel, 'Still deciding between solar and upgrades. Anyone regret picking one over the other?', 'question', true, false, 50),
    (v_books,  'Lakeside Books is open late this Friday for the clean-up volunteers. Free coffee if you show your check-in.', 'event', false, false, 62)
  ) as x(uid, body, tag, anon, pin, ago);

  insert into public.community_comments (post_id, author_id, body, created_at)
  select p.id, x.uid, x.body, p.created_at + interval '2 hours'
  from public.community_posts p
  join (values
    ('Just hit Planet Hero%',  v_ravi,  'Congratulations. That is a lot of trips to the recycling corner.'),
    ('Question for the group%', v_fresh, 'From what I understand the rate is fixed at 5 percent, the mall traffic does not change your payout.'),
    ('First recycling drop-off%', v_aisyah, 'Welcome. Keep going and you will reach Green Neighbour before you know it.')
  ) as x(pattern, uid, body) on p.body like x.pattern
  where p.author_id in (v_aisyah, v_ravi, v_mei, v_daniel, v_fresh, v_books);

  insert into public.community_reactions (post_id, user_id, kind)
  select p.id, x.uid, x.kind
  from public.community_posts p
  join (values
    ('Just hit Planet Hero%', v_ravi,   'celebrate'),
    ('Just hit Planet Hero%', v_mei,    'celebrate'),
    ('Just hit Planet Hero%', v_daniel, 'like'),
    ('FreshMart Mini here%',  v_ravi,   'support'),
    ('First recycling drop-off%', v_aisyah, 'support')
  ) as x(pattern, uid, kind) on p.body like x.pattern
  on conflict do nothing;

  raise notice 'Demo residents, merchants, points, badges, community and feedback are in.';
end $$;


-- ---------- promotions: admin proposes, the shops have not all answered ----------
insert into public.promotions
  (mall_id, shop_id, title, perk, description, starts_at, ends_at, status, points_cost)
select m.id, s.id, v.title, v.perk, v.descr,
       current_date + v.start_off, current_date + v.end_off, v.status, v.cost
from (values
  ('KL East Mall', 'Kopi Hijau Cafe', 'Green Hour coffee',
   'RM2 off any coffee', 'Weekday afternoons, for residents who checked in to a recycling drop-off that week.',
   -2, 28, 'proposed', null::int),
  ('KL East Mall', 'FreshMart Mini', 'Bring your own bag',
   '5% off groceries', 'For shoppers who bring a reusable bag. Runs through the school holidays.',
   -5, 20, 'accepted', null::int),
  ('Elmina Lakeside Mall', 'Lakeside Books', 'Second-hand shelf',
   'Extra 50 points', 'Trade in a used book and earn points on top of the usual trade-in value.',
   -1, 30, 'proposed', null::int)
) as v(mall, shop, title, perk, descr, start_off, end_off, status, cost)
join public.malls m on m.name = v.mall
join public.shops s on s.name like split_part(v.shop, ' Cafe', 1) || '%' and s.mall_id = m.id
where not exists (select 1 from public.promotions p where p.title = v.title);

-- a mall-wide proposal with no single shop attached
insert into public.promotions
  (mall_id, shop_id, title, perk, description, starts_at, ends_at, status)
select m.id, null, 'Earth Hour weekend',
  'Double points on all check-ins',
  'Every recycling drop-off and event check-in at this mall earns double points for one weekend.',
  current_date + 10, current_date + 12, 'proposed'
from public.malls m
where m.name = 'Elmina Lakeside Mall'
  and not exists (select 1 from public.promotions p where p.title = 'Earth Hour weekend');

select public.refresh_promotion_status();


-- ---------- check what landed ----------
select 'residents' as what, count(*)::text as n from public.profiles where role = 'resident'
union all select 'merchants', count(*)::text from public.profiles where role = 'merchant'
union all select 'investments', count(*)::text from public.investments
union all select 'badges awarded', count(*)::text from public.user_badges
union all select 'community posts', count(*)::text from public.community_posts
union all select 'feedback rows', count(*)::text from public.feedback
union all select 'checkins waiting', count(*)::text from public.checkin_requests where status = 'pending'
union all select 'promotions', count(*)::text from public.promotions;
