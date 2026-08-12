import type { Metadata } from "next";
import { getNetworkUser } from "@/lib/network/session";
import { ChangePasswordForm } from "@/components/network/change-password-form";
import { ChangeEmailForm } from "@/components/network/change-email-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getNetworkUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Settings</h1>
        <dl className="mt-4 flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between border-b border-n200 pb-2">
            <dt className="text-n500">Email</dt>
            <dd className="text-ink">{user?.email}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt className="text-n500">Account type</dt>
            <dd className="capitalize text-ink">{user?.accountType}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Change email</h2>
        <p className="mt-1 text-[13px] text-n500">
          We&rsquo;ll send a confirmation link to your new address before it takes effect.
        </p>
        <div className="mt-4">
          <ChangeEmailForm currentEmail={user?.email ?? ""} />
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
