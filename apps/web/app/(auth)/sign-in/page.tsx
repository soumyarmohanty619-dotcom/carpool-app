import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-600">Sign in to book or offer a ride.</p>
      </div>
      <SignInForm />
      <p className="text-sm text-neutral-600">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-neutral-900 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
