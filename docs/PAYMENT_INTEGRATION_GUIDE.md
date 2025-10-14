# Cambodia E-commerce Payment Integration Guide

## Overview

This guide provides a comprehensive overview of the payment system implemented for the Cambodia e-commerce platform, supporting both international (PayPal) and local (KHQR) payment methods.

## Payment Methods Supported

### 1. PayPal (International Customers)
- Credit/Debit card payments
- Secure payment processing through PayPal's API
- Supports multiple currencies (USD, EUR, GBP, etc.)

### 2. KHQR (Local Customers)
- QR code-based payments for Cambodian banks
- Supports ABA, ACLEDA, Wing, and other local banks
- Compliant with National Bank of Cambodia's KHQR standards

## System Architecture

### Database Schema

#### Order Model
```javascript
{
  user: ObjectId,                    // Reference to User
  items: [{                         // Array of order items
    product: ObjectId,
    quantity: Number,
    price: Number
  }],
  subtotal: Number,                 // Subtotal amount
  total: Number,                    // Total amount including taxes/shipping
  paymentMethod: String,            // 'paypal', 'khqr', 'stripe', 'cod'
  status: String,                   // 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  paymentStatus: String,            // 'pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'
  paidAt: Date,                     // When payment was completed
  paymentResult: Object,            // Payment gateway response
  shippingAddress: Object,          // Shipping address details
  paymentReference: String,         // Payment reference ID
  paypalOrderId: String,            // PayPal order ID
  khqrReference: String,            // KHQR reference ID
  khqrCode: String,                 // KHQR code image URL
  khqrAmount: Number,               // KHQR payment amount
  khqrCurrency: String              // KHQR currency
}
```

#### Payment Model
```javascript
{
  orderId: ObjectId,                // Reference to Order
  paymentMethod: String,            // 'paypal', 'khqr', 'stripe', 'cod'
  amount: Number,                   // Payment amount
  currency: String,                 // Currency code
  status: String,                   // 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
  gateway: String,                  // Payment gateway ('paypal', 'khqr', 'stripe')
  gatewayTransactionId: String,     // Transaction ID from payment gateway
  gatewayPaymentId: String,         // Payment ID from payment gateway
  paymentReference: String,         // Payment reference
  paymentData: Object,              // Payment-specific data
  paidAt: Date,                     // Payment completion time
  captured: Boolean,                // Whether payment was captured
  captureData: Object,              // Capture response data
  refundData: Object,               // Refund data if refunded
  metadata: Object                  // Additional metadata
}
```

#### Transaction Model
```javascript
{
  orderId: ObjectId,                // Reference to Order
  paymentId: ObjectId,              // Reference to Payment
  transactionType: String,          // 'authorization', 'capture', 'refund', 'void'
  amount: Number,                   // Transaction amount
  currency: String,                 // Currency code
  gateway: String,                  // Payment gateway
  gatewayTransactionId: String,     // Transaction ID from gateway
  status: String,                   // 'pending', 'completed', 'failed', 'refunded', 'cancelled'
  gatewayResponse: Object,          // Full gateway response for debugging
  processedAt: Date,                // When transaction was processed
  metadata: Object                  // Additional metadata
}
```

## API Endpoints

### Payment Routes

#### PayPal Payment
- `POST /api/payments/paypal/create-order` - Create PayPal payment
- `POST /api/payments/paypal/capture/:orderId` - Capture PayPal payment

#### KHQR Payment
- `POST /api/payments/khqr/create-payment` - Generate KHQR code
- `POST /api/payments/khqr/verify-payment` - Verify KHQR payment

#### General Payment Operations
- `GET /api/payments/:paymentId/status` - Get payment status
- `POST /api/payments/:paymentId/refund` - Refund payment

### Webhook Routes

#### Payment Webhooks
- `POST /api/webhooks/paypal` - PayPal webhook handler
- `POST /api/webhooks/khqr` - KHQR webhook handler
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Checkout Flow

### 1. Cart to Checkout
```
Cart -> Checkout Page -> Payment Method Selection -> Payment Processing -> Order Confirmation
```

### 2. PayPal Payment Flow
```
1. User selects PayPal as payment method
2. System creates order with status 'pending'
3. System creates PayPal payment and returns PayPal order ID
4. User is redirected to PayPal for payment
5. PayPal processes payment and redirects back
6. System captures payment via webhook or return URL
7. Order status updated to 'confirmed'
8. Payment status updated to 'paid'
```

### 3. KHQR Payment Flow
```
1. User selects KHQR as payment method
2. System creates order with status 'pending'
3. System generates KHQR code and returns to frontend
4. User scans QR code with banking app
5. User completes payment in banking app
6. System verifies payment via webhook or manual verification
7. Order status updated to 'confirmed'
8. Payment status updated to 'paid'
```

## Security Best Practices

### 1. Input Validation
- All payment requests are validated for required fields
- Amount validation ensures it matches order total
- Currency validation ensures supported currencies
- Payment method validation ensures valid methods

### 2. Rate Limiting
- Payment requests are rate-limited to prevent abuse
- Maximum 10 requests per 15 minutes per user

### 3. Webhook Security
- PayPal webhook signatures are verified
- KHQR webhook signatures are verified
- Timestamp validation prevents replay attacks

### 4. Data Sanitization
- Sensitive fields are removed from logs
- Payment data is sanitized before storage
- No sensitive authentication data is stored

### 5. PCI DSS Compliance
- Card data is never stored on our servers
- Only last 4 digits of card numbers are logged
- All payment processing happens through secure gateways

## Environment Variables

Required environment variables for payment processing:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret

# KHQR Configuration
KHQR_MERCHANT_ID=your_merchant_id
KHQR_TERMINAL_ID=your_terminal_id
KHQR_MERCHANT_NAME=Your Store Name
KHQR_POSTAL_CODE=12345
DEFAULT_KHQR_BANK=ABA  # Options: ABA, ACLEDA, WING, etc.
KHQR_WEBHOOK_SECRET=your_khqr_webhook_secret

# Store Configuration
STORE_NAME=Your Store Name
STORE_CITY=Phnom Penh

# Security
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Frontend Integration

### Angular Components

#### Payment Method Component
- Allows users to select payment method (PayPal or KHQR)
- Dynamically loads appropriate payment component

#### PayPal Payment Component
- Integrates with PayPal JavaScript SDK
- Handles payment creation and capture
- Redirects user to PayPal for payment

#### KHQR Payment Component
- Generates and displays KHQR code
- Provides instructions for mobile payment
- Handles payment verification

## Testing

### Test Environment Setup

1. **PayPal Sandbox**
   - Use PayPal's sandbox environment for testing
   - Create sandbox accounts at developer.paypal.com
   - Use sandbox client ID and secret

2. **KHQR Testing**
   - Use KHQR test environment provided by banks
   - Some banks provide test apps for QR code scanning

### Test Scenarios

1. **Successful Payments**
   - PayPal payment completion
   - KHQR payment completion
   - Order status updates

2. **Failed Payments**
   - Payment cancellation
   - Payment failure handling
   - Order status updates

3. **Refunds**
   - PayPal refund processing
   - KHQR refund processing
   - Order status updates

4. **Webhook Handling**
   - Successful webhook processing
   - Failed webhook handling
   - Duplicate webhook handling

## Production Deployment

### Server Configuration

1. **Environment Setup**
   - Use production PayPal credentials
   - Configure proper webhook URLs
   - Set up SSL certificates

2. **Database Configuration**
   - Ensure database backups are configured
   - Set up monitoring for payment collections
   - Configure database indexes for payment queries

3. **Security Configuration**
   - Enable HTTPS for all payment endpoints
   - Configure proper CORS settings
   - Set up monitoring for security events

### Monitoring and Logging

1. **Payment Monitoring**
   - Monitor payment success/failure rates
   - Track payment processing times
   - Alert on payment failures

2. **Security Monitoring**
   - Monitor for suspicious payment patterns
   - Track rate limit violations
   - Log all payment-related events

## Troubleshooting

### Common Issues

1. **PayPal Issues**
   - Invalid webhook signatures
   - Payment creation failures
   - Capture failures

2. **KHQR Issues**
   - QR code generation failures
   - Bank API connectivity issues
   - Verification failures

3. **General Issues**
   - Order status inconsistencies
   - Payment data mismatches
   - Webhook processing failures

### Debugging Steps

1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test payment gateway connectivity
4. Validate webhook configurations
5. Check database consistency

## Bank Integration Notes

### ABA Bank KHQR
- Uses specific merchant ID format
- Supports multiple transaction types
- Provides real-time notifications

### ACLEDA Bank KHQR
- Standard KHQR compliance
- Mobile app integration
- Webhook notifications

### Wing Bank KHQR
- Wallet-based payments
- Instant notifications
- Transaction verification

## Compliance Requirements

### Cambodia Regulations
- Comply with National Bank of Cambodia KHQR standards
- Follow local data protection laws
- Maintain proper transaction records

### International Standards
- PCI DSS compliance for card payments
- GDPR compliance for EU customers
- PayPal seller protection requirements