import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

// Suspicious patterns (SQL Injection, XSS, Path Traversal attempts)
const SUSPICIOUS_PATTERNS = [
  /(\b(select|union|insert|update|delete|drop|alter|truncate|create)\b)/i,
  /--/,
  /\/\*/,
  /\*\\/,
  /xp_cmdshell/i,
  /('|"|;)\s*(or|and)\s+\d+\s*=\s*\d+/i,
  /(\b(order|group)\s+by\b)/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript:/i,
  /\.\.\/\.\./, // Directory traversal
];

/**
 * Scan a string value for highly suspicious malicious patterns case-insensitively.
 */
export function containsMaliciousPayload(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Clean double-escaped or URL encoded strings first to catch obfuscated payloads
  const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(decodedValue)) {
      return true;
    }
  }
  return false;
}

/**
 * Security middleware that recursively scans req.body, req.query, and req.params
 * for common SQL injection or XSS payload patterns.
 * Exceptions are made for fields holding entire URLs (like originalUrl) which are validated separately.
 */
export const requestSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  const checkObject = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const val = obj[key];
      
      // Skip deep scanning for originalUrl since it has separate structure validation
      if (key === 'originalUrl') continue;

      if (typeof val === 'string') {
        if (containsMaliciousPayload(val)) {
          console.warn(`[SECURITY WARNING] Blocked suspicious request input at key "${key}": "${val}"`);
          throw new AppError(
            HTTP.BAD_REQUEST,
            'Request blocked: suspicious input pattern detected.',
            'MALICIOUS_INPUT_DETECTED'
          );
        }
      } else if (typeof val === 'object') {
        checkObject(val);
      }
    }
  };

  try {
    checkObject(req.body);
    checkObject(req.query);
    checkObject(req.params);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates originalUrl format and constrains properties.
 */
export const validateUrlInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { originalUrl, customSlug } = req.body;

  if (!originalUrl) {
    throw new AppError(HTTP.BAD_REQUEST, 'originalUrl is required', 'MISSING_URL');
  }

  // Enforce size limit on URL
  if (originalUrl.length > 2048) {
    throw new AppError(HTTP.BAD_REQUEST, 'originalUrl exceeds maximum length of 2048 characters', 'URL_TOO_LONG');
  }

  // Strictly validate URL syntax
  try {
    const parsed = new URL(originalUrl);
    if (!['http:', 'https:', 'ftp:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch (e) {
    throw new AppError(HTTP.BAD_REQUEST, 'Please enter a valid absolute URL (starting with http:// or https://)', 'INVALID_URL_FORMAT');
  }

  // Validate custom slug if present
  if (customSlug) {
    if (customSlug.length > 100) {
      throw new AppError(HTTP.BAD_REQUEST, 'Custom slug exceeds maximum length of 100 characters', 'SLUG_TOO_LONG');
    }
    // Alphanumeric + dash + underscore only
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    if (!slugRegex.test(customSlug)) {
      throw new AppError(
        HTTP.BAD_REQUEST,
        'Custom slug must contain alphanumeric characters, hyphens, or underscores only.',
        'INVALID_SLUG_FORMAT'
      );
    }
  }

  next();
};

/**
 * Validates registration input.
 */
export const validateRegistrationInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    throw new AppError(HTTP.BAD_REQUEST, 'Email and password are required', 'MISSING_CREDENTIALS');
  }

  // Simple email pattern check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 255) {
    throw new AppError(HTTP.BAD_REQUEST, 'Please enter a valid email address.', 'INVALID_EMAIL');
  }

  // Validate password length
  if (password.length < 8 || password.length > 72) {
    throw new AppError(HTTP.BAD_REQUEST, 'Password must be between 8 and 72 characters.', 'INVALID_PASSWORD_LENGTH');
  }

  if (name && name.length > 100) {
    throw new AppError(HTTP.BAD_REQUEST, 'Name must be 100 characters or less.', 'NAME_TOO_LONG');
  }

  next();
};
