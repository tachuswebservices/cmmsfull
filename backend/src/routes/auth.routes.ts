import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authRequired } from '../middlewares/auth';

const router = Router();

router.post('/login', AuthController.login);
router.get('/profile', authRequired, AuthController.profile);
router.post('/refresh-token', AuthController.refreshToken);

// Password & PIN reset flows
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);
router.post('/request-pin-reset', AuthController.requestPinReset);
router.post('/reset-pin', AuthController.resetPin);

// OTP login & reset endpoints
router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password-otp', AuthController.resetPasswordOtp);
router.post('/reset-pin-otp', AuthController.resetPinOtp);

// PIN-based auth endpoints
router.post('/set-pin', authRequired, AuthController.setPin);
router.get('/has-pin', AuthController.hasPin);
router.post('/login-pin', AuthController.loginPin);

export default router;

