// self.addEventListener("push", (event) => {
//   if (!event.data) return;

//   const data = event.data.json();

//   event.waitUntil(
//     self.registration.showNotification(
//       data.title || "JS Fashion",
//       {
//         body: data.body || "New notification",
//         icon: data.icon || "/favicon.ico",
//         badge: "/favicon.ico",
//         requireInteraction: true,
//         data: data.data || {},
//       }
//     )
//   );
// });

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();

//   const orderId = event.notification.data?.orderId;

//   const url = orderId
//     ? `/ad-order?orderId=${encodeURIComponent(orderId)}`
//     : "/ad-order";

//   event.waitUntil(
//     clients.openWindow(url)
//   );
// });




self.addEventListener("push", (event) => {
  console.log("🔔 Push event received");

  let data = {};

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error("❌ Push payload JSON error:", error);

    data = {
      title: "JS Fashion",
      body: event.data?.text() || "New notification",
    };
  }

  const title = data.title || "JS Fashion";

  const options = {
    body: data.body || "New notification",

    icon: data.icon || "/favicon.ico",

    badge: data.badge || "/favicon.ico",

    requireInteraction: true,

    data: {
      ...(data.data || {}),
      orderId:
        data.orderId ||
        data.data?.orderId ||
        null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked");

  event.notification.close();

  const orderId =
    event.notification.data?.orderId;

  const url = orderId
    ? `/ad-order?orderId=${encodeURIComponent(orderId)}`
    : "/ad-order";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {

        // Already opened Admin page
        for (const client of clientList) {
          if (
            client.url.includes("/ad-order") ||
            client.url.includes("/admin")
          ) {
            return client
              .navigate(url)
              .then(() => client.focus());
          }
        }

        // Open new Admin page
        if (clients.openWindow) {
          return clients.openWindow(url);
        }

        return null;
      })
  );
});