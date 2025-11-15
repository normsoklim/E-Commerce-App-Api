import KHQRGenerator from './src/utils/khqr.js';
import Order from './src/models/Order.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test order data
const testOrder = {
  _id: new mongoose.Types.ObjectId(),
  total: 100.00,
  currency: '896', // KHR
  items: [
    {
      product: new mongoose.Types.ObjectId(),
      quantity: 2,
      price: 50.00
    }
  ]
};

console.log('Testing KHQR Generation...');
console.log('Environment variables check:');
console.log('- KHQR_MERCHANT_ID:', process.env.KHQR_MERCHANT_ID);
console.log('- KHQR_TERMINAL_ID:', process.env.KHQR_TERMINAL_ID);
console.log('- DEFAULT_KHQR_BANK:', process.env.DEFAULT_KHQR_BANK);
console.log('- STORE_NAME:', process.env.STORE_NAME);

async function testKHQR() {
  try {
    console.log('\n--- Testing KHQR Generation ---');
    
    // Test direct payload generation
    console.log('\n1. Testing direct payload generation:');
    const payload = KHQRGenerator.generateABAKHQR(
      testOrder._id.toString(), 
      testOrder.total, 
      testOrder.currency
    );
    console.log('Generated payload:', payload);
    
    // Test complete KHQR payment generation
    console.log('\n2. Testing complete KHQR payment generation:');
    const khqrData = await KHQRGenerator.generateKHQRPayment(testOrder);
    console.log('KHQR Data:', JSON.stringify(khqrData, null, 2));
    
    console.log('\n--- Test completed successfully ---');
  } catch (error) {
    console.error('\n--- Test failed ---');
    console.error('Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testKHQR();