import { z } from "zod";
import { env } from "@/server/config/env";

export const requestOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${env.otpLength}}$`), `Enter the ${env.otpLength}-digit code.`),
});
