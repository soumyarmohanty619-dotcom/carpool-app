import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingActions } from "@/components/rides/BookingActions";
import { RatingForm } from "@/components/rides/RatingForm";

export default async function MyRidesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: rides } = await supabase
    .from("rides")
    .select("id, origin_text, destination_text, departure_at, seats_available, seats_total")
    .eq("driver_id", user.id)
    .order("departure_at", { ascending: true });

  const rideIds = (rides ?? []).map((ride) => ride.id);
  const { data: bookings } = rideIds.length
    ? await supabase
        .from("bookings")
        .select("id, ride_id, rider_id, seats_booked, status, paid_at")
        .in("ride_id", rideIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const riderIds = [...new Set((bookings ?? []).map((booking) => booking.rider_id))];
  const { data: riders } = riderIds.length
    ? await supabase.from("public_profiles").select("id, full_name").in("id", riderIds)
    : { data: [] };
  const riderNames = new Map((riders ?? []).map((rider) => [rider.id, rider.full_name]));

  const bookingIds = (bookings ?? []).map((booking) => booking.id);
  const { data: myRatings } = bookingIds.length
    ? await supabase.from("ratings").select("booking_id").eq("rater_id", user.id).in("booking_id", bookingIds)
    : { data: [] };
  const ratedBookingIds = new Set((myRatings ?? []).map((rating) => rating.booking_id));

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">My rides</h1>
      {(rides ?? []).length === 0 ? (
        <p className="text-sm text-neutral-600">You haven&apos;t posted any rides yet.</p>
      ) : (
        (rides ?? []).map((ride) => {
          const rideBookings = (bookings ?? []).filter((booking) => booking.ride_id === ride.id);
          return (
            <div key={ride.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="font-medium">
                {ride.origin_text} → {ride.destination_text}
              </p>
              <p className="text-sm text-neutral-600">
                {new Date(ride.departure_at).toLocaleString()} · {ride.seats_available}/{ride.seats_total}{" "}
                seats free
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {rideBookings.length === 0 ? (
                  <p className="text-sm text-neutral-500">No requests yet.</p>
                ) : (
                  rideBookings.map((booking) => {
                    const riderName = riderNames.get(booking.rider_id) ?? "Rider";
                    return (
                      <div key={booking.id} className="flex flex-col gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>
                            {riderName} · {booking.seats_booked} seat{booking.seats_booked === 1 ? "" : "s"} ·{" "}
                            <span className="font-medium">{booking.status}</span>
                            {booking.paid_at ? " · paid" : " · unpaid"}
                          </span>
                          <BookingActions bookingId={booking.id} status={booking.status} role="driver" />
                        </div>
                        {booking.status === "completed" && !ratedBookingIds.has(booking.id) ? (
                          <RatingForm bookingId={booking.id} rateeId={booking.rider_id} rateeName={riderName} />
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
