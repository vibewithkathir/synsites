import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Razorpay keys - read from Convex env vars (set via dashboard or CLI)
// Fallback to test keys for development
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_Svc7POJLumrDus";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "GIAetwoqMotVMtH737KUMB8n";

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function corsResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(),
  });
}

function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ── PREFLIGHT OPTIONS ─────────────────────────────────────────
http.route({
  path: "/api/create-order",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

http.route({
  path: "/api/verify-payment",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /api/create-order ────────────────────────────────────
http.route({
  path: "/api/create-order",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const body = await request.json();
      const { amount, currency, receipt } = body;

      if (!amount || amount < 100) {
        return corsResponse(
          { error: "Amount must be at least 100 paise (₹1)" },
          400
        );
      }

      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

      const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount,
          currency: currency || "INR",
          receipt: receipt || `rcpt_${Date.now()}`,
        }),
      });

      if (!razorpayRes.ok) {
        const errText = await razorpayRes.text();
        console.error("Razorpay create-order failed:", razorpayRes.status, errText);
        return corsResponse(
          { error: "Failed to create payment order. Please try again." },
          502
        );
      }

      const order = await razorpayRes.json();
      return corsResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err) {
      console.error("create-order error:", err);
      return corsResponse({ error: "Internal server error" }, 500);
    }
  }),
});

// ── POST /api/verify-payment ──────────────────────────────────
// Uses SubtleCrypto Web API (works in Convex edge runtime — NOT Node.js crypto)
http.route({
  path: "/api/verify-payment",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const body = await request.json();
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return corsResponse({ error: "Missing required payment fields" }, 400);
      }

      // ── HMAC-SHA256 via SubtleCrypto (edge-runtime compatible) ──
      const encoder = new TextEncoder();
      const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
      const message = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
      const signatureArray = new Uint8Array(signatureBuffer);
      const generatedSignature = Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (generatedSignature !== razorpay_signature) {
        console.error("Signature mismatch - payment verification failed");
        return corsResponse(
          { error: "Payment verification failed. Please contact support." },
          400
        );
      }

      return corsResponse({ success: true, message: "Payment verified successfully" });
    } catch (err) {
      console.error("verify-payment error:", err);
      return corsResponse({ error: "Internal server error during verification" }, 500);
    }
  }),
});

export default http;
