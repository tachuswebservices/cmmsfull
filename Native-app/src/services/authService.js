import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../constants/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Response with accessToken/refreshToken or error
 */
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    
    return response.data;
  } catch (error) {
    // Handle different types of errors
    if (error.response) {
      // Server responded with an error status code
      const msg = error.response.data?.message || error.response.data?.error || 'Authentication failed';
      throw new Error(msg);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response from server. Please check your internet connection.');
    } else {
      // Something else caused the error
      throw new Error('Login failed. Please try again.');
    }
  }
};

/**
 * Request OTP for a phone number
 */
export const requestPhoneOtp = async (countryCode, phone) => {
  try {
    const contact = countryCode ? `${countryCode}${phone}` : phone;
    const response = await api.post(API_ENDPOINTS.OTP_REQUEST, { contact, type: 'LOGIN' });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to request OTP';
    throw new Error(msg);
  }
};

/**
 * Verify OTP code
 * Expected response: { pinSet: boolean, tempToken?: string, accessToken?: string, refreshToken?: string }
 */
export const verifyPhoneOtp = async (phone, code, countryCode) => {
  try {
    const contact = countryCode ? `${countryCode}${phone}` : phone;
    const response = await api.post(API_ENDPOINTS.OTP_VERIFY, { contact, type: 'LOGIN', code });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Invalid OTP';
    throw new Error(msg);
  }
};

/**
 * Check if a contact (email or phone) has a PIN configured
 */
export const hasPinByContact = async (contact) => {
  try {
    const response = await api.get(API_ENDPOINTS.HAS_PIN, { params: { contact } });
    return response.data; // { hasPin: boolean }
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to check PIN status';
    throw new Error(msg);
  }
};

/**
 * Login with PIN and contact
 */
export const loginWithPin = async (contact, pin) => {
  try {
    const response = await api.post(API_ENDPOINTS.LOGIN_PIN, { contact, pin });
    return response.data; // tokens
  } catch (error) {
    const msg = error.response?.data?.message || 'Invalid PIN';
    throw new Error(msg);
  }
};

/**
 * Set PIN for the authenticated user (requires Authorization header).
 */
export const setUserPin = async (newPin) => {
  try {
    const response = await api.post(API_ENDPOINTS.SET_PIN, { newPin });
    return response.data; // { success: true }
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to set PIN';
    throw new Error(msg);
  }
};

/**
 * Get user profile information
 * @param {string} token - JWT token
 * @returns {Promise} - Response with user data or error
 */
export const getUserProfile = async (token) => {
  try {
    const response = await api.get('/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error('Failed to get user profile.');
  }
};

/**
 * Refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise} - Response with new token or error
 */
export const refreshToken = async (refreshToken) => {
  try {
    const response = await api.post('/auth/refresh-token', {
      refreshToken,
    });
    
    return response.data;
  } catch (error) {
    throw new Error('Failed to refresh token. Please login again.');
  }
};

/**
 * Add auth token to all requests
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Register Expo push token for current user
 */
export const registerPushToken = async (token, platform) => {
  try {
    const response = await api.post('/notifications/register-token', { token, platform });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to register push token';
    throw new Error(msg);
  }
};

/**
 * Unregister Expo push token
 */
export const unregisterPushToken = async (token) => {
  try {
    const response = await api.post('/notifications/unregister-token', { token });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to unregister push token';
    throw new Error(msg);
  }
};