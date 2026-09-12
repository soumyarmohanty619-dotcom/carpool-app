import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { needsRoleSelection } from "@carpool/shared";
import { RoleSelectionForm } from "@/components/auth/RoleSelectionForm";

export default async function RoleSelectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  if (profile && !needsRoleSelection(profile)) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">How will you use Carpool?</h1>
        <p className="mt-1 text-sm text-neutral-600">Pick one or both — you can change this later.</p>
      </div>
      <RoleSelectionForm userId={user.id} />
    </main>
  );
}
