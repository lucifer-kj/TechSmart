declare namespace NodeJS {
  interface ProcessEnv {
    // NextAuth removed; using Supabase Auth

    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

    SERVICEM8_API_KEY?: string;
    SERVICEM8_CUSTOMER_UUID?: string; // Optional - will be auto-detected from API key
    SERVICEM8_WEBHOOK_SECRET?: string;

    // Feature flags for portal replacement rollout (Section 09)
    FEATURES_INVITATIONS_ENABLED?: string; // "true" | "false"
    FEATURES_PASSWORDLESS_CUSTOMER_LOGIN?: string; // "true" | "false"
    FEATURES_ADMIN_LINK_EXISTING_USER?: string; // "true" | "false"
  }
}


