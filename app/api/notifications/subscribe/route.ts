import { NextRequest, NextResponse } from 'next/server';

// Store subscription server-side. Here we forward to Supabase via RPC or REST.
// For now, persist in Supabase table `push_subscriptions` (assumed existing
// with columns: id, user_id, endpoint, p256dh, auth, created_at).

import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { endpoint, keys } = body || {};
		if (!endpoint || !keys?.p256dh || !keys?.auth) {
			return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
		}

		const supabase = await createServerClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		// Upsert by endpoint so duplicates are avoided
		const { error } = await supabase.from('push_subscriptions').upsert(
			{
				user_id: user.id,
				endpoint,
				p256dh: keys.p256dh,
				auth: keys.auth,
			},
			{ onConflict: 'endpoint' }
		);
		if (error) throw error;

		return NextResponse.json({ ok: true });
	} catch (e: unknown) {
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
}


