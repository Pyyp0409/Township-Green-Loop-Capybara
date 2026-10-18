-- ============================================================================
-- Township Green Loop — create the six demo sign-in accounts
-- Run this BEFORE sample_data_v2.sql, in Supabase > SQL Editor.
--
-- This writes straight into auth.users, which is normally the Auth API's job.
-- It is fine for a demo project with fictional accounts. If it errors on your
-- Supabase version, create the users by hand instead:
--   Authentication > Users > Add user, tick "Auto Confirm User", password 123456
--
-- Every account gets the password: 123456
-- Safe to re-run: existing accounts are skipped.
-- ============================================================================

do $$
declare
  v_email text;
  v_name  text;
  v_id    uuid;
  v_inst  uuid;
  v_pw    text := '123456';
begin
  -- Every Supabase project uses one instance id, usually all-zeroes.
  select coalesce(min(instance_id), '00000000-0000-0000-0000-000000000000'::uuid)
    into v_inst from auth.users;

  for v_email, v_name in
    select * from (values
      ('aisyah@demo.com',    'Aisyah binti Rahman'),
      ('ravi@demo.com',      'Ravi Kumar'),
      ('mei@demo.com',       'Mei Ling Tan'),
      ('daniel@demo.com',    'Daniel Wong'),
      ('freshmart@demo.com', 'FreshMart Mini'),
      ('bakery@demo.com',    'Lakeside Books')
    ) as t(email, name)
  loop
    -- Skip anyone who already exists, so this file can be re-run.
    if exists (select 1 from auth.users u where u.email = v_email) then
      raise notice 'already exists: %', v_email;
      continue;
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      v_inst, v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_pw, extensions.gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', v_name),
      '', '', '', ''
    );

    -- Password sign-in needs a matching identity row.
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    raise notice 'created: %', v_email;
  end loop;
end $$;

-- The handle_new_user trigger creates each profile. Confirm all six are here.
select u.email,
       p.full_name,
       p.role,
       (u.email_confirmed_at is not null) as confirmed
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in (
  'aisyah@demo.com', 'ravi@demo.com', 'mei@demo.com',
  'daniel@demo.com', 'freshmart@demo.com', 'bakery@demo.com'
)
order by u.email;
