import webpush from "web-push";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // CORS
    // =====================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // =====================================================
    // TEST WORKER
    // =====================================================

    if (url.pathname === "/" && request.method === "GET") {
      return json({
        success: true,
        message: "Shop Notification Worker is working!",
      });
    }

    // =====================================================
    // SAVE ADMIN PUSH SUBSCRIPTION
    // =====================================================

    if (
      url.pathname === "/subscribe" &&
      request.method === "POST"
    ) {
      try {
        const subscription = await request.json();

        console.log(
          "📥 Admin subscription received"
        );

        // Validate subscription
        if (
          !subscription ||
          !subscription.endpoint ||
          !subscription.keys ||
          !subscription.keys.p256dh ||
          !subscription.keys.auth
        ) {
          console.error(
            "❌ Invalid push subscription"
          );

          return json(
            {
              success: false,
              error: "Invalid push subscription",
            },
            400
          );
        }

        // Save subscription in KV
        await env.ADMIN_SUBSCRIPTIONS.put(
          "admin",
          JSON.stringify(subscription)
        );

        console.log(
          "✅ Admin subscription saved successfully"
        );

        return json({
          success: true,
          message: "Admin subscription saved",
        });
      } catch (error) {
        console.error(
          "❌ Subscribe error:",
          error
        );

        return json(
          {
            success: false,
            error:
              error?.message ||
              "Failed to save subscription",
          },
          500
        );
      }
    }

    // =====================================================
    // SEND ADMIN NOTIFICATION
    // =====================================================

    if (
      url.pathname === "/send-notification" &&
      request.method === "POST"
    ) {
      try {
        // -------------------------------------------------
        // Read request
        // -------------------------------------------------

        const payload = await request.json();

        console.log(
          "📨 Notification request received"
        );

        console.log(
          "📦 Payload:",
          JSON.stringify(payload)
        );

        // -------------------------------------------------
        // Check KV binding
        // -------------------------------------------------

        if (!env.ADMIN_SUBSCRIPTIONS) {
          console.error(
            "❌ ADMIN_SUBSCRIPTIONS KV binding missing"
          );

          return json(
            {
              success: false,
              error:
                "ADMIN_SUBSCRIPTIONS KV binding is missing",
            },
            500
          );
        }

        // -------------------------------------------------
        // Get admin subscription
        // -------------------------------------------------

        const subscriptionString =
          await env.ADMIN_SUBSCRIPTIONS.get(
            "admin"
          );

        if (!subscriptionString) {
          console.error(
            "❌ Admin device is not subscribed"
          );

          return json(
            {
              success: false,
              error:
                "Admin device is not subscribed",
            },
            404
          );
        }

        // -------------------------------------------------
        // Parse subscription
        // -------------------------------------------------

        let subscription;

        try {
          subscription =
            JSON.parse(subscriptionString);
        } catch (parseError) {
          console.error(
            "❌ Invalid saved subscription:",
            parseError
          );

          await env.ADMIN_SUBSCRIPTIONS.delete(
            "admin"
          );

          return json(
            {
              success: false,
              error:
                "Saved admin subscription is invalid",
            },
            500
          );
        }

        // -------------------------------------------------
        // Validate subscription
        // -------------------------------------------------

        if (
          !subscription.endpoint ||
          !subscription.keys?.p256dh ||
          !subscription.keys?.auth
        ) {
          console.error(
            "❌ Saved subscription is incomplete"
          );

          await env.ADMIN_SUBSCRIPTIONS.delete(
            "admin"
          );

          return json(
            {
              success: false,
              error:
                "Saved admin subscription is invalid",
            },
            500
          );
        }

        // -------------------------------------------------
        // Check VAPID environment variables
        // -------------------------------------------------

        if (!env.VAPID_PUBLIC_KEY) {
          console.error(
            "❌ VAPID_PUBLIC_KEY is missing"
          );

          return json(
            {
              success: false,
              error:
                "VAPID_PUBLIC_KEY is missing in Worker environment variables",
            },
            500
          );
        }

        if (!env.VAPID_PRIVATE_KEY) {
          console.error(
            "❌ VAPID_PRIVATE_KEY is missing"
          );

          return json(
            {
              success: false,
              error:
                "VAPID_PRIVATE_KEY is missing in Worker environment variables",
            },
            500
          );
        }

        // -------------------------------------------------
        // Configure VAPID
        // -------------------------------------------------

        webpush.setVapidDetails(
          "mailto:your-email@example.com",
          env.VAPID_PUBLIC_KEY,
          env.VAPID_PRIVATE_KEY
        );

        // -------------------------------------------------
        // Notification data
        // -------------------------------------------------

        const notification = {
          title:
            payload?.title ||
            "🛒 New Order Received",

          body:
            payload?.body ||
            "You have a new order.",

          icon:
            payload?.icon ||
            "/favicon.ico",

          badge:
            payload?.badge ||
            "/favicon.ico",

          data: {
            orderId:
              payload?.orderId || null,
          },
        };

        console.log(
          "🔔 Sending notification..."
        );

        // -------------------------------------------------
        // SEND PUSH
        // -------------------------------------------------

        const result =
          await webpush.sendNotification(
            subscription,
            JSON.stringify(notification)
          );

        console.log(
          "✅ Push notification sent"
        );

        console.log(
          "📡 Push response status:",
          result?.statusCode
        );

        return json({
          success: true,
          message:
            "Notification sent to admin device",
          statusCode:
            result?.statusCode || 201,
        });
      } catch (error) {
        // =================================================
        // WEB PUSH ERROR
        // =================================================

        console.error(
          "❌ Notification error:",
          error
        );

        console.error(
          "❌ Error message:",
          error?.message
        );

        console.error(
          "❌ Status Code:",
          error?.statusCode
        );

        console.error(
          "❌ Response Body:",
          error?.body
        );

        console.error(
          "❌ Headers:",
          error?.headers
        );

        // -------------------------------------------------
        // Subscription expired / invalid
        // -------------------------------------------------

        if (
          error?.statusCode === 404 ||
          error?.statusCode === 410
        ) {
          console.log(
            "🗑️ Removing expired admin subscription..."
          );

          try {
            await env.ADMIN_SUBSCRIPTIONS.delete(
              "admin"
            );

            console.log(
              "✅ Expired subscription removed"
            );
          } catch (deleteError) {
            console.error(
              "❌ Failed to delete subscription:",
              deleteError
            );
          }
        }

        // -------------------------------------------------
        // Return detailed error
        // -------------------------------------------------

        return json(
          {
            success: false,

            error:
              error?.message ||
              "Notification sending failed",

            statusCode:
              error?.statusCode || null,

            body:
              error?.body || null,
          },
          500
        );
      }
    }

    if (env.ASSETS) {
      const assetResponse =
        await env.ASSETS.fetch(request);

      if (
        assetResponse.status !== 404 ||
        !request.headers
          .get("Accept")
          ?.includes("text/html")
      ) {
        return assetResponse;
      }

      return env.ASSETS.fetch(
        new Request(
          new URL("/", request.url),
          request
        )
      );
    }

    if (
      request.method === "GET" &&
      request.headers.get("Accept")?.includes("text/html")
    ) {
      return fetch(
        new Request(
          new URL("/", request.url),
          request
        )
      );
    }

    // =====================================================
    // NOT FOUND
    // =====================================================

    return json(
      {
        success: false,
        error: "Not found",
      },
      404
    );
  },
};

// =========================================================
// CORS HEADERS
// =========================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Max-Age": "86400",
  };
}

// =========================================================
// JSON RESPONSE
// =========================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",

        ...corsHeaders(),
      },
    }
  );
}