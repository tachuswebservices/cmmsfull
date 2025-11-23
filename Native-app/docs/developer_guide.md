# Developer Guide — Factory Operator App

This guide helps developers set up, run, and extend the app.

## 1) Stack & Key Libraries
- React Native 0.79 + React 19
- Expo SDK 53
- React Navigation v7 (bottom-tabs, native-stack, stack)
- Axios for HTTP
- i18n-js + expo-localization for translations
- Secure storage via `expo-secure-store`

## 2) Getting Started

### Prerequisites
- Node.js LTS (>= 18)
- npm (or yarn/pnpm)
- Android Studio (for Android) / Xcode (for iOS on macOS)

### Install & Run
```bash
npm install
npm run start
# platform targets
npm run android
npm run ios
npm run web
```

### Scripts (from package.json)
- `start`: Expo dev server
- `android`: Run Android dev build (prebuild)
- `ios`: Run iOS dev build (prebuild)
- `web`: Run on web

## 3) Configuration
- API base URL: `src/constants/api.js` → `API_URL`
  - Default: `https://api.factoryapp.example.com`
- Endpoints are centralized in `API_ENDPOINTS` in the same file.
- Request timeout: `REQUEST_TIMEOUT`
- Retry config: `RETRY_CONFIG` (note: not globally wired to axios by default)

## 4) Project Structure (high level)
```
src/
├─ assets/
├─ components/
├─ constants/
│  └─ api.js
├─ contexts/
│  ├─ AuthContext.js
│  ├─ LanguageContext.js
│  └─ ThemeContext.js
├─ screens/
│  └─ dashboard/
│     └─ DashboardScreen.js
└─ services/
   ├─ workOrderService.js
   └─ ... (authService, machineService, breakdownService, notificationService)
```

## 5) Services & API Calls
- All services typically create axios instances using `API_URL`.
- Routes are documented in `docs/API_ROUTES.md`.
- Some services have graceful fallbacks when offline or API fails.

## 6) Auth & Session
- Implementation in `src/contexts/AuthContext.js`:
  - Token stored with `expo-secure-store` using key `factory_app_token`.
  - "Remember me" using AsyncStorage; inactivity timeout (30 min) if not remembered.
  - Optional phone OTP → PIN lock flow (OTP delivered via local notification) for quick unlock.
  - Dev-only login bypass: username `Operator1` and password `123` creates a mock token.
- Provider exports:
  - `login`, `logout`, `checkSession`, `updateLastActive`
  - OTP/PIN helpers: `requestOtp`, `verifyOtp`, `setPin`, `unlockWithPin`, `resetPin`

## 7) Navigation & Screens
- The app uses React Navigation v7. Main example screen: `DashboardScreen.js` under `src/screens/dashboard/`.
- Compose screens into stacks/tabs as needed. Keep screens lean; place side-effects in hooks/services.

## 8) Localization
- `i18n-js` setup with `expo-localization`.
- Translations live in `src/localization/translations.js`.
- Add keys consistently and avoid hard-coded strings in UI.

## 9) Styling & UI
- `react-native-paper` components are available.
- Keep UI accessible: adequate contrast, touch targets, clear labels.

## 10) Error Handling
- Use try/catch around async calls; show user-friendly messages.
- Log errors to console for dev; consider adding a crash/logging service for prod.

## 11) Debugging Tips
- Network: inspect using Flipper (Android) or Xcode tools (iOS). Metro logs are often sufficient.
- Clear caches when in doubt:
  ```bash
  rm -rf node_modules && npm install
  npx expo start -c
  ```
- Android emulator issues: start a Virtual Device from Android Studio > Device Manager.

## 12) Testing
- Unit/integration tests are not set up yet. Suggested stack: Jest + React Native Testing Library.

## 13) Git & PR Flow (suggested)
- Feature branches from `main`.
- Small, focused PRs with description and screenshots where applicable.
- Reference `docs/PRD.md` and `docs/architecture.md` for context.

## 14) Build & Releases
- Dev builds via `npm run android` / `npm run ios` (Expo prebuild under the hood).
- For production, consider EAS Build and OTA updates.

## 15) Future Enhancements
- Wire `RETRY_CONFIG` to axios interceptors or use `axios-retry`.
- Introduce global error/toast handling.
- Add proper testing, linting, and CI.
