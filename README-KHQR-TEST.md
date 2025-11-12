# KHQR (Bakong) Payment Testing Guide

This guide provides comprehensive instructions on how to test the KHQR (Bakong) payment functionality in your e-commerce application.

## Overview

KHQR is Cambodia's national QR code payment standard developed by the National Bank of Cambodia. It enables interoperability between different banks and payment service providers in Cambodia, allowing customers to make payments using their mobile banking apps.

## Test Files Created

1. `test-khqr.js` - Node.js script to test KHQR generation functions
2. `test-khqr.html` - HTML page to visualize KHQR codes in browser
3. `test-khqr-api.js` - Express API server for testing KHQR endpoints
4. `test-khqr-commands.sh` - Bash script with curl commands for API testing

## Prerequisites

- Node.js installed on your system
- MongoDB running (for full API testing)
- Environment variables configured (optional, for production-like testing)

## Environment Variables

For production-like testing, create a `.env` file with the following variables:

```env
KHQR_MERCHANT_ID=your_merchant_id
KHQR_TERMINAL_ID=your_terminal_id
STORE_NAME=Your Store Name
STORE_CITY=Phnom Penh
DEFAULT_KHQR_BANK=ABA
```

## Testing Methods

### Method 1: Direct Function Testing

Run the test script to test KHQR generation functions directly:

```bash
node test-khqr.js
```

This will:
- Test KHQR generation for ABA, ACLEDA, and Wing banks
- Generate QR codes from the payloads
- Show the complete KHQR payment data structure

### Method 2: Browser-based Testing

Open `test-khqr.html` in your browser to:
- Generate KHQR codes visually
- See the payload data
- Test different bank options
- Scan the QR code with a mobile banking app

### Method 3: API-based Testing

Start the test API server:

```bash
node test-khqr-api.js
```

The server will start on port 3001 and provide these endpoints:

- `GET /api/test/health` - Health check
- `GET /api/test/khqr/generate` - Generate KHQR directly
- `POST /api/test/orders` - Create test order
- `POST /api/test/khqr/create-payment` - Create KHQR payment
- `POST /api/test/khqr/verify-payment` - Verify payment
- `GET /api/test/orders/:orderId` - Get order details
- `GET /api/test/payments/:paymentId` - Get payment details

### Method 4: Command-line Testing

Run the test commands script:

```bash
# Make it executable first
chmod +x test-khqr-commands.sh

# Run the commands
./test-khqr-commands.sh
```

Or execute individual curl commands:

```bash
# Health check
curl -X GET http://localhost:3001/api/test/health

# Generate KHQR directly
curl -X GET "http://localhost:3001/api/test/khqr/generate?amount=50.00&bank=ABA"

# Create a test order
curl -X POST http://localhost:3001/api/test/orders \
  -H "Content-Type: application/json" \
  -d '{"total": 75.50, "currency": "896"}'
```

## Complete Testing Workflow

1. **Start the test server:**
   ```bash
   node test-khqr-api.js
   ```

2. **Create a test order:**
   ```bash
   curl -X POST http://localhost:3001/api/test/orders \
     -H "Content-Type: application/json" \
     -d '{"total": 100.00, "currency": "896", "user": "test_user"}'
   ```

3. **Create a KHQR payment:**
   ```bash
   curl -X POST http://localhost:3001/api/test/khqr/create-payment \
     -H "Content-Type: application/json" \
     -d '{"orderId": "ORDER_ID_FROM_PREVIOUS_STEP"}'
   ```

4. **Scan the QR code with a Bakong-compatible mobile app**

5. **Verify the payment:**
   ```bash
   curl -X POST http://localhost:3001/api/test/khqr/verify-payment \
     -H "Content-Type: application/json" \
     -d '{"orderId": "ORDER_ID", "referenceId": "REFERENCE_ID"}'
   ```

6. **Check order status:**
   ```bash
   curl -X GET http://localhost:3001/api/test/orders/ORDER_ID
   ```

## KHQR Payload Structure

The KHQR code contains the following fields:
- `00` - Payload Format Indicator (01 for version 1)
- `01` - Point of Initiation Method (11 for static, 12 for dynamic)
- `29` - Merchant Account Information (includes bank gateway code)
- `53` - Transaction Currency (896 for KHR, 840 for USD)
- `54` - Transaction Amount (for dynamic QR codes)
- `59` - Merchant Name
- `60` - Merchant City
- `61` - Postal Code
- `63` - CRC (Cyclic Redundancy Check)

## Bank Support

The system currently supports:
- ABA Bank (gateway code: 001)
- ACLEDA Bank (gateway code: 002)
- Wing Bank (gateway code: 003)

Additional banks can be added by extending the `getGatewayCode` method in `src/utils/khqr.js`.

## Production Considerations

For production use, ensure you have:
- Proper merchant credentials from your bank
- SSL/TLS encryption
- Proper error handling
- Payment verification with bank APIs
- Security measures against fraud
- Proper logging and monitoring

## Troubleshooting

- If QR codes don't scan properly, verify the payload format matches KHQR standards
- Check that merchant credentials are correct
- Ensure the CRC calculation is working properly
- Verify that the mobile banking app supports the specific bank's KHQR format

## Next Steps

After successful testing, integrate the KHQR functionality into your main application by:
1. Using the existing routes in `src/routes/paymentRoutes.js`
2. Connecting to actual bank APIs for payment processing
3. Implementing proper error handling and security measures
4. Adding user interface elements to display KHQR codes in your checkout flow