// Creates a Stripe Checkout Session for a booking. Called by both the web
// and mobile clients via supabase.functions.invoke — the caller's JWT (sent
// automatically by the client SDK) scopes the booking lookup to normal RLS,
// so a rider can only ever create a session for their own booking.
import Stripe from "npm:stripe@22.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, returnBaseUrl } = await req.json();
    if (!bookingId || !returnBaseUrl) {
      return jsonError("bookingId and returnBaseUrl are required", 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Missing Authorization header", 401);

    // Scoped to the caller's JWT — reads go through normal RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Not authenticated", 401);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, rider_id, status, paid_at, seats_booked, ride_id, rides(price_cents, currency)")
      .eq("id", bookingId)
      .single();
    if (bookingError || !booking) return jsonError("Booking not found", 404);
    if (booking.rider_id !== user.id) return jsonError("Not your booking", 403);
    if (!["accepted", "completed"].includes(booking.status)) {
      return jsonError("Booking is not in a payable state", 400);
    }
    if (booking.paid_at) return jsonError("Booking is already paid", 400);

    const ride = booking.rides as unknown as { price_cents: number; currency: string } | null;
    if (!ride) return jsonError("Ride not found", 404);

    const amountCents = ride.price_cents * booking.seats_booked;
    const currency = ride.currency.toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: { name: "Carpool ride" },
          },
          quantity: 1,
        },
      ],
      metadata: { booking_id: booking.id },
      success_url: `${returnBaseUrl}/my-bookings?payment=success`,
      cancel_url: `${returnBaseUrl}/my-bookings?payment=cancelled`,
    });

    // Service-role client: clients have no insert grant on `payments`.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      booking_id: booking.id,
      stripe_checkout_session_id: session.id,
      amount_cents: amountCents,
      currency,
      status: "pending",
    });
    if (insertError) return jsonError(insertError.message, 500);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
