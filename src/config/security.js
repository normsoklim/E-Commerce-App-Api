// Security configuration for payment processing

export const securityConfig = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  },

  // Payment validation configuration
  paymentValidation: {
    amountTolerance: 0.01, // 1 cent tolerance for rounding differences
    maxRetries: 3, // Maximum number of retry attempts for failed payments
    retryDelay: 1000, // Delay in milliseconds between retries
    timeout: 30000, // 30 seconds timeout for payment operations
  },

  // Webhook security configuration
  webhookSecurity: {
    signatureTimeout: 5 * 60 * 1000, // 5 minutes for webhook signature validation
    maxPayloadSize: '100kb', // Maximum payload size for webhook requests
    allowedOrigins: [
      'https://api.paypal.com',
      'https://api.sandbox.paypal.com',
      // Add KHQR bank API origins here
    ]
  },

  // Data encryption configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // bytes
    ivLength: 16, // bytes
    saltLength: 64 // bytes
  },

  // PCI DSS compliance settings
  pciDss: {
    // Never store sensitive authentication data after authorization
    storeSensitiveData: false,
    
    // Mask PAN (Primary Account Number) when displaying
    maskPan: (pan) => {
      if (!pan || pan.length < 8) return pan;
      const start = pan.substring(0, 6);
      const end = pan.substring(pan.length - 4);
      const masked = '*'.repeat(pan.length - 10);
      return `${start}${masked}${end}`;
    },
    
    // Log only last 4 digits of card numbers
    logCardNumber: (cardNumber) => {
      if (!cardNumber) return '****';
      return `****${cardNumber.slice(-4)}`;
    }
  },

  // Input sanitization rules
  sanitization: {
    // Remove potentially dangerous characters from input
    dangerousChars: ['<', '>', '"', "'", '&', '%', '{', '}', '[', ']', '(', ')'],
    
    // Validate email format
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    
    // Validate phone number format (Cambodian format)
    phoneRegex: /^(\+?855|0)?[1-9]\d{7,8}$/,
    
    // Validate amount format
    amountRegex: /^\d+(\.\d{1,2})?$/,
    
    // Validate currency codes
    currencyCodes: ['USD', 'KHR', 'THB', 'EUR', 'GBP']
  },

  // Logging configuration for security events
  logging: {
    logPaymentAttempts: true,
    logFailedAttempts: true,
    logSuspiciousActivity: true,
    logWebhookEvents: true,
    
    // Fields to never log (for security)
    sensitiveFields: [
      'cardNumber',
      'cvv',
      'card_cvc',
      'card_expiry',
      'paymentToken',
      'payment_token',
      'secret',
      'password',
      'cvv2',
      'csc'
    ]
  },

  // CORS configuration for payment endpoints
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.CLIENT_URL || ''] 
      : ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:8080'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin', 
      'X-Requested-With', 
      'Content-Type', 
      'Accept', 
      'Authorization',
      'X-Client-Version',
      'X-Device-ID'
    ],
    credentials: true
  }
};

// Security headers middleware
export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent cross-site scripting attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Limit referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy for payment pages
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com",
    "style-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com",
    "img-src 'self' data: https:",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com",
    "connect-src 'self' https://api.paypal.com https://api.sandbox.paypal.com"
  ].join('; ')
};

// Security utility functions
export const securityUtils = {
  // Generate secure random string
  generateSecureRandom: (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  },

  // Hash sensitive data
  hashData: (data, algorithm = 'sha256') => {
    const crypto = require('crypto');
    return crypto.createHash(algorithm).update(data).digest('hex');
  },

  // Validate webhook timestamp (prevent replay attacks)
  validateWebhookTimestamp: (timestamp, toleranceMinutes = 5) => {
    const now = Date.now();
    const requestTime = new Date(timestamp).getTime();
    const toleranceMs = toleranceMinutes * 60 * 1000;
    
    return Math.abs(now - requestTime) < toleranceMs;
  },

  // Sanitize object (remove sensitive fields)
  sanitizeObject: (obj, sensitiveFields = securityConfig.logging.sensitiveFields) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = securityUtils.sanitizeObject(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
};

export default securityConfig;