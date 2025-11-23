# Factory Operator App — API Routes

Base URL: `https://api.factoryapp.example.com` (from `src/constants/api.js` as `API_URL`)

Each route below lists the HTTP method, path, and purpose, with usage references to service functions.

## Auth
- POST `/auth/login` — Authenticate and return token.
  - Used by: `src/services/authService.js` → `login()`
- GET `/auth/profile` — Fetch current user profile.
  - Used by: `src/services/authService.js` → `getUserProfile()`
- POST `/auth/refresh-token` — Refresh JWT using refresh token.
  - Used by: `src/services/authService.js` → `refreshToken()`

## Work Orders
- GET `/work-orders` — List work orders (supports filters via query params).
  - Used by: `src/services/workOrderService.js` → `getWorkOrders()`
- GET `/work-orders/:id` — Get work order details.
  - Used by: `src/services/workOrderService.js` → `getWorkOrderById(id)`
- POST `/work-orders/:id/start` — Mark a work order as started.
  - Used by: `src/services/workOrderService.js` → `startWorkOrder(id)`
- POST `/work-orders/:id/pause` — Pause a work order.
  - Used by: `src/services/workOrderService.js` → `pauseWorkOrder(id)`
- POST `/work-orders/:id/complete` — Complete a work order (body includes completion data/checklist/notes).
  - Used by: `src/services/workOrderService.js` → `completeWorkOrder(id, data)`
- POST `/work-orders/:id/issues` — Create an issue for a work order (multipart/form-data for photos).
  - Used by: `src/services/workOrderService.js` → `reportWorkOrderIssue(id, issueData)`

## Assets
- GET `/assets/:id` — Asset details.
  - Used by: `src/services/assetService.js` → `getAssetById(id)`
- GET `/assets/:id/history` — Work/maintenance history.
  - Used by: `src/services/assetService.js` → `getAssetHistory(id)`
- GET `/assets/:id/maintenance-logs` — Preventive/corrective maintenance logs.
  - Used by: `src/services/assetService.js` → `getMaintenanceLogs(id)`
- GET `/assets/:id/spare-parts` — Spare parts list.
  - Used by: `src/services/assetService.js` → `getSpareParts(id)`
- GET `/assets/:id/manual` — Asset manual (PDF/URL).
  - Used by: `src/services/assetService.js` → `getAssetManual(id)`

## Breakdown
- POST `/breakdown-reports` — Submit breakdown report (multipart/form-data: audio/photos/videos + text fields).
  - Used by: `src/services/breakdownService.js` → `submitBreakdownReport(reportData, mediaFiles)`
  - Notes: 60s timeout for large uploads.
- POST `/breakdown-reports/transcribe` — Transcribe audio note.
  - Used by: `src/services/breakdownService.js` → `transcribeAudio(audioUri, sourceLanguage, translate)`
  - Notes: 30s timeout.

## Preventive Maintenance
- GET `/preventive-tasks` — List preventive tasks.
  - Web (admin dashboard): requires `assetId` query; returns all tasks for that asset. No geofence.
  - Native (operator): when called with `mobile=true` and an `assetId`, requires `latitude` and `longitude` (geofence) unless `PREVENTIVE_GEOFENCE_ENABLED=false` or role is ADMIN/MANAGER.
  - Used by: `Native-app/src/screens/maintenance/PreventiveMaintenanceScreen.js` via `src/services/preventiveService.js` → `listPreventiveTasks(params)`
- GET `/preventive-tasks/my` — List tasks assigned to the current user (no assetId, no geofence required).
  - Used by: `Native-app/src/contexts/AuthContext.js` to check pending tasks on login/unlock via `src/services/preventiveService.js` → `listMyPreventiveTasks()`
- POST `/preventive-tasks/:id/complete` — Mark a preventive task as completed.
  - Used by: `Native-app/src/services/preventiveService.js` → `completePreventiveTask(id)`

### Notes
- Geofence can be globally toggled with backend env `PREVENTIVE_GEOFENCE_ENABLED` (default: `true`). If `false`, native asset-scoped calls won’t require location nor enforce geofence.
- The native app sends `mobile=true` automatically in preventive and work-orders list calls to apply operator-specific server behavior.

## Notifications (defined, not currently called via axios in code)
- GET `/notifications` — List notifications.
- POST `/notifications/:id/read` — Mark a notification as read.
- POST `/notifications/read-all` — Mark all notifications read.
  - Endpoints defined in `src/constants/api.js (API_ENDPOINTS)`. Current implementation in `src/services/notificationService.js` uses AsyncStorage for local dummy notifications.

---

## Implementation Notes
- Axios base instance: all services create `axios.create({ baseURL: API_URL })`.
- Timeouts: Breakdown service sets custom timeouts for uploads/transcription.
- Offline/dummy behavior:
  - `workOrderService.getWorkOrders()` returns dummy list on API error.
  - `breakdownService.submitBreakdownReport()` returns a dummy submission object when offline.
  - `notificationService` uses AsyncStorage (local) by default.
- Retry configuration exists in `src/constants/api.js` (`RETRY_CONFIG`) but is not wired to axios interceptors by default.
