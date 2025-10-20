import { googleMapsClient, GOOGLE_MAPS_API_KEY } from '../config/googleMaps.js';

/**
 * Geocode an address to get latitude and longitude
 * @param {string} address - The address to geocode
 * @returns {Promise<Object>} - The geocoded location data
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await googleMapsClient.geocode({
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      },
      timeout: 1000 // milliseconds
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: response.data.results[0].formatted_address,
        place_id: response.data.results[0].place_id
      };
    } else {
      throw new Error('No results found for the provided address');
    }
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};

/**
 * Reverse geocode latitude and longitude to get an address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} - The reverse geocoded address data
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await googleMapsClient.reverseGeocode({
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY
      },
      timeout: 1000 // milliseconds
    });

    if (response.data.results.length > 0) {
      return {
        formatted_address: response.data.results[0].formatted_address,
        components: response.data.results[0].address_components
      };
    } else {
      throw new Error('No results found for the provided coordinates');
    }
  } catch (error) {
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
};

/**
 * Calculate distance between two points using Google Maps Distance Matrix API
 * @param {string|Object} origin - Origin address or {lat, lng} object
 * @param {string|Object} destination - Destination address or {lat, lng} object
 * @returns {Promise<Object>} - Distance and duration information
 */
export const calculateDistance = async (origin, destination) => {
  try {
    const response = await googleMapsClient.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        key: GOOGLE_MAPS_API_KEY
      },
      timeout: 1000 // milliseconds
    });

    if (response.data.rows.length > 0 && response.data.rows[0].elements.length > 0) {
      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK') {
        return {
          distance: element.distance,
          duration: element.duration
        };
      } else {
        throw new Error(`Distance calculation failed: ${element.status}`);
      }
    } else {
      throw new Error('No results found for distance calculation');
    }
  } catch (error) {
    throw new Error(`Distance calculation failed: ${error.message}`);
  }
};

/**
 * Get directions between two points
 * @param {string|Object} origin - Origin address or {lat, lng} object
 * @param {string|Object} destination - Destination address or {lat, lng} object
 * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Object>} - Directions data
 */
export const getDirections = async (origin, destination, mode = 'driving') => {
  try {
    const response = await googleMapsClient.directions({
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        key: GOOGLE_MAPS_API_KEY
      },
      timeout: 1000 // milliseconds
    });

    if (response.data.status === 'OK') {
      return response.data;
    } else {
      throw new Error(`Directions request failed: ${response.data.status}`);
    }
  } catch (error) {
    throw new Error(`Directions request failed: ${error.message}`);
  }
};

export default {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getDirections
};