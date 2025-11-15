import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';
dotenv.config();

// Check if Google Maps API key is provided
if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error('Missing GOOGLE_MAPS_API_KEY in .env');
}

// Log the API key status (first 5 characters for security)
console.log('Google Maps API Key configured:', process.env.GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');
if (process.env.GOOGLE_MAPS_API_KEY) {
  console.log('Google Maps API Key (first 5 chars):', process.env.GOOGLE_MAPS_API_KEY.substring(0, 5));
}

// Create a Google Maps client instance
export const googleMapsClient = new Client({});

// Export the API key for use in other modules
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;