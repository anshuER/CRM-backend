import { z } from 'zod';

export const requestOtpSchema = z.object({
  email: z.email().toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.email().toLowerCase(),
  code: z.string().length(6),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export type RequestOtpDto = z.infer<typeof requestOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
