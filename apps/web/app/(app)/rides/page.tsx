import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("rides")
    .select("id, origin_text, destination_text, departure_at, seats_available, price_cents, driver_id")
    .eq("status", "active")
    .gt("seats_available", 0)
    .gt("departure_at", new Date().toISOString())
    .order("departure_at", { ascending: true })
    .limit(50);

  if (q) {
    query = query.or(`origin_text.ilike.%${q}%,destination_text.ilike.%${q}%`);
  }

  const { data: rides } = await query;

  const driverIds = [...new Set((rides ?? []).map((ride) => ride.driver_id))];
  const { data: drivers } = driverIds.length
    ? await supabase.from("public_profiles").select("id, full_name").in("id", driverIds)
    : { data: [] };
  const driverNames = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]));

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Find a ride</h1>
        <Link href="/rides/new" className="text-sm font-medium text-neutral-900 underline">
          Post a ride
        </Link>
      </div>
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by city…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {(rides ?? []).length === 0 ? (
          <p className="text-sm text-neutral-600">No upcoming rides match yet.</p>
        ) : (
          (rides ?? []).map((ride) => (
            <Link
              key={ride.id}
              href={`/rides/${ride.id}`}
              className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-400"
            >
              <p className="font-medium">
                {ride.origin_text} → {ride.destination_text}
              </p>
              <p className="text-sm text-neutral-600">
                {new Date(ride.departure_at).toLocaleString()} · {ride.seats_available} seat
                {ride.seats_available === 1 ? "" : "s"} left · {driverNames.get(ride.driver_id) ?? "Driver"}
              </p>
              <p className="text-sm text-neutral-600">
                {ride.price_cents > 0 ? `$${(ride.price_cents / 100).toFixed(2)}` : "Free"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
