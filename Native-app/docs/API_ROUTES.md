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
- POST `/work-orders/:id/issues` — Create an issue for a work order.
  - Used by: `src/services/workOrderService.js` → `reportWorkOrderIssue(id, issueData)`
  - Content-Type: `multipart/form-data`
  - Fields:
    - `description`: string
    - `needHelp`: 'true' | 'false'
    - `photo_{index}`: image/jpeg files (0..n)

## Machines
- GET `/machines/:id` — Machine details.
  - Used by: `src/services/machineService.js` → `getMachineById(id)`
- GET `/machines/:id/history` — Work/maintenance history.
  - Used by: `src/services/machineService.js` → `getMachineHistory(id)`
- GET `/machines/:id/maintenance-logs` — Preventive/corrective maintenance logs.
  - Used by: `src/services/machineService.js` → `getMaintenanceLogs(id)`
- GET `/machines/:id/spare-parts` — Spare parts list.
  - Used by: `src/services/machineService.js` → `getSpareParts(id)`
- GET `/machines/:id/manual` — Machine manual (PDF/URL).
  - Used by: `src/services/machineService.js` → `getMachineManual(id)`
  - Notes: `getMachineById()` का offline path अभी implement नहीं है; offline होने पर error throw करता है.

## Breakdown
- POST `/breakdown-reports` — Submit breakdown report.
  - Used by: `src/services/breakdownService.js` → `submitBreakdownReport(reportData, mediaFiles)`
  - Content-Type: `multipart/form-data`
  - Fields:
    - `audio`: single file (m4a). Sent as `audio` with filename `recording.m4a` and type `audio/m4a`.
    - `photo_{index}`: image/jpeg files (0..n).
    - `video_{index}`: video/mp4 files (0..n).
    - Text fields: `reportData` के keys (e.g., description, problem type, urgency) सीधे form-data में append होते हैं.
  - Notes: large uploads के लिए 60s timeout.
- POST `/breakdown-reports/transcribe` — Transcribe audio note.
  - Used by: `src/services/breakdownService.js` → `transcribeAudio(audioUri, sourceLanguage='auto', translate=false)`
  - Execution paths:
    - Direct Google STT (जब `USE_DIRECT_GOOGLE_STT=true` और `GOOGLE_SPEECH_API_KEY` सेट): Google Speech v1 को direct call; timeout ~45s. `translate=true` होने पर text English में translate होता है (`translateService`).
    - Backend endpoint (यह रूट): form-data fields → `audio` (m4a), `sourceLanguage`, और `targetLanguage` (जब translate=true). Timeout 30s.

## Preventive Maintenance
- GET `/preventive-tasks/my` — Logged-in user को assigned सारे preventive tasks लौटाता है (no assetId, no geofence required).
  - Used by: `src/contexts/AuthContext.js` → login/PIN unlock के बाद pending check via `src/services/preventiveService.js` → `listMyPreventiveTasks()`
- GET `/preventive-tasks` — Preventive tasks list (asset-scoped for native with geofence).
  - Native (operator): `mobile=true&assetId=...&latitude=...&longitude=...` → geofence enforced by backend (unless disabled via env or role is ADMIN/MANAGER).
  - Used by: `src/services/preventiveService.js` → `listPreventiveTasks(params)`
- POST `/preventive-tasks/:id/complete` — Preventive task complete करता है.
  - Used by: `src/services/preventiveService.js` → `completePreventiveTask(id)`

### Notes
- Native app preventives and work orders list calls `mobile=true` भेजते हैं ताकि server operator-specific filtering apply करे.
- Backend geofence toggle: `PREVENTIVE_GEOFENCE_ENABLED` (default `true`). `false` पर geofence/location requirement skip हो जाएगी.

## Notifications (defined, not currently called via axios in code)
- GET `/notifications` — List notifications.
- POST `/notifications/:id/read` — Mark a notification as read.
- POST `/notifications/read-all` — Mark all notifications read.
  - Endpoints defined in `src/constants/api.js (API_ENDPOINTS)`. Current implementation in `src/services/notificationService.js` uses AsyncStorage for local dummy notifications.

## Client-side Utilities (non-API)
- `src/services/machineService.js`
  - `verifyMachineLocation(machineId, currentLocation)` — client-side GPS distance check (Haversine). Backend route नहीं है.
  - `processQRCode(qrData)` — QR format: `machine_id|lat|long` parse करता है. Backend route नहीं है.

---

## Implementation Notes
- Axios base instance: सभी services `axios.create({ baseURL: API_URL })` यूज़ करती हैं (`src/constants/api.js`).
- Endpoints centralized: `API_ENDPOINTS` in `src/constants/api.js`.
- Timeouts summary:
  - Breakdown uploads: 60s
  - Transcription (backend endpoint): 30s
  - Transcription (Direct Google STT): ~45s
- Cloud toggles (`src/config/cloud.js`):
  - `USE_DIRECT_GOOGLE_STT` और `GOOGLE_SPEECH_API_KEY` सेट होने पर direct Google STT path यूज़ होगा.
  - `USE_DIRECT_GOOGLE_TRANSLATE` enable करने पर client-side translate path यूज़ होगा (API key required).
- Offline/dummy behavior:
  - `workOrderService.getWorkOrders()` API error पर dummy list लौटाता है.
  - `breakdownService.submitBreakdownReport()` offline होने पर dummy submission object देता है.
  - `notificationService` डिफॉल्ट रूप से AsyncStorage (local) यूज़ करता है.
- Retry configuration `RETRY_CONFIG` मौजूद है पर by default axios interceptors से wired नहीं है.
