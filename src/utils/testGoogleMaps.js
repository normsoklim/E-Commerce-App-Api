import dotenv from 'dotenv';
dotenv.config();

import { geocodeAddress, reverseGeocode, calculateDistance, getDirections } from './googleMaps.js';

/**
 * Test Google Maps integration
 */
export const testGoogleMapsIntegration = async () => {
  try {
    console.log('Testing Google Maps integration...');
    
    // Check if API key is available
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return false;
    }
    
    console.log('API Key found:', process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
    
    // Test geocoding
    console.log('1. Testing geocoding...');
    const geocodeResult = await geocodeAddress('Phnom Penh, Cambodia');
    console.log('Geocode result:', geocodeResult);
    
    // Test reverse geocoding
    console.log('2. Testing reverse geocoding...');
    const reverseGeocodeResult = await reverseGeocode(11.5564, 104.9283);
    console.log('Reverse geocode result:', reverseGeocodeResult);
    
    // Test distance calculation
    console.log('3. Testing distance calculation...');
    const distanceResult = await calculateDistance(
      'Phnom Penh, Cambodia',
      'Siem Reap, Cambodia'
    );
    console.log('Distance result:', distanceResult);
    
    // Test directions
    console.log('4. Testing directions...');
    const directionsResult = await getDirections(
      'Phnom Penh, Cambodia',
      'Siem Reap, Cambodia',
      'driving'
    );
    console.log('Directions result:', directionsResult.status);
    
    console.log('Google Maps integration test completed successfully!');
    return true;
  } catch (error) {
    console.error('Google Maps integration test failed:', error.message);
    return false;
  }
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGoogleMapsIntegration();
}

export default {
  testGoogleMapsIntegration
};