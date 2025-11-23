/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format coordinates for display
 * @param {Object} coordinates - Coordinates object with latitude and longitude
 * @returns {string} - Formatted coordinates string
 */
export const formatCoordinates = (coordinates) => {
  if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
    return 'Unknown';
  }
  
  const { latitude, longitude } = coordinates;
  
  // Format to 6 decimal places (approximately 0.1 meters precision)
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  
  return `${lat}, ${lon}`;
};

/**
 * Get human-readable distance
 * @param {number} distance - Distance in meters
 * @returns {string} - Formatted distance string
 */
export const getReadableDistance = (distance) => {
  if (distance < 1000) {
    // Less than 1 km, show in meters
    return `${Math.round(distance)} m`;
  } else {
    // More than 1 km, show in kilometers with 2 decimal places
    return `${(distance / 1000).toFixed(2)} km`;
  }
};