// Supabase Auth helper for server-side usage
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  return supabase;
}

export async function getAuthUser() {
  // Prefer identity propagated by middleware via headers to avoid
  // transient 401s when cookies haven't been set on first load.
  const { headers } = await import('next/headers');
  const h = await headers();
  const userIdFromHeader = h.get('x-user-id');
  if (userIdFromHeader) {
    return { id: userIdFromHeader } as unknown as { id: string };
  }

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}


