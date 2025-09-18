export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
	try {
		const reg = await navigator.serviceWorker.register('/sw.js');
		return reg;
	} catch (err) {
		console.error('Service worker registration failed', err);
		return null;
	}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
	try {
		const perm = await Notification.requestPermission();
		return perm;
	} catch (err) {
		console.error('Permission request failed', err);
		return 'denied';
	}
}

export async function subscribeToPush(applicationServerKey?: string | Uint8Array) {
	const reg = await registerServiceWorker();
	if (!reg) throw new Error('Service worker not registered');
	if (!('pushManager' in reg)) throw new Error('Push not supported');

	const existing = await reg.pushManager.getSubscription();
	if (existing) return existing;

    const vapidKey = typeof applicationServerKey === 'string'
        ? urlBase64ToUint8Array(applicationServerKey)
        : applicationServerKey;

    const applicationServerKeyBuffer: BufferSource | undefined = vapidKey
        ? (vapidKey as unknown as BufferSource)
        : undefined;

    return reg.pushManager.subscribe({
		userVisibleOnly: true,
        applicationServerKey: applicationServerKeyBuffer,
	});
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}


