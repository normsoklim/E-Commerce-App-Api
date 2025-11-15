import { geocodeAddress, reverseGeocode, calculateDistance, getDirections } from './utils/googleMaps.js';

async function testGoogleMaps() {
  console.log('Testing Google Maps functionality...');
  
  try {
    // Test geocoding
    console.log('\n1. Testing geocoding...');
    const geocodeResult = await geocodeAddress('Phnom Penh, Cambodia');
    console.log('Geocode result:', geocodeResult);
    
    // Test reverse geocoding
    console.log('\n2. Testing reverse geocoding...');
    const reverseGeocodeResult = await reverseGeocode(geocodeResult.lat, geocodeResult.lng);
    console.log('Reverse geocode result:', reverseGeocodeResult);
    
    // Test distance calculation
    console.log('\n3. Testing distance calculation...');
    const distanceResult = await calculateDistance(
      'Phnom Penh, Cambodia',
      'Siem Reap, Cambodia'
    );
    console.log('Distance result:', distanceResult);
    
    // Test directions
    console.log('\n4. Testing directions...');
    const directionsResult = await getDirections(
      'Phnom Penh, Cambodia',
      'Siem Reap, Cambodia',
      'driving'
    );
    console.log('Directions result status:', directionsResult.status);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testGoogleMaps();