"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALL_ROLES, type AppRole } from "@carpool/shared";

const ROLE_LABELS: Record<AppRole, string> = {
  rider: "I want to book rides",
  driver: "I want to offer rides",
};

export function RoleSelectionForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<AppRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: AppRole) {
    setSelected((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selected.length === 0) {
      setError("Pick at least one — you can add the other later.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ roles: selected })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {ALL_ROLES.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-300 px-3 py-2 text-sm has-[:checked]:border-neutral-900"
          >
            <input
              type="checkbox"
              checked={selected.includes(role)}
              onChange={() => toggleRole(role)}
              className="h-4 w-4"
            />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
