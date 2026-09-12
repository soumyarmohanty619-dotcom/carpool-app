// Receives Stripe webhook events. Deployed with --no-verify-jwt since
// Stripe calls this with no Supabase JWT — the Stripe-Signature header is
// the only auth this endpoint trusts. This is the *only* place `paid_at`
// gets set: never trust the client-side redirect for that.
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing Stripe-Signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    // constructEventAsync — Deno's runtime needs the async variant of
    // Stripe's signature check (no synchronous WebCrypto access).
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, booking_id, status")
      .eq("stripe_checkout_session_id", session.id)
      .single();

    if (payment && payment.status !== "succeeded") {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "succeeded",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("bookings")
        .update({ paid_at: new Date().toISOString() })
        .eq("id", payment.booking_id);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
