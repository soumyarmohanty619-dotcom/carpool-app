import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-600">You'll pick rider, driver, or both next.</p>
      </div>
      <SignUpForm />
      <p className="text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-neutral-900 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
