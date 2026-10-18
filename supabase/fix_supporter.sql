-- ============================================================================
-- Fix the supporter demo account
--
-- setup_v3.sql skips its supporter block if the account did not exist yet, so
-- an account created afterwards is left as a plain resident named after its
-- email. This sets it up properly. Safe to re-run.
-- ============================================================================

do $$
declare v_sup uuid;
begin
  select id into v_sup from auth.users where email = 'supporter@demo.com';
  if v_sup is null then
    raise exception 'Create supporter@demo.com in Authentication > Users first.';
  end if;

  update public.profiles
  set full_name  = 'Nurul Hidayah',
      role       = 'resident',
      membership = 'supporter',
      township   = null,
      home_city  = 'Penang'
  where id = v_sup;

  -- Give her something to look at, if she has nothing yet.
  if not exists (select 1 from public.investments where user_id = v_sup) then
    insert into public.risk_acknowledgements (user_id, pool_id)
    select v_sup, p.id from public.pools p
    on conflict do nothing;

    insert into public.investments
      (user_id, pool_id, asset_id, amount, status, created_at, pay_method, pay_ref)
    select v_sup, 'solar', a.id, 2000, 'active', now() - interval '2 months',
           'online_banking', 'Maybank2u'
    from public.assets a
    where a.pool_id = 'solar' and a.status <> 'repaid'
    order by a.id
    limit 1;

    insert into public.payouts (investment_id, user_id, amount, kind, paid_at, pay_method)
    select i.id, v_sup, round(i.amount * 0.0042, 2), 'profit',
           (date_trunc('month', current_date) - (g || ' months')::interval)::date,
           'bank_transfer'
    from public.investments i, generate_series(1, 2) g
    where i.user_id = v_sup;

    insert into public.wallet_transactions (user_id, amount, kind, note, created_at)
    select v_sup, sum(p.amount), 'payout',
           'Monthly payout ' || to_char(p.paid_at, 'Mon YYYY'), p.paid_at::timestamptz
    from public.payouts p
    where p.user_id = v_sup
    group by p.paid_at;
  end if;

  -- A post, so the supporter icon shows up in the community feed.
  if not exists (select 1 from public.community_posts where author_id = v_sup) then
    insert into public.community_posts (author_id, body, tag, created_at)
    values (v_sup,
      'Hello from Penang. I grew up in Elmina and my parents still live there, so funding the mall roof felt like the right way to stay connected. Good to see the solar going up.',
      'general', now() - interval '20 hours');
  end if;

  raise notice 'Nurul Hidayah is set up as a supporter.';
end $$;

-- ---------- check: should read Nurul Hidayah / resident / supporter / Penang
select full_name, role, membership, township, home_city
from public.profiles p
where p.id = (select id from auth.users where email = 'supporter@demo.com');
