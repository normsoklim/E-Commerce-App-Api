# Test and Production Setup Guide

## PayPal Sandbox Setup

### 1. Create PayPal Developer Account
1. Go to [PayPal Developer Portal](https://developer.paypal.com/)
2. Sign up for a developer account
3. Create a new application in the sandbox environment

### 2. Obtain Sandbox Credentials
1. Navigate to "My Apps & Credentials"
2. Create a new sandbox app
3. Copy the Client ID and Secret for sandbox environment

### 3. Configure Sandbox Webhooks
1. Go to "Webhooks" in the developer portal
2. Create a new webhook for your local/development URL
3. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`

### 4. Test PayPal Integration
1. Use sandbox buyer account to test payments
2. Verify webhook notifications are received
3. Test payment capture and refund scenarios

## KHQR Test Setup

### 1. Bank-Specific Test Environments
Different Cambodian banks provide various testing methods:

#### ABA Bank Testing
1. Contact ABA developer support for test credentials
2. Use ABA's test mobile app for QR scanning
3. Test with provided test merchant ID

#### ACLEDA Bank Testing
1. Register for ACLEDA developer program
2. Access test environment with provided credentials
3. Use ACLEDA test app for payment verification

#### Wing Bank Testing
1. Contact Wing developer team
2. Get access to Wing test environment
3. Use Wing test wallet for payment processing

### 2. KHQR Code Testing
1. Generate test KHQR codes with test data
2. Verify QR code format compliance
3. Test with multiple banking apps

## Local Development Setup

### 1. Environment Configuration
Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id
PAYPAL_WEBHOOK_SECRET=your_sandbox_webhook_secret

# KHQR Configuration
KHQR_MERCHANT_ID=test_merchant_id
KHQR_TERMINAL_ID=test_terminal_id
KHQR_MERCHANT_NAME=Test Store
KHQR_POSTAL_CODE=12345
DEFAULT_KHQR_BANK=ABA
KHQR_WEBHOOK_SECRET=test_khqr_secret

# Store Configuration
STORE_NAME=Test Cambodia Store
STORE_CITY=Phnom Penh

# Security
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Client URL
CLIENT_URL=http://localhost:3000
```

### 2. Database Setup
1. Ensure MongoDB is running locally or use MongoDB Atlas
2. Verify database connection in `src/config/db.js`
3. Run initial database migration if needed

### 3. Running the Application
```bash
# Install dependencies
npm install

# Start the server
npm run dev  # or npm start for production

# The server will run on http://localhost:5000
```

## Testing Procedures

### 1. Unit Tests
Create test files for payment functionality:

```javascript
// tests/payment.test.js
const request = require('supertest');
const app = require('../src/server');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');

describe('Payment API', () => {
  describe('POST /api/payments/paypal/create-order', () => {
    it('should create a PayPal payment order', async () => {
      const response = await request(app)
        .post('/api/payments/paypal/create-order')
        .set('Authorization', 'Bearer valid_token')
        .send({ orderId: 'test_order_id' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBeDefined();
    });
  });

  describe('POST /api/payments/khqr/create-payment', () => {
    it('should create a KHQR payment', async () => {
      const response = await request(app)
        .post('/api/payments/khqr/create-payment')
        .set('Authorization', 'Bearer valid_token')
        .send({ orderId: 'test_order_id' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.khqrData).toBeDefined();
    });
  });
});
```

### 2. Integration Tests
Test the complete payment flow:

```javascript
// tests/payment-flow.test.js
describe('Complete Payment Flow', () => {
  it('should process PayPal payment successfully', async () => {
    // 1. Create an order
    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid_token')
      .send({
        shippingAddress: { /* shipping data */ },
        paymentMethod: 'paypal',
        items: [/* order items */],
        total: 50.00
      });
    
    // 2. Create PayPal payment
    const paymentResponse = await request(app)
      .post('/api/payments/paypal/create-order')
      .set('Authorization', 'Bearer valid_token')
      .send({ orderId: orderResponse.body.order._id });
    
    // 3. Verify order status is pending
    const order = await Order.findById(orderResponse.body.order._id);
    expect(order.status).toBe('pending');
    
    // 4. Simulate PayPal capture (in real test, this would be via webhook)
    // ... additional test steps
  });
});
```

### 3. Security Tests
Test security measures:

```javascript
// tests/security.test.js
describe('Payment Security', () => {
  it('should reject invalid payment amounts', async () => {
    const response = await request(app)
      .post('/api/payments/khqr/create-payment')
      .set('Authorization', 'Bearer valid_token')
      .send({ 
        orderId: 'valid_order_id',
        amount: 999999999 // Excessive amount
      });
    
    expect(response.status).toBe(400);
  });

  it('should rate limit payment requests', async () => {
    // Make multiple requests quickly
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        request(app)
          .post('/api/payments/khqr/create-payment')
          .set('Authorization', 'Bearer valid_token')
          .send({ orderId: 'valid_order_id' })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Production Deployment

### 1. Environment Configuration
Create production `.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database (use production MongoDB)
MONGO_URI=your_production_mongodb_connection_string

# JWT
JWT_SECRET=your_strong_production_jwt_secret

# PayPal (Production)
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_WEBHOOK_ID=your_production_webhook_id
PAYPAL_WEBHOOK_SECRET=your_production_webhook_secret

# KHQR Production Configuration
KHQR_MERCHANT_ID=your_production_merchant_id
KHQR_TERMINAL_ID=your_production_terminal_id
KHQR_MERCHANT_NAME=Your Cambodia Store
KHQR_POSTAL_CODE=12000
DEFAULT_KHQR_BANK=ABA
KHQR_WEBHOOK_SECRET=your_production_khqr_secret

# Store Configuration
STORE_NAME=Your Cambodia Store
STORE_CITY=Phnom Penh

# Security
STRIPE_WEBHOOK_SECRET=your_production_stripe_webhook_secret

# Client URL (production)
CLIENT_URL=https://yourdomain.com

# Additional Production Settings
LOG_LEVEL=info
TRUST_PROXY=true
MAX_REQUEST_SIZE=100kb
```

### 2. Server Requirements
- Node.js 16+ (recommended: latest LTS)
- MongoDB 4.4+ (recommended: latest stable)
- SSL certificate for HTTPS
- Reverse proxy (nginx/Apache) for production

### 3. Security Hardening
1. **Enable HTTPS**: All payment endpoints must use HTTPS
2. **CORS Configuration**: Restrict allowed origins
3. **Rate Limiting**: Implement proper rate limiting
4. **Input Validation**: Validate all inputs strictly
5. **Logging**: Log security events without sensitive data
6. **Monitoring**: Set up monitoring for payment failures

### 4. Deployment Steps

#### Option 1: Manual Deployment
```bash
# 1. Clone repository to production server
git clone your_repository

# 2. Install dependencies
npm install --production

# 3. Set up environment variables
cp .env.production .env

# 4. Start the application
npm start
```

#### Option 2: Using PM2
```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start application with PM2
pm2 start src/server.js --name "ecommerce-backend"

# 3. Set up PM2 to start on boot
pm2 startup
pm2 save
```

#### Option 3: Docker Deployment
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/ecommerce
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

### 5. Webhook Configuration

#### PayPal Webhooks
1. Update webhook URL to production URL
2. Update webhook events subscription
3. Test webhook delivery

#### KHQR Webhooks
1. Configure bank-specific webhook URLs
2. Set up webhook validation
3. Test webhook processing

## Monitoring and Maintenance

### 1. Payment Monitoring
- Monitor payment success/failure rates
- Track average payment processing time
- Alert on payment gateway failures
- Monitor webhook delivery success

### 2. Database Monitoring
- Monitor database performance
- Check for orphaned payment records
- Verify data consistency
- Backup payment-related data regularly

### 3. Security Monitoring
- Monitor for suspicious payment patterns
- Track rate limit violations
- Log all payment-related security events
- Regular security audits

### 4. Performance Optimization
- Optimize database queries for payment data
- Implement caching for payment configurations
- Monitor API response times
- Optimize webhook processing

## Troubleshooting Production Issues

### 1. Payment Failures
- Check payment gateway status pages
- Verify webhook configurations
- Review error logs
- Test with different payment methods

### 2. Webhook Issues
- Verify webhook URLs are accessible
- Check webhook signature validation
- Monitor webhook delivery attempts
- Implement webhook retry logic

### 3. Database Issues
- Check database connection pool
- Monitor slow queries
- Verify database indexes
- Check for data consistency

### 4. Performance Issues
- Monitor server resource usage
- Check for memory leaks
- Optimize payment processing code
- Implement proper caching

## Rollback Procedures

In case of critical issues:

1. **Immediate Response**:
   - Stop new payment processing
   - Monitor existing payments
   - Notify affected customers

2. **Rollback Steps**:
   - Deploy previous stable version
   - Verify payment processing works
   - Monitor for issues

3. **Communication**:
   - Inform customers of temporary issues
   - Provide estimated resolution time
   - Follow up when resolved

## Backup and Recovery

### 1. Database Backup
- Regular automated backups of payment data
- Test backup restoration procedures
- Secure backup storage

### 2. Configuration Backup
- Version control for environment configurations
- Secure storage of API keys and secrets
- Document recovery procedures

This setup ensures a robust, secure, and scalable payment system for your Cambodia e-commerce platform supporting both PayPal and KHQR payment methods.