import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

function corsResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// OPTIONS route for CORS preflight
http.route({
  path: "/api/create-order",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/api/verify-payment",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// POST /api/create-order
http.route({
  path: "/api/create-order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { amount, currency, receipt } = await request.json();
      
      if (!amount || amount < 100) {
        return corsResponse({ error: "Amount must be at least 100 paise (₹1)" }, 400);
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return corsResponse({ error: "Razorpay keys not configured on server" }, 500);
      }

      // Call Razorpay API
      const auth = btoa(`${keyId}:${keySecret}`);
      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount,
          currency: currency || "INR",
          receipt: receipt || `receipt_${Date.now()}`,
        }),
      });

      if (!razorpayResponse.ok) {
        const errText = await razorpayResponse.text();
        console.error("Razorpay order creation failed:", errText);
        return corsResponse({ error: "Failed to create order with Razorpay" }, 500);
      }

      const order = await razorpayResponse.json();
      return corsResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });

    } catch (err) {
      console.error(err);
      return corsResponse({ error: "Internal Server Error" }, 500);
    }
  }),
});

// POST /api/verify-payment
http.route({
  path: "/api/verify-payment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return corsResponse({ error: "Missing required fields" }, 400);
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return corsResponse({ error: "Razorpay keys not configured on server" }, 500);
      }

      // Generate expected signature
      const { createHmac } = await import("crypto");
      const generated_signature = createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return corsResponse({ error: "Signature mismatch. Payment verification failed." }, 400);
      }

      return corsResponse({ success: true, message: "Payment verified successfully" });

    } catch (err) {
      console.error(err);
      return corsResponse({ error: "Internal Server Error" }, 500);
    }
  }),
});

export default http;
