# Factory Operator App

A React Native app (Expo SDK 53) for factory operators to manage work orders, view machine details, and report breakdowns.

## Tech Stack
- React Native (0.79) + React 19
- Expo (SDK 53)
- React Navigation v7 (bottom-tabs, native-stack, stack)
- Axios for API
- i18n-js + expo-localization for translations

## Quick Start

### Prerequisites
- Node.js LTS (>= 18)
- npm (or yarn/pnpm)
- For device/emulator builds:
  - Android Studio with SDKs (for Android)
  - Xcode (for iOS, macOS only)

### Install & Run
```bash
# install deps
npm install

# start Metro + Expo Dev Server
npm run start

# run platform targets (require native toolchains)
npm run android
npm run ios

# run web
npm run web
```

## Project Structure
```
factory-operator-app/
├─ App.js
├─ index.js
├─ app.json
├─ assets/
├─ docs/
│  ├─ API_ROUTES.md
│  ├─ PRD.md                (coming soon)
│  ├─ developer_guide.md    (coming soon)
│  └─ architecture.md       (coming soon)
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ constants/
│  │  └─ api.js
│  ├─ contexts/
│  │  ├─ AuthContext.js
│  │  ├─ LanguageContext.js
│  │  └─ ThemeContext.js
│  ├─ screens/
│  │  └─ dashboard/
│  │     └─ DashboardScreen.js
│  └─ services/
│     └─ workOrderService.js
└─ package.json
```

## Configuration
- API base URL is defined in `src/constants/api.js` as `API_URL`.
  - Default: `https://api.factoryapp.example.com`
  - Update this to point to your backend environment.
- API endpoints are centralized in `API_ENDPOINTS` in the same file.
  - Preventive:
    - `GET /preventive-tasks/my` lists tasks assigned to the current user (no geofence).
    - `GET /preventive-tasks` with `mobile=true&assetId=...&latitude=...&longitude=...` enforces geofence (subject to backend toggle).

## Features (current)
- Authentication (login, profile)
- Work Orders: list, detail, start/pause/complete, report issues (with media)
- Machines: detail, history, maintenance logs, spare parts, manual
- Breakdown reporting and audio transcription
- Basic notifications (routes defined; current implementation may be local)

## Recent Changes & Behavior
- Enter PIN screen:
  - Added a centered action under "Forgot PIN?" labeled "Enter Number" which triggers Change User. It clears PIN/tokens and routes to phone number entry.
  - If a user already has a PIN (as per backend `hasPinByContact`), OTP is skipped and the user proceeds directly to Enter PIN.
- Preventive Maintenance:
  - On login/PIN unlock, the app checks `/preventive-tasks/my` to see if any assigned tasks are pending; if true, the tab navigator starts on the Scanner tab.
  - When scanning or listing tasks by asset, native calls include `mobile=true` and (when asset-specific) latitude/longitude for geofence enforcement (unless disabled by backend env).
- Work Orders:
  - Native requests include `mobile=true` so the backend returns only the logged-in user's assigned work orders.
  - Web (admin) requests omit `mobile=true` and receive all work orders.
- Profile Screen (DP):
  - The profile picture now always shows a local user icon placeholder; it no longer fetches an avatar URL from the backend.

See `docs/API_ROUTES.md` for endpoint details and service mappings.

## Localization
- Translations via `i18n-js`. Edit `src/localization/translations.js` to add/update languages.

## Build Notes
- `npm run android` / `npm run ios` use Expo prebuild under the hood to run a dev build on emulator/device.
- For production builds, consider EAS Build (requires an Expo account and `eas.json`).

## Troubleshooting
- Metro cache issues:
  ```bash
  rm -rf node_modules && npm install
  npx expo start -c
  ```
- Android emulator not detected: open Android Studio > Device Manager, start a Virtual Device, then `npm run android`.
- iOS permissions/build: ensure Xcode command-line tools are installed.

## Documentation
- API routes: `docs/API_ROUTES.md`
- PRD: `docs/PRD.md` (to be added)
- Developer Guide: `docs/developer_guide.md` (to be added)
- Architecture: `docs/architecture.md` (to be added)

---

Questions or contributions welcome. Create issues/PRs as needed.
