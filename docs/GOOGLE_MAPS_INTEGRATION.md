# Google Maps Integration Documentation

This document explains how to properly set up and use the Google Maps integration in this e-commerce application.

## Overview

The Google Maps integration provides the following functionality:
1. Geocoding of shipping addresses
2. Reverse geocoding for location lookups
3. Distance calculation between locations
4. Directions for delivery routes
5. Real-time shipment tracking

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project

### 2. Enable Required APIs

Enable the following APIs in your Google Cloud project:
- Geocoding API
- Maps JavaScript API
- Distance Matrix API
- Directions API

To enable APIs:
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for each API listed above
3. Click on each API and click "Enable"

### 3. Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. Restrict the API key to only allow the APIs you've enabled (optional but recommended for security)

### 4. Update Environment Variables

Add your API key to the `.env` file:

```
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 5. Verify Integration

After setting up the API key, you can test the integration by:

1. Restarting the server: `npm run dev`
2. Making API calls to the Google Maps endpoints:
   - `POST /api/maps/geocode` - Geocode an address
   - `POST /api/maps/reverse-geocode` - Reverse geocode coordinates
   - `POST /api/maps/distance` - Calculate distance between points
   - `POST /api/maps/directions` - Get directions between points

## API Endpoints

### Geocode Address
```
POST /api/maps/geocode
{
  "address": "123 Main St, City, Country"
}
```

### Reverse Geocode Coordinates
```
POST /api/maps/reverse-geocode
{
  "lat": 11.5564,
  "lng": 104.9283
}
```

### Calculate Distance
```
POST /api/maps/distance
{
  "origin": "Phnom Penh, Cambodia",
  "destination": "Siem Reap, Cambodia"
}
```

### Get Directions
```
POST /api/maps/directions
{
  "origin": "Phnom Penh, Cambodia",
  "destination": "Siem Reap, Cambodia",
  "mode": "driving"
}
```

## How It Works

### Order Creation
When an order is created, the shipping address is automatically geocoded to obtain coordinates. These coordinates are stored in the order for future tracking.

### Shipment Tracking
The shipping routes include endpoints to update and retrieve shipment location data, which can be used to display real-time tracking information to customers.

## Troubleshooting

### "This API project is not authorized to use this API"
- Ensure all required APIs are enabled in the Google Cloud Console
- Verify that your API key is correct and properly configured

### "Request failed with status code 403"
- Check that your API key has the necessary permissions
- Verify that billing is enabled for your Google Cloud project

### Environment Variables Not Loading
- Ensure the `.env` file is in the root directory of the project
- Make sure the variable name matches exactly: `GOOGLE_MAPS_API_KEY`

## Security Considerations

1. Restrict your API key to only allow necessary APIs
2. Set HTTP referrer restrictions for web applications
3. Set IP address restrictions for server applications
4. Monitor API usage in the Google Cloud Console
5. Rotate API keys periodically

## Cost Considerations

Google Maps APIs have usage limits and pricing:
- Check the [Google Maps Platform pricing](https://cloud.google.com/maps-platform/pricing) for current rates
- Set up billing alerts to monitor usage
- Consider implementing caching for frequently requested locations