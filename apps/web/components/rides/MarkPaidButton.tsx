"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ paid_at: new Date().toISOString() })
      .eq("id", bookingId);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        {submitting ? "…" : "Mark as paid"}
      </button>
    </div>
  );
}
