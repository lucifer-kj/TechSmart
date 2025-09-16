import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const adminRoutes = ["/admin"]; 
const customerRoutes = ["/dashboard", "/jobs", "/documents", "/payments", "/profile"];
const authRoutes = ["/login", "/signup", "/forgot-password", "/auth/"]; 
const publicRoutes = ["/"]; 

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  let userProfile: any = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile = profile;
  }

  const matchesRoutes = (routes: string[]) => routes.some(r => pathname.startsWith(r));

  if (matchesRoutes(publicRoutes)) {
    return supabaseResponse;
  }

  if (matchesRoutes(authRoutes)) {
    if (user && userProfile?.is_active) {
      const redirectUrl = userProfile.role === "admin"
        ? new URL("/admin/dashboard", request.url)
        : new URL("/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/api/")) {
    const publicApiRoutes = [
      "/api/auth/",
      "/api/webhooks/",
      "/api/health"
    ];
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return supabaseResponse;
    }

    if (!user || !userProfile?.is_active) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const adminApiRoutes = ["/api/admin/", "/api/users/"]; 
    if (adminApiRoutes.some(route => pathname.startsWith(route))) {
      if (userProfile.role !== "admin") {
        return new NextResponse(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", userProfile.role);
    if (userProfile.customer_id) {
      requestHeaders.set("x-user-customer", userProfile.customer_id);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!user || !userProfile || !userProfile.is_active) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesRoutes(adminRoutes)) {
    if (userProfile.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  if (matchesRoutes(customerRoutes)) {
    if (userProfile.role !== "customer") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


