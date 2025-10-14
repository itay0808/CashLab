import { z } from 'zod';

// Authentication validation schemas
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

export const signUpSchema = signInSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be less than 100 characters" }),
});

// Transaction validation schemas
export const transactionSchema = z.object({
  amount: z
    .number()
    .positive({ message: "Amount must be greater than 0" })
    .max(1000000000, { message: "Amount too large" }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be less than 500 characters" }),
  notes: z
    .string()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .optional(),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be either income or expense" }),
  }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  recurring: z.enum(['no', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).default('no'),
  recurringEnd: z.string().optional(),
});

// Budget validation schemas
export const budgetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Budget name is required" })
    .max(200, { message: "Budget name must be less than 200 characters" }),
  amount: z
    .number()
    .positive({ message: "Amount must be greater than 0" })
    .max(1000000000, { message: "Amount too large" }),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: "Invalid period selected" }),
  }),
  categoryId: z.string().uuid({ message: "Invalid category" }),
  alertThreshold: z
    .number()
    .min(50, { message: "Alert threshold must be at least 50%" })
    .max(100, { message: "Alert threshold cannot exceed 100%" }),
});

// Profile validation schemas
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  currency: z
    .string()
    .length(3, { message: "Currency code must be 3 characters" })
    .regex(/^[A-Z]{3}$/, { message: "Invalid currency code format" }),
});

// Type exports for use in components
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
