# Notification API Test Guide

This guide shows you how to test the notification API endpoints for your ecommerce app.

## API Endpoints

### 1. Send a Notification (Public Route)
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "channel": "in-app",
    "title": "Test Notification",
    "message": "This is a test notification message"
  }'
```

### 2. Create a Notification (Admin Only)
```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -d '{
    "user": "USER_ID_HERE",
    "type": "system",
    "channel": "in-app",
    "title": "System Alert",
    "message": "This is a system notification"
  }'
```

### 3. Get User Notifications (User Auth)
```bash
curl -X GET "http://localhost:5000/api/notifications/user/USER_ID_HERE?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE"
```

### 4. Get All Notifications (Admin Only)
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

### 5. Get Single Notification (User Auth)
```bash
curl -X GET http://localhost:5000/api/notifications/NOTIFICATION_ID_HERE \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE"
```

### 6. Update Notification (Mark as Read) (User Auth)
```bash
curl -X PUT http://localhost:5000/api/notifications/NOTIFICATION_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE" \
  -d '{
    "read": true
  }'
```

### 7. Mark All Notifications as Read (User Auth)
```bash
curl -X PUT http://localhost:5000/api/notifications/user/USER_ID_HERE/mark-all-read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE"
```

### 8. Delete Notification (User Auth)
```bash
curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID_HERE \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE"
```

### 9. Delete All User Notifications (User Auth)
```bash
curl -X DELETE http://localhost:5000/api/notifications/user/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_USER_TOKEN_HERE"
```

## How to Get Required Information

### 1. Get User ID
First, you need a valid user ID. You can get this from your database or by listing users:
```bash
curl -X GET http://localhost:5000/api/auth/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

### 2. Get Authentication Token
To get an authentication token, you need to log in:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

## Testing with Sample Data

Here's a complete test sequence you can follow:

### Step 1: Send a test notification
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "REPLACE_WITH_USER_ID",
    "channel": "in-app",
    "title": "Welcome Notification",
    "message": "Welcome to our ecommerce platform!"
  }'
```

### Step 2: Get user's notifications
```bash
curl -X GET "http://localhost:5000/api/notifications/user/REPLACE_WITH_USER_ID" \
  -H "Authorization: Bearer REPLACE_WITH_USER_TOKEN"
```

### Step 3: Mark a notification as read
```bash
curl -X PUT http://localhost:5000/api/notifications/REPLACE_WITH_NOTIFICATION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer REPLACE_WITH_USER_TOKEN" \
  -d '{
    "read": true
  }'
```

## Notification Types and Channels

### Notification Types:
- `order` - Order-related notifications
- `system` - System notifications
- `promo` - Promotional notifications

### Notification Channels:
- `email` - Email notifications
- `telegram` - Telegram notifications
- `in-app` - In-app notifications

## Example with Email Notification

```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "REPLACE_WITH_USER_ID",
    "channel": "email",
    "title": "Order Confirmation",
    "message": "Your order has been confirmed!",
    "email": "user@example.com"
  }'
```

## Example with Telegram Notification

```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "REPLACE_WITH_USER_ID",
    "channel": "telegram",
    "title": "New Message",
    "message": "You have a new message!"
  }'
```

## Troubleshooting

If you get a 401 error, make sure you're providing a valid authentication token.

If you get a 404 error, make sure the user ID or notification ID exists in the database.

If notifications aren't being sent, check that your environment variables are properly set in the `.env` file:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `EMAIL_USER`
- `EMAIL_PASS`