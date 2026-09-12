import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export function AppNav() {
  return (
    <nav className="mx-auto flex max-w-lg flex-wrap items-center gap-4 px-4 pt-6 text-sm text-neutral-600">
      <Link href="/home" className="font-medium text-neutral-900">
        Carpool
      </Link>
      <Link href="/rides">Find a ride</Link>
      <Link href="/rides/new">Post a ride</Link>
      <Link href="/my-bookings">My bookings</Link>
      <Link href="/my-rides">My rides</Link>
      <SignOutButton />
    </nav>
  );
}
