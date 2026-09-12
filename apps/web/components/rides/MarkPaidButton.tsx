"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ url: string }>(
      "create-checkout-session",
      { body: { bookingId, returnBaseUrl: window.location.origin } }
    );
    if (invokeError || !data?.url) {
      setSubmitting(false);
      setError(invokeError?.message ?? "Could not start checkout.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        {submitting ? "…" : "Pay now"}
      </button>
    </div>
  );
}
