"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BookRideForm({ rideId, maxSeats }: { rideId: string; maxSeats: number }) {
  const router = useRouter();
  const supabase = createClient();
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("bookings").insert({
      ride_id: rideId,
      rider_id: user.id,
      seats_booked: seats,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="seats" className="text-sm font-medium text-neutral-700">
          Seats to request
        </label>
        <input
          id="seats"
          type="number"
          min={1}
          max={maxSeats}
          required
          value={seats}
          onChange={(event) => setSeats(Number(event.target.value))}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Requesting…" : "Request seat"}
      </button>
    </form>
  );
}
