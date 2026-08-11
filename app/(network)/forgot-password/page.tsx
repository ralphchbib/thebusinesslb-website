import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/network/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <ForgotPasswordForm />
    </div>
  );
}
