import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/network/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
