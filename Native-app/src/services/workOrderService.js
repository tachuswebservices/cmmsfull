import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../constants/api';
import { getNetworkStatus } from '../utils/networkUtils';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Allow consumers (AuthContext) to set auth header for this module's axios instance
export const setWorkOrdersAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Dummy data fallback for development and offline usage
const DUMMY_WORK_ORDERS = [
  {
    id: 1001,
    title: 'Inspect Conveyor Belt',
    machineName: 'Conveyor A1',
    machineCode: 'CNV-A1',
    location: 'Line 1 - Section A',
    priority: 'High',
    status: 'pending',
    scheduledDate: new Date().toISOString(),
  },
  {
    id: 1002,
    title: 'Lubricate Gearbox',
    machineName: 'Press B2',
    machineCode: 'PRS-B2',
    location: 'Line 2 - Section B',
    priority: 'Medium',
    status: 'in_progress',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 1003,
    title: 'Replace Filter',
    machineName: 'Compressor C3',
    machineCode: 'CMP-C3',
    location: 'Utility Room',
    priority: 'Low',
    status: 'completed',
    scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Get all work orders
 * @param {Object} filters - Optional filters (status, priority, date, etc.)
 * @returns {Promise} - Response with work orders or error
 */
export const getWorkOrders = async (filters = {}) => {
  try {
    const response = await api.get(API_ENDPOINTS.WORK_ORDERS, {
      params: { mobile: true, ...filters },
    });
    // Backend returns { items: WorkOrder[], total }
    const payload = response?.data || {};
    const items = Array.isArray(payload.items) ? payload.items : null;
    if (!items) {
      // Unexpected shape; use dummy to keep UI functional
      return DUMMY_WORK_ORDERS;
    }

    // Normalize backend model to mobile UI expectations
    const mapPriority = (p) => {
      const v = String(p || '').toUpperCase();
      if (v === 'HIGH') return 'high';
      if (v === 'LOW') return 'low';
      return 'medium';
    };
    const mapStatus = (s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'IN_PROGRESS') return 'in_progress';
      if (v === 'PAUSED') return 'paused';
      if (v === 'COMPLETED') return 'completed';
      return 'pending';
    };

    return items.map((it) => ({
      id: it.id,
      title: it.title || 'Work Order',
      machineName: it.assetName || it.machineName || 'Unknown Machine',
      machineCode: it.assetId || it.machineCode || 'UNK',
      location: it.location || 'Unknown',
      priority: mapPriority(it.priority),
      status: mapStatus(it.status),
      scheduledDate: it.dueDate || it.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('API error fetching work orders, using dummy data:', error?.message || error);
    // Return dummy data fallback
    return DUMMY_WORK_ORDERS;
  }
};

/**
 * Get work order details by ID
 * @param {string} id - Work order ID
 * @returns {Promise} - Response with work order details or error
 */
export const getWorkOrderById = async (id) => {
  try {
    const response = await api.get(
      API_ENDPOINTS.WORK_ORDER_DETAIL(id),
      { params: { t: Date.now() }, headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
    );
    const it = response.data || {};
    // Build attachments list from various backend shapes
    const mediaFromIssues = Array.isArray(it.issues)
      ? it.issues.flatMap((iss) => Array.isArray(iss.mediaFiles) ? iss.mediaFiles : [])
      : [];
    const rawAttachments = (
      (Array.isArray(it.attachments) ? it.attachments : [])
        .concat(Array.isArray(it.files) ? it.files : [])
        .concat(mediaFromIssues)
    ).filter(Boolean);
    const toAttachment = (a) => {
      const urlRaw = typeof a === 'string' ? a : (a.url || a.uri || a.path || '');
      if (!urlRaw) return null;
      const absolute = /^https?:\/\//i.test(urlRaw)
        ? urlRaw
        : (urlRaw.startsWith('/') ? `${API_URL}${urlRaw}` : `${API_URL}/${urlRaw}`);
      const mime = typeof a === 'string' ? undefined : (a.mimeType || a.mimetype || undefined);
      const kind = typeof a === 'string'
        ? undefined
        : (a.kind || (typeof a.type === 'string' ? a.type.toLowerCase() : undefined) || undefined);
      return { url: absolute, mimeType: mime, kind };
    };
    const attachments = rawAttachments
      .map(toAttachment)
      .filter((u) => !!u)
      .filter((att, idx, arr) => arr.findIndex(x => x.url === att.url) === idx);
    const mapPriority = (p) => {
      const v = String(p || '').toUpperCase();
      if (v === 'HIGH') return 'high';
      if (v === 'LOW') return 'low';
      return 'medium';
    };
    const mapStatus = (s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'IN_PROGRESS') return 'in_progress';
      if (v === 'PAUSED') return 'paused';
      if (v === 'COMPLETED') return 'completed';
      return 'pending';
    };
    return {
      id: it.id,
      title: it.title || 'Work Order',
      description: it.description || '',
      machineName: it.assetName || it.machineName || 'Unknown Machine',
      machineCode: it.assetId || it.machineCode || 'UNK',
      location: it.location || 'Unknown',
      priority: mapPriority(it.priority),
      status: mapStatus(it.status),
      scheduledDate: it.dueDate || it.createdAt || new Date().toISOString(),
      dueDate: it.dueDate || null,
      createdAt: it.createdAt || null,
      assignedToName: it.assignedToName || null,
      assignedToId: it.assignedToId || null,
      assetName: it.assetName || null,
      assetId: it.assetId || null,
      attachments,
    };
  } catch (error) {
    console.warn(`API error fetching work order ${id}, using dummy data:`, error?.message || error);
    const wo = DUMMY_WORK_ORDERS.find(w => w.id.toString() === id.toString());
    if (wo) return wo;
    // If not found in dummy, return a minimal placeholder to avoid crash
    return {
      id,
      title: `Work Order ${id}`,
      machineName: 'Unknown Machine',
      machineCode: 'UNK',
      location: 'Unknown',
      priority: 'Low',
      status: 'pending',
      scheduledDate: new Date().toISOString(),
    };
  }
};

/**
 * Start a work order
 * @param {string} id - Work order ID
 * @returns {Promise} - Response with updated work order or error
 */
export const startWorkOrder = async (id) => {
  try {
    const response = await api.post(API_ENDPOINTS.WORK_ORDER_START(id));
    return response.data;
  } catch (error) {
    console.error(`Error starting work order ${id}:`, error);
    throw error;
  }
};

/**
 * Pause a work order
 * @param {string} id - Work order ID
 * @returns {Promise} - Response with updated work order or error
 */
export const pauseWorkOrder = async (id) => {
  try {
    const response = await api.post(API_ENDPOINTS.WORK_ORDER_PAUSE(id));
    return response.data;
  } catch (error) {
    console.error(`Error pausing work order ${id}:`, error);
    throw error;
  }
};

/**
 * Complete a work order
 * @param {string} id - Work order ID
 * @param {Object} data - Completion data (notes, checklist, etc.)
 * @returns {Promise} - Response with updated work order or error
 */
export const completeWorkOrder = async (id, data = {}) => {
  try {
    const response = await api.post(API_ENDPOINTS.WORK_ORDER_COMPLETE(id), data);
    return response.data;
  } catch (error) {
    console.error(`Error completing work order ${id}:`, error);
    throw error;
  }
};

/**
 * Report an issue for a work order
 * @param {string} id - Work order ID
 * @param {Object} issueData - Issue data (description, photos, etc.)
 * @returns {Promise} - Response with created issue or error
 */
export const reportWorkOrderIssue = async (id, issueData) => {
  try {
    const formData = new FormData();
    
    // Add text data
    formData.append('description', issueData.description);
    formData.append('needHelp', issueData.needHelp ? 'true' : 'false');
    
    // Add photos if any
    if (issueData.photos && issueData.photos.length > 0) {
      issueData.photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `issue_photo_${index}.jpg`,
        });
      });
    }
    
    const response = await api.post(
      API_ENDPOINTS.WORK_ORDER_REPORT_ISSUE(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error reporting issue for work order ${id}:`, error);
    throw error;
  }
};
