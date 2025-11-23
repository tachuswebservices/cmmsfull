// API URL configuration
// In a real app, you would have different URLs for development, staging, and production

// Base API URL
// Prefer Expo public env var so it can be configured per environment without code changes
// Backend server listens on env.PORT (default 4000) in backend/src/server.ts
export const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://cmmsdf-backend.onrender.com';
// export const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.61:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh-token',
  PROFILE: '/auth/profile',
  OTP_REQUEST: '/auth/request-otp',
  OTP_VERIFY: '/auth/verify-otp',
  HAS_PIN: '/auth/has-pin',
  SET_PIN: '/auth/set-pin',
  LOGIN_PIN: '/auth/login-pin',
  
  // Work Orders
  WORK_ORDERS: '/work-orders',
  WORK_ORDER_DETAIL: (id) => `/work-orders/${id}`,
  WORK_ORDER_START: (id) => `/work-orders/${id}/start`,
  WORK_ORDER_PAUSE: (id) => `/work-orders/${id}/pause`,
  WORK_ORDER_COMPLETE: (id) => `/work-orders/${id}/complete`,
  WORK_ORDER_REPORT_ISSUE: (id) => `/work-orders/${id}/issues`,
  
  // Machines
  MACHINE_DETAIL: (id) => `/machines/${id}`,
  MACHINE_HISTORY: (id) => `/machines/${id}/history`,
  MACHINE_MAINTENANCE_LOGS: (id) => `/machines/${id}/maintenance-logs`,
  MACHINE_SPARE_PARTS: (id) => `/machines/${id}/spare-parts`,
  MACHINE_MANUAL: (id) => `/machines/${id}/manual`,
  
  // Breakdown Reports
  BREAKDOWN_REPORTS: '/breakdown-reports',
  TRANSCRIBE_AUDIO: '/breakdown-reports/transcribe',
  
  // Preventive Maintenance
  PREVENTIVE_TASKS: '/preventive-tasks',
  PREVENTIVE_TASK_COMPLETE: (id) => `/preventive-tasks/${id}/complete`,
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  MARK_NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
  MARK_ALL_NOTIFICATIONS_READ: '/notifications/read-all',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// Retry configuration
export const RETRY_CONFIG = {
  retries: 3,
  retryDelay: 1000, // 1 second
  retryStatusCodes: [408, 429, 500, 502, 503, 504], // Retry on these status codes
};