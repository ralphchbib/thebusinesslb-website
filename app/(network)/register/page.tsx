import type { Metadata } from "next";
import { RegisterForm } from "@/components/network/register-form";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <RegisterForm />
    </div>
  );
}
