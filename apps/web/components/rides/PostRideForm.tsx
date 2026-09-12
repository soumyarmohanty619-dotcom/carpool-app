"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PostRideForm() {
  const router = useRouter();
  const supabase = createClient();
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [priceDollars, setPriceDollars] = useState("");
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

    const priceCents = priceDollars ? Math.round(parseFloat(priceDollars) * 100) : 0;

    const { data: ride, error: insertError } = await supabase
      .from("rides")
      .insert({
        driver_id: user.id,
        origin_text: originText,
        destination_text: destinationText,
        departure_at: new Date(departureAt).toISOString(),
        seats_total: seatsTotal,
        seats_available: seatsTotal,
        price_cents: priceCents,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError || !ride) {
      setError(insertError?.message ?? "Could not post this ride.");
      return;
    }

    router.replace(`/rides/${ride.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="origin" className="text-sm font-medium text-neutral-700">
          From
        </label>
        <input
          id="origin"
          required
          value={originText}
          onChange={(event) => setOriginText(event.target.value)}
          placeholder="e.g. Downtown Austin"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="destination" className="text-sm font-medium text-neutral-700">
          To
        </label>
        <input
          id="destination"
          required
          value={destinationText}
          onChange={(event) => setDestinationText(event.target.value)}
          placeholder="e.g. Houston"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="departure" className="text-sm font-medium text-neutral-700">
          Departure
        </label>
        <input
          id="departure"
          type="datetime-local"
          required
          value={departureAt}
          onChange={(event) => setDepartureAt(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="seats" className="text-sm font-medium text-neutral-700">
            Seats
          </label>
          <input
            id="seats"
            type="number"
            min={1}
            max={8}
            required
            value={seatsTotal}
            onChange={(event) => setSeatsTotal(Number(event.target.value))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium text-neutral-700">
            Price per seat (USD)
          </label>
          <input
            id="price"
            type="number"
            min={0}
            step="0.01"
            value={priceDollars}
            onChange={(event) => setPriceDollars(event.target.value)}
            placeholder="0.00"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Posting…" : "Post ride"}
      </button>
    </form>
  );
}
