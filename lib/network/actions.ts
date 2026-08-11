"use server";

import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { setNetworkSessionCookie, clearNetworkSessionCookie, getNetworkUser } from "@/lib/network/session";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validation/network-schemas";

export interface NetworkFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_LOGIN_ERROR = "That email or password isn't right.";

/**
 * Registration only creates the account — it deliberately does NOT log the
 * user in immediately. Payload's own login operation throws UnverifiedEmail
 * for an unverified account when auth.verify is enabled (confirmed by
 * reading auth/operations/login.js directly), so attempting to log in here
 * would simply fail. The account becomes usable once the user verifies via
 * the emailed link — see verifyEmailAction below.
 */
export async function registerAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { status: "success" };
  }
  const startedAt = Number(formData.get("form_started_at") ?? 0);
  if (startedAt && Date.now() - startedAt < 3000) {
    return { status: "success" };
  }

  const allowed = await checkThrottle("network-register");
  if (!allowed) {
    return { status: "error", message: "Too many attempts from this connection. Try again in an hour." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse({
    name: raw.name,
    email: raw.email,
    password: raw.password,
    accountType: raw.accountType,
    diasporaCountry: raw.diasporaCountry,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  try {
    await payload.create({
      collection: "network-accounts",
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        accountType: parsed.data.accountType,
        diasporaCountry: parsed.data.diasporaCountry,
      },
    });
  } catch (err) {
    console.error("[network:register:error]", err);
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
      return {
        status: "error",
        message: "An account with that email already exists.",
        fieldErrors: { email: "Already registered." },
      };
    }
    return { status: "error", message: "Something went wrong creating your account. Please try again." };
  }

  return {
    status: "success",
    message: "Check your email to verify your account before logging in.",
  };
}

export async function loginAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const allowed = await checkThrottle("network-login");
  if (!allowed) {
    return { status: "error", message: "Too many attempts from this connection. Try again shortly." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? GENERIC_LOGIN_ERROR };
  }

  const payload = await getCms();
  try {
    const result = await payload.login({
      collection: "network-accounts",
      data: { email: parsed.data.email, password: parsed.data.password },
    });
    if (!result.token) {
      return { status: "error", message: GENERIC_LOGIN_ERROR };
    }
    await setNetworkSessionCookie(result.token, result.exp);
  } catch (err) {
    // Payload throws AuthenticationError / UnverifiedEmail / LockedAuth —
    // deliberately not distinguished in the message shown to the visitor,
    // to avoid confirming whether an email is registered.
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("verify")) {
      return { status: "error", message: "Verify your email before logging in — check your inbox." };
    }
    return { status: "error", message: GENERIC_LOGIN_ERROR };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearNetworkSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const allowed = await checkThrottle("network-forgot-password");
  if (!allowed) {
    return { status: "error", message: "Too many attempts. Try again shortly." };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "That email doesn't look right." };
  }

  const payload = await getCms();
  try {
    await payload.forgotPassword({ collection: "network-accounts", data: { email: parsed.data.email } });
  } catch (err) {
    // Never disclose whether the email exists — log server-side, tell the
    // visitor the same success message regardless.
    console.error("[network:forgot-password:error]", err);
  }

  return {
    status: "success",
    message: "If that email is registered, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  try {
    const result = await payload.resetPassword({
      collection: "network-accounts",
      data: { token: parsed.data.token, password: parsed.data.password },
      overrideAccess: true,
    });
    if (result.token) {
      await setNetworkSessionCookie(result.token);
    }
  } catch (err) {
    console.error("[network:reset-password:error]", err);
    return { status: "error", message: "That reset link is invalid or has expired. Request a new one." };
  }

  redirect("/dashboard");
}

/**
 * Requires re-entering the current password (verified via a real
 * payload.login() call, not just a session check) before allowing a
 * change — a stolen/left-open dashboard session alone isn't enough to
 * lock the real owner out.
 */
export async function changePasswordAction(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const user = await getNetworkUser();
  if (!user) {
    return { status: "error", message: "Your session has expired. Please log in again." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  try {
    await payload.login({
      collection: "network-accounts",
      data: { email: user.email, password: parsed.data.currentPassword },
    });
  } catch {
    return {
      status: "error",
      message: "Current password is incorrect.",
      fieldErrors: { currentPassword: "Incorrect." },
    };
  }

  await payload.update({
    collection: "network-accounts",
    id: user.id,
    data: { password: parsed.data.newPassword },
  });

  return { status: "success", message: "Password updated." };
}
