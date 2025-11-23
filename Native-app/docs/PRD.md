# Product Requirements Document (PRD) — Factory Operator App

## 1) Overview
A mobile app (React Native + Expo) for factory operators to manage work orders on the shop floor, access machine information, and report breakdowns with media.

## 2) Problem Statement
- Paper-based or ad-hoc processes slow down execution and tracking of work orders.
- Operators need quick access to job details, machine context, and an easy way to report issues.

## 3) Goals
- Enable operators to view, start, pause, and complete work orders efficiently.
- Provide quick machine context and history to reduce downtime.
- Streamline breakdown reporting (text, photos, audio notes) from the floor.
- Support basic offline behavior and clear, localized UI.

## 4) Non-Goals
- Full-blown CMMS replacement.
- Advanced workforce scheduling or inventory procurement.
- Complex analytics dashboards (beyond basic summaries).

## 5) Users & Personas
- Operator: executes tasks, updates status, reports issues.
- Supervisor: monitors progress and reviews breakdowns (phase 2).
- Maintenance Tech: reviews machine logs/history (phase 2).

## 6) Key User Journeys
- Auth:
  - Login via username/password.
  - Optional phone OTP + PIN flow for quick unlock.
  - "Remember me" and inactivity auto-lock.
- Work Orders:
  - View list, filter (basic), open details.
  - Start/Pause/Complete with checklist/notes.
  - Report issue with media.
- Machines:
  - View machine details, history, maintenance logs, spare parts, manual link.
- Breakdown:
  - Submit report with text + media; optional audio transcription.

## 7) Functional Requirements
- Authentication
  - Login, logout, session check, remember-me.
  - PIN unlock after OTP (optional flow).
- Work Orders
  - List, detail, start, pause, complete.
  - Report issue with media.
- Machines
  - Detail, history, maintenance logs, spare parts, manual link.
- Breakdown
  - Submit report; audio transcription.
- Notifications (basic)
  - Local notifications for OTP; API routes exist for future server-driven notifications.
- Localization
  - i18n with multiple languages.

## 8) Non-Functional Requirements
- Performance: snappy navigation; requests timeout within 30–60s.
- Reliability: graceful fallback for API failures; basic offline stubs.
- Security: token in secure storage; inactivity auto-lock; minimal PII.
- Usability: simple flows, large touch targets; clear status.
- Compatibility: Android and iOS; light theme.

## 9) Success Metrics
- Time-to-complete work order reduced by X%.
- Breakdown report submission success rate > 98%.
- <2% crash rate across sessions.
- >80 NPS from operators in pilot.

## 10) Constraints & Assumptions
- API base URL configured in `src/constants/api.js`.
- Some features may use mock/local storage when offline or during development.
- Retry config present but not globally wired by default.

## 11) Dependencies
- Mobile: React Native + Expo.
- Backend: REST endpoints documented in `docs/API_ROUTES.md`.

## 12) Phase Plan
- Phase 1 (MVP): Auth, Work Orders basic, Machines detail, Breakdown report.
- Phase 2: Notifications from server, richer filters/search, role-based screens.
- Phase 3: Offline sync, analytics, QR code driven navigation.

## 13) Open Questions
- Final API SLA and authentication method (JWT refresh/rotation)?
- Required languages for localization?
- Exact breakdown media limits (file size, count)?
