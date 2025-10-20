# Google Maps Integration - File Changes

This document summarizes all the files that were modified or created as part of the Google Maps integration.

## New Files Created

### 1. `src/config/googleMaps.js`
Configuration file for Google Maps services:
- Initializes the Google Maps client
- Validates the API key
- Exports the client and API key for use in other modules

### 2. `src/utils/googleMaps.js`
Utility functions for Google Maps operations:
- `geocodeAddress`: Convert address to coordinates
- `reverseGeocode`: Convert coordinates to address
- `calculateDistance`: Calculate distance between two points
- `getDirections`: Get directions between two points

### 3. `src/routes/mapRouters.js`
API routes for Google Maps functionality:
- `/api/maps/geocode` - POST endpoint for geocoding addresses
- `/api/maps/reverse-geocode` - POST endpoint for reverse geocoding
- `/api/maps/distance` - POST endpoint for distance calculation
- `/api/maps/directions` - POST endpoint for getting directions

### 4. `src/utils/testGoogleMaps.js`
Test utility for verifying Google Maps integration (for development purposes)

### 5. `testGoogleMaps.mjs`
Simple test script to verify Google Maps functionality

### 6. `docs/GOOGLE_MAPS_INTEGRATION.md`
Documentation for setting up and using the Google Maps integration

### 7. `docs/GOOGLE_MAPS_FILE_CHANGES.md`
This file - summary of all changes made

## Files Modified

### 1. `package.json`
Added the `@googlemaps/google-maps-services-js` dependency for accessing Google Maps APIs.

### 2. `src/models/Order.js`
Updated the Order schema to include location data:
- Added `coordinates` field to `shippingAddress`
- Added `deliveryLocation` field with `current` and `destination` coordinates

### 3. `src/routes/orderRoutes.js`
Modified order creation to automatically geocode shipping addresses:
- Added import for `geocodeAddress` utility
- Added geocoding logic during order creation
- Store coordinates in the order for future tracking

### 4. `src/routes/shippingRoutes.js`
Enhanced shipping functionality with location tracking:
- Added imports for Google Maps utilities
- Added endpoint to update shipment location: `PUT /:shipmentId/location`
- Added endpoint to get tracking information: `GET /:shipmentId/tracking`

### 5. `src/server.js`
Registered the new map routes:
- Added import for `mapRoutes`
- Registered the routes at `/api/maps`

## Usage Examples

### Geocoding an Address
```javascript
// POST /api/maps/geocode
{
  "address": "Phnom Penh, Cambodia"
}
```

### Creating an Order with Automatic Geocoding
When creating an order, the shipping address is automatically geocoded:
```javascript
// The order document will include:
{
  "shippingAddress": {
    "address": "123 Main St",
    "city": "Phnom Penh",
    "coordinates": {
      "lat": 11.5564,
      "lng": 104.9283
    }
  },
  "deliveryLocation": {
    "destination": {
      "lat": 11.5564,
      "lng": 104.9283
    }
  }
}
```

### Updating Shipment Location
```javascript
// PUT /api/shipping/:shipmentId/location
{
  "lat": 11.5564,
  "lng": 104.9283,
  "status": "in_transit"
}
```

## Testing the Integration

To test the integration:

1. Ensure all required Google Maps APIs are enabled
2. Verify the API key is correctly set in `.env`
3. Run the test script: `node testGoogleMaps.mjs`
4. Or make API calls to the endpoints:
   - `POST /api/maps/geocode`
   - `POST /api/maps/reverse-geocode`
   - `POST /api/maps/distance`
   - `POST /api/maps/directions`

## Error Handling

The integration includes proper error handling for:
- Missing API key
- Invalid API key
- API access denied
- Network errors
- Invalid parameters

All errors are returned in a consistent format:
```javascript
{
  "error": "Error message"
}