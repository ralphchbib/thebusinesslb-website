import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyNetworkEmail } from "@/lib/network/verify";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Missing verification link</h1>
        <p className="mt-3 text-[15px] text-n600">
          Open the link from your verification email, or{" "}
          <Link href="/register" className="text-petrol">
            register again
          </Link>
          .
        </p>
      </div>
    );
  }

  const success = await verifyNetworkEmail(token);

  if (success) {
    redirect("/login?verified=true");
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-n200 bg-white p-8 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">This link isn&rsquo;t valid</h1>
      <p className="mt-3 text-[15px] text-n600">
        It may have already been used or expired.{" "}
        <Link href="/register" className="text-petrol">
          Register again
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-petrol">
          try logging in
        </Link>
        .
      </p>
    </div>
  );
}
