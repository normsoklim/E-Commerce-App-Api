# Google Maps API Setup Guide

This guide will help you set up Google Maps API properly for the e-commerce application.

## Issue Description

The application is showing the following error:
```
Google Maps JavaScript API error: BillingNotEnabledMapError
```

This error occurs when the Google Maps API key exists but billing has not been enabled for the associated Google Cloud project.

## Solution Steps

### 1. Enable Billing on Google Cloud Platform

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one if needed)
3. Navigate to "Billing" in the left sidebar
4. Click "Link a billing account" or "Create billing account"
5. Follow the prompts to set up billing information
   - You'll need a valid credit card
   - Google provides $200 free credit for new users
   - Most map operations are very inexpensive

### 2. Enable Required APIs

After enabling billing, you need to enable the specific APIs your application uses:

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Maps JavaScript API** (for frontend maps)
   - **Geocoding API** (for address geocoding)
   - **Maps Static API** (for static map images)
   - **Distance Matrix API** (for distance calculations)
   - **Directions API** (for route directions)

### 3. Verify API Key Restrictions

1. Go to "APIs & Services" > "Credentials"
2. Find your API key
3. Click the pencil icon to edit
4. Under "Application restrictions", select appropriate restrictions:
   - For development: "None" or "HTTP referrers" with localhost
   - For production: Specify your domain(s)
5. Under "API restrictions", select "Restrict key" and choose the APIs you enabled
6. Click "Save"

### 4. Update Environment Variables

Ensure your `.env` file has the correct API key:

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 5. Test the Setup

After completing these steps:
1. Restart your application server
2. The Google Maps functionality should now work correctly

## Pricing Information

Google Maps API offers a free tier:
- $200 monthly credit for Maps, Routes, and Places
- Most e-commerce applications will not exceed this limit
- You can set budget alerts to monitor usage

## Troubleshooting

If you still encounter issues:

1. **403 Forbidden Error**: Double-check that billing is enabled
2. **API Not Enabled**: Make sure all required APIs are enabled in the console
3. **Key Restrictions**: Verify API key restrictions match your domain/origin
4. **Quota Exceeded**: Check if you've exceeded the free usage limits

## Security Best Practices

1. Always restrict your API keys:
   - HTTP referrer restrictions for browser keys
   - IP address restrictions for server keys
2. Use different keys for different environments (dev, staging, prod)
3. Regularly rotate API keys
4. Monitor usage in the Google Cloud Console

## Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Google Cloud Billing Documentation](https://cloud.google.com/billing/docs)