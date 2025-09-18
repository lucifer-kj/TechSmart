"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPush, requestNotificationPermission } from "@/lib/push-notifications";

type Props = {
	vapidPublicKey?: string;
};

export function NotificationPermission({ vapidPublicKey }: Props) {
	const [permission, setPermission] = useState<NotificationPermission>('default');
	const [subscribing, setSubscribing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window !== 'undefined' && 'Notification' in window) {
			setPermission(Notification.permission);
		}
	}, []);

	const handleEnable = async () => {
		setError(null);
		setSubscribing(true);
		try {
			const perm = await requestNotificationPermission();
			setPermission(perm);
			if (perm !== 'granted') {
				setError('Notifications were not granted.');
				return;
			}
			const sub = await subscribeToPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || vapidPublicKey);
			await fetch('/api/notifications/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(sub),
			});
		} catch (e: unknown) {
			setError((e as Error).message);
		} finally {
			setSubscribing(false);
		}
	};

	if (permission === 'granted') return null;

	return (
		<div className="border rounded p-3 bg-yellow-50 dark:bg-yellow-900/20 text-sm">
			<p className="mb-2">Enable browser notifications to receive job updates and payment alerts.</p>
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={handleEnable} disabled={subscribing}>
					{subscribing ? 'Enabling…' : 'Enable Notifications'}
				</Button>
				{error && <span className="text-red-600 dark:text-red-400">{error}</span>}
			</div>
		</div>
	);
}


