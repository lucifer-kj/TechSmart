import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

async function main() {
  // Prefer .env.local if present, fallback to .env
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), '.env');
  dotenv.config({ path: envPath });

  console.log('Loading env from:', envPath);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    console.error({ url, hasServiceRoleKey: Boolean(serviceRoleKey) });
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey);

  const email = `diag_${Date.now()}@example.com`;
  const password = 'Abcd1234!';

  console.log('--- Diagnose: Supabase Auth Admin Create User ---');
  console.log('Project URL:', url);
  console.log('Service role key preview:', serviceRoleKey.slice(0, 6) + '...' + serviceRoleKey.slice(-4));
  console.log('Test email:', email);

  let createdUserId: string | null = null;

  try {
    console.log('Creating auth user via admin API...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { source: 'diagnostic-script' }
    });

    if (error) {
      console.error('Auth admin createUser error:', error);
      process.exit(2);
    }

    console.log('Auth admin createUser success:', {
      userId: data?.user?.id,
      email: data?.user?.email,
      createdAt: data?.user?.created_at
    });

    createdUserId = data?.user?.id ?? null;

    // Sanity: Try a second create with same email to capture duplicate error message (expected failure)
    console.log('Attempting duplicate create to verify duplicate handling...');
    const dup = await supabase.auth.admin.createUser({ email, password });
    if (dup.error) {
      console.log('Duplicate create expected error:', dup.error.message);
    } else {
      console.warn('Duplicate create unexpectedly succeeded (check project settings).');
    }
  } catch (e) {
    console.error('Unexpected diagnostic error:', e);
    process.exit(3);
  } finally {
    if (createdUserId) {
      console.log('Cleaning up diagnostic auth user:', createdUserId);
      const { error: delErr } = await supabase.auth.admin.deleteUser(createdUserId);
      if (delErr) {
        console.error('Failed to delete diagnostic user:', delErr);
      } else {
        console.log('Diagnostic user deleted.');
      }
    }
  }

  console.log('--- Diagnose complete ---');
}

main();


