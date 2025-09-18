self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (_) {
		data = { title: 'Notification', body: event.data && event.data.text ? event.data.text() : '' };
	}

	const title = data.title || 'SmartTech Portal';
	const options = {
		body: data.body || '',
		icon: data.icon || '/icons/icon-192.png',
		badge: data.badge || '/icons/badge-72.png',
		data: data.data || {},
		tag: data.tag,
		renotify: !!data.tag,
		requireInteraction: !!data.requireInteraction,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification?.data?.url;
	if (!url) return;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if ('focus' in client) {
					if (client.url === url) return client.focus();
					return client.navigate(url).then((c) => c && c.focus());
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(url);
			}
		})
	);
});


