-- Section 03 - Admin API (Link existing user, Suspend/Restore access)

create extension if not exists pgcrypto;

-- Link existing auth user by email to a customer, activate profile and grant access
create or replace function public.admin_link_existing_user(p_customer_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_user_id uuid;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  -- Find auth user id by email
  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'User with email % not found', p_email;
  end if;

  -- Upsert profile
  insert into public.user_profiles (id, email, role, is_active, customer_id)
  values (v_user_id, lower(p_email), 'customer', true, p_customer_id)
  on conflict (id) do update
    set email = excluded.email,
        role = case when public.user_profiles.role = 'admin' then public.user_profiles.role else 'customer' end,
        is_active = true,
        customer_id = p_customer_id,
        updated_at = now();

  -- Upsert access grant
  insert into public.portal_access_grants (customer_id, user_id, status)
  values (p_customer_id, v_user_id, 'active')
  on conflict (customer_id, user_id) do update
    set status = 'active', updated_at = now();

  return v_user_id;
end;
$$;

-- Suspend access for all users of a customer (typically one)
create or replace function public.admin_suspend_customer_access(p_customer_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_count int := 0;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  update public.user_profiles
    set is_active = false, updated_at = now()
  where customer_id = p_customer_id and role = 'customer';
  get diagnostics v_count = row_count;

  update public.portal_access_grants
    set status = 'suspended', updated_at = now()
  where customer_id = p_customer_id;

  return v_count;
end;
$$;

-- Restore access for all users of a customer
create or replace function public.admin_restore_customer_access(p_customer_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_count int := 0;
begin
  select public.is_current_user_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Admin only';
  end if;

  update public.user_profiles
    set is_active = true, updated_at = now()
  where customer_id = p_customer_id and role = 'customer';
  get diagnostics v_count = row_count;

  update public.portal_access_grants
    set status = 'active', updated_at = now()
  where customer_id = p_customer_id;

  return v_count;
end;
$$;

grant execute on function public.admin_link_existing_user(uuid, text) to authenticated;
grant execute on function public.admin_suspend_customer_access(uuid) to authenticated;
grant execute on function public.admin_restore_customer_access(uuid) to authenticated;


