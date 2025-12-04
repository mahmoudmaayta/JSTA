import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter for login attempts: 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60, // 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after exceeding
});

// Rate limiter for general API requests: 100 requests per minute per IP
export const apiRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60, // 1 minute
});

// Rate limiter for file uploads: 10 uploads per hour per IP
export const uploadRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 60, // 1 hour
});

/**
 * Middleware to apply rate limiting
 */
export function rateLimitMiddleware(limiter: RateLimiterMemory) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);

    try {
      await limiter.consume(ip);
      next();
    } catch (error) {
      res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((error as any).msBeforeNext / 1000)
      });
    }
  };
}

/**
 * Get client IP address reliably behind proxies
 */
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (when behind proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = typeof forwardedFor === 'string'
      ? forwardedFor.split(',')
      : forwardedFor;
    return ips[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Sanitize file name to prevent path traversal and injection
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and null bytes
  return fileName
    .replace(/[\/\\]/g, '_')
    .replace(/\x00/g, '')
    .replace(/\.\./g, '_')
    .trim();
}

/**
 * Validate MIME type matches file extension
 */
export function validateFileMimeType(fileName: string, mimeType: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();

  const allowedTypes: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  };

  if (!ext || !allowedTypes[ext]) {
    return false;
  }

  return allowedTypes[ext].includes(mimeType);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user input to prevent XSS and HTML injection
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
    .trim();
}
