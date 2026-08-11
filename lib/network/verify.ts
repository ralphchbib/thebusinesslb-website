import { getCms } from "@/lib/cms/client";

/**
 * Plain server-side helper, not a Server Action — called directly from
 * app/(network)/verify-email/page.tsx's own render (a Server Component
 * already runs exclusively on the server, so it doesn't need "use server"
 * indirection for a read-only-at-render operation like this one).
 */
export async function verifyNetworkEmail(token: string): Promise<boolean> {
  const payload = await getCms();
  try {
    const verified = await payload.verifyEmail({ collection: "network-accounts", token });
    return Boolean(verified);
  } catch (err) {
    console.error("[network:verify-email:error]", err);
    return false;
  }
}
