-- Section 03 - Admin API: invitation create/resend/revoke helpers using hashed tokens

create extension if not exists pgcrypto;

-- Helper to generate a random token (return raw) and its bcrypt hash
-- The API server should send only the raw token to the user via email; only the hash is stored.
create or replace function public.generate_invitation_token()
returns table(raw_token text, token_hash text)
language plpgsql
as $$
declare
  v_token text := encode(gen_random_bytes(24), 'hex');
begin
  -- bcrypt with default cost
  return query select v_token, crypt(v_token, gen_salt('bf'));
end;
$$;

-- Create invitation: idempotent pending per (customer_id,email)
create or replace function public.admin_create_portal_invitation(p_customer_id uuid, p_email text, p_expires_in_days int default 7)
returns table(invitation_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + (p_expires_in_days || ' days')::interval;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  -- Generate token + hash
  select raw_token, token_hash into v_token, v_hash from public.generate_invitation_token();

  -- If an existing pending invite exists for (customer,email), replace it
  update public.portal_invitations
    set status = 'revoked', revoked_at = now(), updated_at = now()
  where customer_id = p_customer_id and lower(email) = lower(p_email) and status = 'pending';

  insert into public.portal_invitations (customer_id, email, token_hash, status, expires_at, created_by)
  values (p_customer_id, lower(p_email), v_hash, 'pending', v_expires, auth.uid())
  returning id, v_token, v_expires into invitation_id, raw_token, expires_at;

  return;
end;
$$;

-- Resend invitation: rotates token and extends expiry
create or replace function public.admin_resend_portal_invitation(p_invitation_id uuid, p_extend_days int default 7)
returns table(invitation_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_token text;
  v_hash text;
  v_expires timestamptz;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  select raw_token, token_hash into v_token, v_hash from public.generate_invitation_token();

  update public.portal_invitations
    set token_hash = v_hash,
        expires_at = greatest(now() + (p_extend_days || ' days')::interval, now() + interval '1 day'),
        updated_at = now()
  where id = p_invitation_id and status = 'pending'
  returning id, v_token, expires_at into invitation_id, raw_token, expires_at;

  if invitation_id is null then
    raise exception 'Pending invitation not found';
  end if;

  return;
end;
$$;

-- Revoke invitation
create or replace function public.admin_revoke_portal_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_ok boolean := false;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  update public.portal_invitations
    set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_invitation_id and status = 'pending';

  v_ok := FOUND;
  return v_ok;
end;
$$;

grant execute on function public.generate_invitation_token() to authenticated;
grant execute on function public.admin_create_portal_invitation(uuid, text, int) to authenticated;
grant execute on function public.admin_resend_portal_invitation(uuid, int) to authenticated;
grant execute on function public.admin_revoke_portal_invitation(uuid) to authenticated;


