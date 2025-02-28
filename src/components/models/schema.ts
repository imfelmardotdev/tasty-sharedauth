import * as z from "zod";

// Form Schema
export const formSchema = z.object({
  totp_secret: z.string()
    .min(16, "TOTP secret must be at least 16 characters")
    .optional()
    .transform(val => val || null), // Transform empty string to null
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  code: z.string().min(6, "Code must be at least 6 characters"),
  link: z.string()
    .optional()
    .transform(val => val || null), // Transform empty string to null
});

// Inferred Types
export type FormValues = z.infer<typeof formSchema>;

// Helper functions
export const parseFormData = (data: FormValues) => ({
  ...data,
  // Convert empty strings to null for Supabase
  totp_secret: data.totp_secret || null,
  link: data.link || null,
});
