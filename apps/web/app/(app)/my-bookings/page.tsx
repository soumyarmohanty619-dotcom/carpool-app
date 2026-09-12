import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingActions } from "@/components/rides/BookingActions";
import { MarkPaidButton } from "@/components/rides/MarkPaidButton";
import { RatingForm } from "@/components/rides/RatingForm";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, seats_booked, status, paid_at, rides(origin_text, destination_text, departure_at, driver_id)")
    .eq("rider_id", user.id)
    .order("created_at", { ascending: false });

  const driverIds = [
    ...new Set((bookings ?? []).map((booking) => (booking.rides as { driver_id: string } | null)?.driver_id).filter(Boolean)),
  ] as string[];
  const { data: drivers } = driverIds.length
    ? await supabase.from("public_profiles").select("id, full_name").in("id", driverIds)
    : { data: [] };
  const driverNames = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]));

  const bookingIds = (bookings ?? []).map((booking) => booking.id);
  const { data: myRatings } = bookingIds.length
    ? await supabase.from("ratings").select("booking_id").eq("rater_id", user.id).in("booking_id", bookingIds)
    : { data: [] };
  const ratedBookingIds = new Set((myRatings ?? []).map((rating) => rating.booking_id));

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">My bookings</h1>
      {(bookings ?? []).length === 0 ? (
        <p className="text-sm text-neutral-600">No requests yet — go find a ride.</p>
      ) : (
        (bookings ?? []).map((booking) => {
          const ride = booking.rides as {
            origin_text: string;
            destination_text: string;
            departure_at: string;
            driver_id: string;
          } | null;
          const driverName = driverNames.get(ride?.driver_id ?? "") ?? "driver";
          return (
            <div key={booking.id} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {ride?.origin_text} → {ride?.destination_text}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {ride ? new Date(ride.departure_at).toLocaleString() : ""} · with {driverName} ·{" "}
                    {booking.seats_booked} seat{booking.seats_booked === 1 ? "" : "s"} ·{" "}
                    <span className="font-medium">{booking.status}</span>
                    {booking.paid_at ? " · paid" : ""}
                  </p>
                </div>
                <BookingActions bookingId={booking.id} status={booking.status} role="rider" />
              </div>
              {(booking.status === "accepted" || booking.status === "completed") && !booking.paid_at ? (
                <MarkPaidButton bookingId={booking.id} />
              ) : null}
              {booking.status === "completed" && !ratedBookingIds.has(booking.id) ? (
                <RatingForm bookingId={booking.id} rateeId={ride?.driver_id ?? ""} rateeName={driverName} />
              ) : null}
            </div>
          );
        })
      )}
    </main>
  );
}
