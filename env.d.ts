declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;

    SERVICEM8_CLIENT_ID: string;
    SERVICEM8_CLIENT_SECRET: string;
    SERVICEM8_REDIRECT_URI: string;

    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  }
}


