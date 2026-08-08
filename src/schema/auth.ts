
import { z } from 'zod'

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

// OTP verification schema
export const otpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must contain only digits"),
})

// Register schema
export const registerSchema = z.object({
  uoid: z.string().min(1, "UOID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  registrationCode: z.string().min(1, "Registration code is required"),
  departmentId: z.string().optional(),
  batchId: z.string().optional(),
  section: z.enum(["A", "B", "C", "D", "E", "F"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
