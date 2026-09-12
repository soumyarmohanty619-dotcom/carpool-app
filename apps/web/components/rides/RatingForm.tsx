"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RatingForm({
  bookingId,
  rateeId,
  rateeName,
}: {
  bookingId: string;
  rateeId: string;
  rateeName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
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

    const { error: insertError } = await supabase.from("ratings").insert({
      booking_id: bookingId,
      rater_id: user.id,
      ratee_id: rateeId,
      score,
      comment: comment || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-neutral-900 underline">
        Rate {rateeName}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className={value <= score ? "text-lg text-amber-500" : "text-lg text-neutral-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Optional comment"
        rows={2}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit rating"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
