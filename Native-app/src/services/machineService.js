import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../constants/api';
import { getNetworkStatus } from '../utils/networkUtils';
import { calculateDistance } from '../utils/locationUtils';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

/**
 * Get machine details by ID
 * @param {string} id - Machine ID
 * @returns {Promise} - Response with machine details or error
 */
export const getMachineById = async (id) => {
  try {
    const isOnline = await getNetworkStatus();
    
    if (isOnline) {
      const response = await api.get(API_ENDPOINTS.MACHINE_DETAIL(id));
      return response.data;
    } else {
      // Return from local database if offline
      throw new Error('Offline functionality not implemented yet');
    }
  } catch (error) {
    console.error(`Error fetching machine ${id}:`, error);
    throw error;
  }
};

/**
 * Get machine history
 * @param {string} id - Machine ID
 * @returns {Promise} - Response with machine history or error
 */
export const getMachineHistory = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.MACHINE_HISTORY(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching machine history for ${id}:`, error);
    throw error;
  }
};

/**
 * Get machine maintenance logs
 * @param {string} id - Machine ID
 * @returns {Promise} - Response with maintenance logs or error
 */
export const getMaintenanceLogs = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.MACHINE_MAINTENANCE_LOGS(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching maintenance logs for machine ${id}:`, error);
    throw error;
  }
};

/**
 * Get machine spare parts
 * @param {string} id - Machine ID
 * @returns {Promise} - Response with spare parts or error
 */
export const getSpareParts = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.MACHINE_SPARE_PARTS(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching spare parts for machine ${id}:`, error);
    throw error;
  }
};

/**
 * Get machine manual (PDF)
 * @param {string} id - Machine ID
 * @returns {Promise} - Response with manual URL or error
 */
export const getMachineManual = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.MACHINE_MANUAL(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching manual for machine ${id}:`, error);
    throw error;
  }
};

/**
 * Verify machine location
 * @param {string} machineId - Machine ID
 * @param {Object} currentLocation - Current GPS coordinates {latitude, longitude}
 * @returns {Promise} - Response with verification result or error
 */
export const verifyMachineLocation = async (machineId, currentLocation) => {
  try {
    // Get machine details including stored coordinates
    const machine = await getMachineById(machineId);
    
    if (!machine.coordinates) {
      throw new Error('Machine coordinates not available');
    }
    
    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      machine.coordinates.latitude,
      machine.coordinates.longitude
    );
    
    // Check if within 30 meters
    const isWithinRange = distance <= 30;
    
    return {
      machineId,
      isWithinRange,
      distance,
      machine,
    };
  } catch (error) {
    console.error(`Error verifying location for machine ${machineId}:`, error);
    throw error;
  }
};

/**
 * Process QR code data
 * @param {string} qrData - QR code data
 * @returns {Object} - Parsed QR data
 */
export const processQRCode = (qrData) => {
  try {
    // QR code format: machine_id|lat|long
    // Example: "MACH123|12.9716|77.5946"
    
    const parts = qrData.split('|');
    
    if (parts.length < 1) {
      throw new Error('Invalid QR code format');
    }
    
    const machineId = parts[0];
    
    // If coordinates are included in QR
    let coordinates = null;
    if (parts.length >= 3) {
      const latitude = parseFloat(parts[1]);
      const longitude = parseFloat(parts[2]);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        coordinates = { latitude, longitude };
      }
    }
    
    return {
      machineId,
      coordinates,
    };
  } catch (error) {
    console.error('Error processing QR code:', error);
    throw new Error('Invalid QR code format');
  }
};