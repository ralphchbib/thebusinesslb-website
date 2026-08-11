import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/network/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
