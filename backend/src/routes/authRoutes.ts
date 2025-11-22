import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  me,
  updateProfile,
  changePassword,
  resendVerification,
} from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  emailTokenSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from '../utils/validators';
import { forgotPasswordLimiter, loginLimiter, registerLimiter, resendVerificationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/verify-email', validate(emailTokenSchema), verifyEmail);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh-token', validate(refreshSchema), refreshToken);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/resend-verification', resendVerificationLimiter, validate(resendVerificationSchema), resendVerification);

export default router;
