import express from 'express';
import { geocodeAddress, reverseGeocode, calculateDistance, getDirections } from '../utils/googleMaps.js';

const router = express.Router();

/**
 * Geocode an address to get coordinates
 * @route POST /api/maps/geocode
 * @param {string} address - The address to geocode
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await geocodeAddress(address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reverse geocode coordinates to get an address
 * @route POST /api/maps/reverse-geocode
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await reverseGeocode(lat, lng);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate distance between two points
 * @route POST /api/maps/distance
 * @param {string|Object} origin - Origin address or {lat, lng} object
 * @param {string|Object} destination - Destination address or {lat, lng} object
 */
router.post('/distance', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const result = await calculateDistance(origin, destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get directions between two points
 * @route POST /api/maps/directions
 * @param {string|Object} origin - Origin address or {lat, lng} object
 * @param {string|Object} destination - Destination address or {lat, lng} object
 * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
 */
router.post('/directions', async (req, res) => {
  try {
    const { origin, destination, mode } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const result = await getDirections(origin, destination, mode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;