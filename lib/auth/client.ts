'use client';
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

export function useAuth() {
  const supabase = createBrowserSupabase();

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  };

  return { signIn, signUp, signOut, resetPassword };
}

export async function acceptInvitation(
  token: string,
  password: string,
  fullName: string
) {
  const supabase = createBrowserSupabase();

  const { data: invitation, error: invitationError } = await supabase
    .from("customer_invitations")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (invitationError || !invitation) {
    return { data: null, error: invitationError || new Error("Invalid invitation") };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (authError || !authData?.user) {
    return { data: null, error: authError };
  }

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({ role: "customer", customer_id: invitation.customer_id })
    .eq("id", authData.user.id);
  if (profileError) {
    return { data: null, error: profileError };
  }

  await supabase
    .from("customer_invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return { data: authData, error: null };
}


