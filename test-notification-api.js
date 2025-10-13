// Test script for notification API
// This script demonstrates how to use the notification API endpoints

import axios from 'axios';

// Base URL for your API (adjust if needed)
const BASE_URL = 'http://localhost:5000/api';

// Sample user ID (replace with an actual user ID from your database)
const USER_ID = 'your-user-id-here'; // You'll need to replace this with an actual user ID

// Sample token for authentication (replace with a valid JWT token)
const AUTH_TOKEN = 'your-auth-token-here'; // You'll need to replace this with a valid token

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Function to add auth header
const setAuthHeader = (token) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Test sending a notification
const testSendNotification = async () => {
  try {
    console.log('Testing send notification...');
    
    // Example 1: Send an in-app notification
    const inAppResponse = await api.post('/notifications', {
      user: USER_ID,
      type: 'system',
      channel: 'in-app',
      title: 'Welcome!',
      message: 'Welcome to our ecommerce platform!'
    });
    
    console.log('In-app notification response:', inAppResponse.data);
    
    // Example 2: Send an email notification
    const emailResponse = await api.post('/notifications', {
      user: USER_ID,
      type: 'promo',
      channel: 'email',
      title: 'Special Offer!',
      message: 'You have a special discount waiting for you!',
      email: 'user@example.com' // Replace with actual email
    });
    
    console.log('Email notification response:', emailResponse.data);
    
  } catch (error) {
    console.error('Error sending notification:', error.response?.data || error.message);
  }
};

// Test sending a direct notification
const testSendDirectNotification = async () => {
  try {
    console.log('\nTesting send direct notification...');
    
    const response = await api.post('/notifications/send', {
      userId: USER_ID,
      channel: 'in-app',
      title: 'Direct Notification',
      message: 'This is a direct notification sent via the API'
    });
    
    console.log('Direct notification response:', response.data);
    
  } catch (error) {
    console.error('Error sending direct notification:', error.response?.data || error.message);
  }
};

// Test getting user notifications
const testGetUserNotifications = async () => {
  try {
    console.log('\nTesting get user notifications...');
    
    const response = await api.get(`/notifications/user/${USER_ID}`);
    
    console.log('User notifications response:', response.data);
    
  } catch (error) {
    console.error('Error getting user notifications:', error.response?.data || error.message);
  }
};

// Test marking all notifications as read
const testMarkAllAsRead = async () => {
  try {
    console.log('\nTesting mark all as read...');
    
    const response = await api.put(`/notifications/user/${USER_ID}/mark-all-read`);
    
    console.log('Mark all as read response:', response.data);
    
  } catch (error) {
    console.error('Error marking notifications as read:', error.response?.data || error.message);
  }
};

// Test getting all notifications (admin only)
const testGetAllNotifications = async () => {
  try {
    console.log('\nTesting get all notifications (admin)...');
    
    const response = await api.get('/notifications');
    
    console.log('All notifications response:', response.data);
    
  } catch (error) {
    console.error('Error getting all notifications:', error.response?.data || error.message);
  }
};

// Main test function
const runTests = async () => {
  console.log('Starting notification API tests...\n');
  
  // Set the auth token (replace with your actual token)
  setAuthHeader(AUTH_TOKEN);
  
  // Run tests
  await testSendDirectNotification();
  await testSendNotification();
  await testGetUserNotifications();
  await testMarkAllAsRead();
  
  console.log('\nTests completed!');
};

// Instructions for the user
console.log(`
Notification API Test Instructions:

1. Make sure your server is running on http://localhost:5000
2. Get a valid user ID from your database
3. Get a valid JWT authentication token
4. Update the USER_ID and AUTH_TOKEN variables in this file
5. Run this script: node test-notification-api.js

Available API endpoints:

POST /api/notifications/send
  - Send a notification without creating a database record
  - Requires: userId, channel, title, message
  - Optional: email (for email notifications)

POST /api/notifications (admin only)
  - Create and send a notification
  - Requires: channel, title, message
  - Optional: user, type

GET /api/notifications/user/:userId (user auth)
  - Get all notifications for a user
  - Supports query params: page, limit, type, read

PUT /api/notifications/user/:userId/mark-all-read (user auth)
  - Mark all notifications as read for a user

GET /api/notifications/:id (user auth)
  - Get a specific notification by ID

PUT /api/notifications/:id (user auth)
  - Update a notification (mark as read/unread)

DELETE /api/notifications/:id (user auth)
  - Delete a specific notification

DELETE /api/notifications/user/:userId (user auth)
  - Delete all notifications for a user

GET /api/notifications (admin auth)
  - Get all notifications (admin only)
  - Supports query params: page, limit, type, channel, read
`);

// Uncomment the next line to run the tests
// runTests();