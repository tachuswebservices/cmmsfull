import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../constants/api';

// Axios instance for preventive APIs
const api = axios.create({ baseURL: API_URL });

// Allow AuthContext to inject/remove token
export const setPreventiveAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Fetch preventive tasks, optionally filtered by assetId
export const listPreventiveTasks = async (params = {}) => {
  const res = await api.get(API_ENDPOINTS.PREVENTIVE_TASKS, { params: { mobile: true, ...params } });
  return Array.isArray(res.data) ? res.data : [];
};

// Fetch preventive tasks assigned to the current user (no geofence)
export const listMyPreventiveTasks = async () => {
  const res = await api.get(`${API_ENDPOINTS.PREVENTIVE_TASKS}/my`);
  return Array.isArray(res.data) ? res.data : [];
};

// Mark a given preventive task as completed
export const completePreventiveTask = async (id) => {
  if (!id) throw new Error('Task id is required');
  const res = await api.post(API_ENDPOINTS.PREVENTIVE_TASK_COMPLETE(id));
  return res.data;
};

export default {
  setPreventiveAuthToken,
  listPreventiveTasks,
  listMyPreventiveTasks,
  completePreventiveTask,
};
