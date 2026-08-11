import { z } from "zod";

export const accountTypeOptions = [
  { value: "professional", label: "Build My Professional Identity" },
  { value: "business", label: "Build My Business Presence" },
  { value: "consumer", label: "Find Businesses and Professionals" },
  { value: "institution", label: "Represent an Institution" },
  { value: "diaspora", label: "Connect Through the Diaspora" },
] as const;

const accountTypeValues = accountTypeOptions.map((o) => o.value) as [string, ...string[]];

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a name."),
    email: z.string().trim().email("That email address doesn't look right."),
    password: z.string().min(8, "Use at least 8 characters."),
    accountType: z.enum(accountTypeValues, { message: "Choose an account type." }),
    diasporaCountry: z.string().trim().optional(),
  })
  .refine((data) => data.accountType !== "diaspora" || (data.diasporaCountry && data.diasporaCountry.length > 0), {
    message: "Enter your country of residence.",
    path: ["diasporaCountry"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("That email address doesn't look right."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("That email address doesn't look right."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token."),
  password: z.string().min(8, "Use at least 8 characters."),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "Use at least 8 characters."),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
