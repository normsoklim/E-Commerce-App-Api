# E-Commerce Backend Application

This is a comprehensive e-commerce backend application built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Product management
- Shopping cart functionality
- Order processing
- Payment integration (PayPal, Stripe, KHQR)
- Real-time notifications with Socket.IO
- Telegram bot integration
- Email notifications
- Password reset functionality
- Admin analytics dashboard
- API rate limiting and security measures
- Google Maps integration for location services

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ecommerce-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the environment variables (see `.env.example` for reference).

4. **Important**: For Google Maps functionality, follow the [Google Maps Setup Guide](GOOGLE_MAPS_SETUP.md) to enable billing and APIs.

5. **Email Configuration**: For production environments, we recommend using SendGrid for reliable email delivery. See the Email Configuration section below for setup instructions.

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- Authentication: `/api/auth`
- Products: `/api/products`
- Cart: `/api/cart`
- Orders: `/api/orders`
- Payments: `/api/payments`
- Categories: `/api/categories`
- Admin Analytics: `/api/admin`
- Shipping: `/api/shipping`
- Deals: `/api/deals`
- Notifications: `/api/notifications`
- Maps: `/api/maps`

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT) for authentication
- bcryptjs for password hashing
- Socket.IO for real-time communication
- Stripe and PayPal for payment processing
- Telegram Bot API for notifications
- Nodemailer for email notifications
- Multer for file uploads
- dotenv for environment configuration
- Jest for testing
- Google Maps Services for location features

## Testing

Run tests with:
```bash
npm test
```

## Google Maps Integration

To use Google Maps features, you must:
1. Enable billing on your Google Cloud project
2. Enable the required APIs (Geocoding, Distance Matrix, Directions)
3. Configure your API key properly

See [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md) for detailed instructions.

## Email Configuration

This application supports multiple email services. To configure email delivery, update your `.env` file with the appropriate settings.

### Gmail Configuration

To use Gmail for sending emails, you need to set up an App Password:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Navigate to Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password in your `.env` file

Example `.env` configuration for Gmail:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### Alternative Email Services

You can also use other email services:

**SendGrid (Recommended for production):**
```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_USER=your_verified_sender@domain.com
EMAIL_FROM=your_verified_sender@domain.com
```

**Outlook/Hotmail:**
```
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your_password
EMAIL_FROM=your-email@outlook.com
```

**Yahoo:**
```
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your_password
EMAIL_FROM=your-email@yahoo.com
```

**Custom SMTP:**
```
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your_password
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=your-email@domain.com
```

## Troubleshooting Email Issues

If you encounter email delivery problems, particularly the "535-5.7.8 Username and Password not accepted" error with Gmail, please refer to our troubleshooting guides:

- [Gmail Troubleshooting Guide](docs/gmail-troubleshooting.md) - Solutions for common Gmail authentication issues
- [Gmail Setup Guide](docs/gmail-setup-guide.md) - Complete setup instructions for Gmail with OAuth2
- [Gmail OAuth2 Setup](docs/gmail-oauth2-setup.md) - Detailed OAuth2 configuration guide

You can also run the following test scripts to diagnose email configuration issues:
- `node test-email-config.js` - General email configuration test
- `node test-gmail-setup.js` - Gmail-specific configuration test
- `node check-gmail-account.js` - Gmail account configuration check

## License

This project is licensed under the MIT License.
