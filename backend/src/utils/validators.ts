import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a number')
  .regex(/[!@#$%^&*]/, 'Must include a special character');

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: passwordSchema,
  confirmPassword: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^\+27\d{9}$/),
  organizationType: z.enum(['individual', 'cooperative', 'commercial', 'government']),
  organizationName: z.string().optional(),
  farmLocation: z
    .object({
      province: z.string().min(1),
      municipality: z.string().min(1),
      coordinates: z
        .object({
          lat: z.number(),
          lon: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const emailTokenSchema = z.object({
  token: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().regex(/^\+27\d{9}$/).optional(),
  organizationName: z.string().optional(),
  farmLocation: z
    .object({
      province: z.string().min(1),
      municipality: z.string().min(1),
      coordinates: z
        .object({
          lat: z.number(),
          lon: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});
