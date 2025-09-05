import { Context } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  RequestOtpSchema, 
  VerifyOtpSchema, 
  ResendOtpSchema,
  OtpRequestResponse,
  OtpVerificationResponse,
  AuthErrorResponse,
  RATE_LIMIT_CONFIG
} from "@lynkby/shared";
import { otpService } from "../../core/services/otp.service";
import { emailService } from "../../core/services/email.service";
import { rateLimitService } from "../../core/services/rate-limit.service";
import { getClientIP } from "../../core/util/ip.utils";
import { csrfService } from "../../core/services/csrf.service";

export class OtpController {
  private readonly config: {
    jwtSecret: string;
    appBase: string;
    nodeEnv: string;
  };

  constructor(config: { jwtSecret: string; appBase: string; nodeEnv: string }) {
    this.config = config;
  }

  /**
   * Request OTP code
   * POST /v1/auth/otp/request
   */
  async requestOtp(c: Context): Promise<Response> {
    try {
      // Set environment on services
      this.setEnvironment(c);
      
      // Parse and validate request
      const body = await c.req.json();
      const { email } = RequestOtpSchema.parse(body);
      
      // CSRF protection disabled for OTP endpoints due to rate limiting and other protections
      
      // Get client info
      const ipAddress = getClientIP(c);
      const userAgent = c.req.header("User-Agent");
      
      // Check rate limits
      const rateLimitResult = await rateLimitService.checkEmailRateLimit(
        email,
        ipAddress,
        c,
        RATE_LIMIT_CONFIG.OTP_EMAIL_PER_ADDRESS,
        RATE_LIMIT_CONFIG.OTP_EMAIL_PER_IP
      );
      
      if (rateLimitResult.remaining <= 0) {
        logger.warn('OTP request rate limited', { 
          email, 
          ipAddress,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });
        
        const response: AuthErrorResponse = {
          ok: false,
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          cooldown: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        };
        
        return c.json(response, 429);
      }
      
      // Generate OTP
      const { code, tokenData } = await otpService.generateOtp({
        email,
        ipAddress,
        userAgent,
      });
      
      // Send OTP email
      await emailService.sendOtpEmail({
        to: email,
        code,
      });
      
      // Log successful request
      logger.logAPI('OTP_REQUESTED', `email:${email}`, { 
        email, 
        ipAddress,
        tokenId: tokenData.id
      });
      
      const response: OtpRequestResponse = {
        ok: true,
        message: "If that email exists, we sent a code.",
        cooldown: RATE_LIMIT_CONFIG.OTP_RESEND_COOLDOWN.windowMs / 1000,
      };
      
      return c.json(response);
      
    } catch (error) {
      logger.error('OTP request failed', { error });
      
      if (error instanceof Error && error.message.includes('validation')) {
        const response: AuthErrorResponse = {
          ok: false,
          error: "Invalid request data",
          code: "VALIDATION_ERROR",
        };
        return c.json(response, 400);
      }
      
      const response: AuthErrorResponse = {
        ok: false,
        error: "Failed to request OTP",
        code: "INTERNAL_ERROR",
      };
      return c.json(response, 500);
    }
  }

  /**
   * Verify OTP code
   * POST /v1/auth/otp/verify
   */
  async verifyOtp(c: Context): Promise<Response> {
    try {
      // Set environment on services
      this.setEnvironment(c);
      
      // Parse and validate request
      const body = await c.req.json();
      const { email, code } = VerifyOtpSchema.parse(body);
      
      // CSRF protection disabled for OTP endpoints due to rate limiting and other protections
      
      // Get client info
      const ipAddress = getClientIP(c);
      const userAgent = c.req.header("User-Agent");
      
      // Verify OTP
      const result = await otpService.verifyOtp({
        email,
        code,
        ipAddress,
        userAgent,
      });
      
      if (!result.ok) {
        logger.warn('OTP verification failed', { 
          email, 
          ipAddress,
          error: result.error
        });
        
        const response: AuthErrorResponse = {
          ok: false,
          error: result.error === 'INVALID_OR_EXPIRED' ? 'Invalid or expired code' : 'Verification failed',
          code: result.error || 'VERIFICATION_FAILED',
        };
        return c.json(response, 400);
      }
      
      // Create proper session using the session service
      const { session, plaintextToken } = await otpService.createSession({
        userId: result.user!.id,
        userAgent,
        ipAddress,
      }, this.config.jwtSecret);

      // Set session cookie
      const cookieOptions = {
        httpOnly: true,
        secure: this.config.nodeEnv === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        domain: this.config.nodeEnv === "production" ? ".lynkby.com" : undefined,
      } as const;
      
      setCookie(c, "lb_sess", plaintextToken, cookieOptions);
      
      // Log successful verification
      logger.logAPI('OTP_VERIFIED', `user:${result.user?.id}`, { 
        email, 
        ipAddress,
        userId: result.user?.id,
        isNewUser: result.user?.isNewUser
      });
      
      const response: OtpVerificationResponse = {
        ok: true,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          username: result.user!.username,
          isNewUser: result.user!.isNewUser || false,
        },
        session: result.session!,
      };
      
      return c.json(response);
      
    } catch (error) {
      logger.error('OTP verification failed', { error });
      
      if (error instanceof Error && error.message.includes('validation')) {
        const response: AuthErrorResponse = {
          ok: false,
          error: "Invalid request data",
          code: "VALIDATION_ERROR",
        };
        return c.json(response, 400);
      }
      
      const response: AuthErrorResponse = {
        ok: false,
        error: "Failed to verify OTP",
        code: "INTERNAL_ERROR",
      };
      return c.json(response, 500);
    }
  }

  /**
   * Resend OTP code
   * POST /v1/auth/otp/resend
   */
  async resendOtp(c: Context): Promise<Response> {
    try {
      // Set environment on services
      this.setEnvironment(c);
      
      // Parse and validate request
      const body = await c.req.json();
      const { email } = ResendOtpSchema.parse(body);
      
      // CSRF protection disabled for OTP endpoints due to rate limiting and other protections
      
      // Get client info
      const ipAddress = getClientIP(c);
      const userAgent = c.req.header("User-Agent");
      
      // Check rate limits (same as request)
      const rateLimitResult = await rateLimitService.checkEmailRateLimit(
        email,
        ipAddress,
        c,
        RATE_LIMIT_CONFIG.OTP_EMAIL_PER_ADDRESS,
        RATE_LIMIT_CONFIG.OTP_EMAIL_PER_IP
      );
      
      if (rateLimitResult.remaining <= 0) {
        logger.warn('OTP resend rate limited', { 
          email, 
          ipAddress,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });
        
        const response: AuthErrorResponse = {
          ok: false,
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          cooldown: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        };
        
        return c.json(response, 429);
      }
      
      // Generate new OTP (this will invalidate the previous one)
      const { code, tokenData } = await otpService.generateOtp({
        email,
        ipAddress,
        userAgent,
      });
      
      // Send OTP email
      await emailService.sendOtpEmail({
        to: email,
        code,
      });
      
      // Log successful resend
      logger.logAPI('OTP_RESENT', `email:${email}`, { 
        email, 
        ipAddress,
        tokenId: tokenData.id
      });
      
      const response: OtpRequestResponse = {
        ok: true,
        message: "If that email exists, we sent a new code.",
        cooldown: RATE_LIMIT_CONFIG.OTP_RESEND_COOLDOWN.windowMs / 1000,
      };
      
      return c.json(response);
      
    } catch (error) {
      logger.error('OTP resend failed', { error });
      
      if (error instanceof Error && error.message.includes('validation')) {
        const response: AuthErrorResponse = {
          ok: false,
          error: "Invalid request data",
          code: "VALIDATION_ERROR",
        };
        return c.json(response, 400);
      }
      
      const response: AuthErrorResponse = {
        ok: false,
        error: "Failed to resend OTP",
        code: "INTERNAL_ERROR",
      };
      return c.json(response, 500);
    }
  }

  private setEnvironment(c: Context): void {
    const env = c.env;
    if (env) {
      otpService.setEnvironment(env);
      emailService.setEnvironment(env);
      rateLimitService.setEnvironment(env);
      csrfService.setEnvironment(env);
    }
  }
}
