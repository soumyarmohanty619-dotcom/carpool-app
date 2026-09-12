import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRole } from "@carpool/shared";
import { PostRideForm } from "@/components/rides/PostRideForm";

export default async function NewRidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("roles").eq("id", user.id).single();

  if (!profile || !hasRole(profile, "driver")) {
    return (
      <main className="mx-auto flex max-w-sm flex-col justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Driver mode required</h1>
        <p className="text-sm text-neutral-600">
          Posting a ride needs the driver role on your account. Set up a driver account (or pick
          both rider and driver next time you sign up) to post rides.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Post a ride</h1>
        <p className="mt-1 text-sm text-neutral-600">Riders will be able to find and request this.</p>
      </div>
      <PostRideForm />
    </main>
  );
}
