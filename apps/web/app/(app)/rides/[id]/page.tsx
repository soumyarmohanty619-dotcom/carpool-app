import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookRideForm } from "@/components/rides/BookRideForm";

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: ride } = await supabase.from("rides").select("*").eq("id", id).single();
  if (!ride) notFound();

  const { data: driver } = await supabase
    .from("public_profiles")
    .select("full_name")
    .eq("id", ride.driver_id)
    .single();

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, status, seats_booked")
    .eq("ride_id", id)
    .eq("rider_id", user.id)
    .maybeSingle();

  const isOwnRide = ride.driver_id === user.id;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">
          {ride.origin_text} → {ride.destination_text}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {new Date(ride.departure_at).toLocaleString()} · driven by {driver?.full_name ?? "Driver"}
        </p>
        <p className="text-sm text-neutral-600">
          {ride.seats_available} of {ride.seats_total} seats left ·{" "}
          {ride.price_cents > 0 ? `$${(ride.price_cents / 100).toFixed(2)} / seat` : "Free"}
        </p>
      </div>

      {isOwnRide ? (
        <p className="text-sm text-neutral-600">This is your own ride — manage requests from My Rides.</p>
      ) : existingBooking ? (
        <p className="text-sm text-neutral-600">
          Your request is <span className="font-medium">{existingBooking.status}</span>.
        </p>
      ) : ride.seats_available > 0 && ride.status === "active" ? (
        <BookRideForm rideId={ride.id} maxSeats={ride.seats_available} />
      ) : (
        <p className="text-sm text-neutral-600">This ride is no longer available.</p>
      )}
    </main>
  );
}
