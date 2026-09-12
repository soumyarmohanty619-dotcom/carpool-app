import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { needsRoleSelection } from "@carpool/shared";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roles")
    .eq("id", user.id)
    .single();

  if (!profile || needsRoleSelection(profile)) {
    redirect("/role-selection");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-3 px-4 py-16">
      <h1 className="text-2xl font-semibold">
        {profile.full_name ? `Welcome, ${profile.full_name}` : "Welcome"}
      </h1>
      <p className="text-sm text-neutral-600">Signed in as {profile.roles.join(" & ")}.</p>
    </main>
  );
}
