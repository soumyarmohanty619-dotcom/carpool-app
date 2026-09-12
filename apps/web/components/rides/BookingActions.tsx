"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@carpool/shared";

export function BookingActions({
  bookingId,
  status,
  role,
}: {
  bookingId: string;
  status: BookingStatus;
  role: "driver" | "rider";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: BookingStatus) {
    setPending(next);
    setError(null);
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: next })
      .eq("id", bookingId);
    setPending(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  const actions: { label: string; next: BookingStatus }[] =
    role === "driver"
      ? status === "requested"
        ? [
            { label: "Accept", next: "accepted" },
            { label: "Decline", next: "declined" },
          ]
        : status === "accepted"
          ? [{ label: "Mark completed", next: "completed" }]
          : []
      : status === "requested" || status === "accepted"
        ? [{ label: "Cancel", next: "cancelled" }]
        : [];

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {actions.map((action) => (
        <button
          key={action.next}
          onClick={() => setStatus(action.next)}
          disabled={pending !== null}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          {pending === action.next ? "…" : action.label}
        </button>
      ))}
    </div>
  );
}
