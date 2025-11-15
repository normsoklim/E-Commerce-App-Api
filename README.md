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

## License

This project is licensed under the MIT License.
