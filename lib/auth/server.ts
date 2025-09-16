import 'server-only';
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "customer";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { ...user, profile: profile as UserProfile };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (user.profile.role !== role) redirect("/unauthorized");
  return user;
}

export async function requireAdmin() {
  return await requireRole("admin");
}

export async function requireCustomer() {
  return await requireRole("customer");
}

export async function checkCustomerAccess(customerId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.profile.role === "admin") return true;
  return user.profile.customer_id === customerId;
}

export async function createCustomerInvitation(
  email: string,
  customerId: string,
  invitedBy: string
) {
  const supabase = await createServerSupabase();
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return await supabase
    .from("customer_invitations")
    .insert({
      email,
      customer_id: customerId,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
}

export async function verifyInvitationToken(token: string) {
  const supabase = await createServerSupabase();
  return await supabase
    .from("customer_invitations")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
}


