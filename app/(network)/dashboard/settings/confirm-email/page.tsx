import type { Metadata } from "next";
import Link from "next/link";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { verifyEmailChangeToken } from "@/lib/network/email-change";

export const metadata: Metadata = { title: "Confirm email change" };

/**
 * Phase 9D — reached only from the confirmation link emailed to the *new*
 * address by requestEmailChangeAction. Lives under dashboard/, so the
 * existing dashboard/layout.tsx auth gate applies unchanged. Beyond the
 * token's own signature/expiry, this also requires the token's accountId
 * to match the currently logged-in session — defense in depth against a
 * token leaking to someone else's browser (e.g. a shared inbox).
 *
 * Performs the actual email update directly during this Server Component's
 * render, mirroring the exact pattern app/(network)/verify-email/page.tsx
 * already established for the equivalent one-time-link-confirms-a-change
 * case, rather than inventing a different shape for this one.
 */
export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getNetworkUser();

  if (!user) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Log in to confirm</h1>
        <p className="mt-3 text-[15px] text-n600">
          Log in, then open this link again from your email to finish changing your address.
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Missing confirmation link</h1>
        <p className="mt-3 text-[15px] text-n600">Open the link from your confirmation email.</p>
      </div>
    );
  }

  const payloadToken = verifyEmailChangeToken(token);
  if (!payloadToken || payloadToken.accountId !== String(user.id)) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">This link isn&rsquo;t valid</h1>
        <p className="mt-3 text-[15px] text-n600">
          It may have expired or already been used.{" "}
          <Link href="/dashboard/settings" className="text-petrol">
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  const payload = await getCms();
  try {
    await payload.update({
      collection: "network-accounts",
      id: user.id,
      data: { email: payloadToken.newEmail },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[network:confirm-email-change:error]", err);
    const message = err instanceof Error ? err.message : "";
    const inUse = message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate");
    return (
      <div className="rounded-lg border border-n200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">Couldn&rsquo;t confirm this change</h1>
        <p className="mt-3 text-[15px] text-n600">
          {inUse
            ? "That email is now used by another account."
            : "Something went wrong. Please request the change again."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-n200 bg-white p-8 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">Email updated</h1>
      <p className="mt-3 text-[15px] text-n600">
        Your login email is now {payloadToken.newEmail}.{" "}
        <Link href="/dashboard/settings" className="text-petrol">
          Back to Settings
        </Link>
      </p>
    </div>
  );
}
