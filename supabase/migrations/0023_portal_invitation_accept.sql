-- Section 02 - Auth & Identity (Passwordless + Invitations)
-- Implements invitation acceptance using a hashed token and JIT provisioning helpers.
-- Notes:
-- - Store only bcrypt token hashes in portal_invitations.token_hash. Verify with crypt(token, token_hash).
-- - The API should create or sign-in the auth user with Supabase Auth before calling accept.
-- - This function links the current auth user (auth.uid()) to the customer and activates access.

create extension if not exists pgcrypto;

-- Ensure admin helper exists (idempotent)
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'admin' and up.is_active = true
  );
$$;

-- Accept an invitation using the raw token. Requires the caller to be authenticated.
-- Steps:
-- 1) Find pending invitation for the current user's email.
-- 2) Verify token against stored bcrypt hash and expiry.
-- 3) Upsert user_profiles (role=customer, is_active=true, set customer_id if null).
-- 4) Upsert portal_access_grants to status 'active'.
-- 5) Mark invitation accepted.
-- Returns: portal_access_grants.id
create or replace function public.portal_invitation_accept(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invitation_id uuid;
  v_customer_id uuid;
  v_token_hash text;
  v_grant_id uuid;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to accept an invitation';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'Authenticated user has no email';
  end if;

  -- Find a pending, non-expired invitation for this email
  select id, customer_id, token_hash
    into v_invitation_id, v_customer_id, v_token_hash
  from public.portal_invitations
  where lower(email) = lower(v_email)
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_invitation_id is null then
    raise exception 'No valid pending invitation found for %', v_email;
  end if;

  -- Verify raw token using bcrypt/pgcrypto
  if crypt(p_token, v_token_hash) <> v_token_hash then
    raise exception 'Invalid or expired invitation token';
  end if;

  -- Upsert user profile: ensure active customer role and set tenant if missing
  insert into public.user_profiles (id, email, role, is_active, customer_id)
  values (v_user_id, v_email, 'customer', true, v_customer_id)
  on conflict (id) do update
    set email = excluded.email,
        role = case when public.user_profiles.role = 'admin' then public.user_profiles.role else 'customer' end,
        is_active = true,
        customer_id = coalesce(public.user_profiles.customer_id, excluded.customer_id),
        updated_at = now();

  -- Upsert access grant to active
  insert into public.portal_access_grants (customer_id, user_id, status)
  values (v_customer_id, v_user_id, 'active')
  on conflict (customer_id, user_id) do update
    set status = 'active', updated_at = now()
  returning id into v_grant_id;

  -- Mark invitation accepted
  update public.portal_invitations
    set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_invitation_id;

  return v_grant_id;
end;
$$;

-- Optional: helper to check whether an invitation exists and is valid for the user email (does not reveal token info)
create or replace function public.portal_invitation_preflight()
returns table(invitation_id uuid, customer_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to check invitation';
  end if;
  select email into v_email from auth.users where id = v_user_id;
  return query
  select id, customer_id, expires_at
  from public.portal_invitations
  where lower(email) = lower(v_email)
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;
end;
$$;

-- Security: allow authenticated users to execute accept/preflight
grant execute on function public.portal_invitation_accept(text) to authenticated;
grant execute on function public.portal_invitation_preflight() to authenticated;

-- RLS policies to allow invite acceptance by the authenticated user (non-admin)
-- Allow users to see their own pending, non-expired invitations
drop policy if exists portal_invitations_select_self on public.portal_invitations;
create policy portal_invitations_select_self on public.portal_invitations
  for select using (
    lower(email) = (select lower(email) from auth.users where id = auth.uid())
    and status = 'pending' and expires_at > now()
  );

-- Allow users to update their own invitations (e.g., mark accepted)
drop policy if exists portal_invitations_update_self on public.portal_invitations;
create policy portal_invitations_update_self on public.portal_invitations
  for update using (
    lower(email) = (select lower(email) from auth.users where id = auth.uid())
  ) with check (
    lower(email) = (select lower(email) from auth.users where id = auth.uid())
  );

-- Allow users to insert/update their own access_grants rows
drop policy if exists portal_access_grants_self_insert on public.portal_access_grants;
create policy portal_access_grants_self_insert on public.portal_access_grants
  for insert with check (
    user_id = auth.uid()
  );

drop policy if exists portal_access_grants_self_update on public.portal_access_grants;
create policy portal_access_grants_self_update on public.portal_access_grants
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
  );


