# CampusGuard mobile (Android + iOS)

One Expo / React Native app. Signs in with the same account as the website and shows school PCs, camera health and alerts.
It reads only through the website's `/api/sync-data` (nothing in the database is opened up).

## Try it
    npm install
    npm test                      # status/time logic
    npx expo start --web          # quick look in a browser (login, overview, alerts)

## Phone alerts (Firebase)
Alerts to a closed app go through Firebase Cloud Messaging: `mobile/google-services.json` is built into the app and the website needs the `FIREBASE_SERVICE_ACCOUNT` env var (service-account JSON) in Vercel. Older notes below about Expo/EAS no longer apply.
1. Run `supabase/push_devices.sql` (website repo, branch `mobile-push`) in the Supabase SQL Editor, then deploy that branch.
2. `npm i -g eas-cli && eas login && eas init` (writes the project id into app.json), then
   `eas build --profile development --platform android` and install the APK on your phone.
   Expo Go cannot receive remote push on Android, so a development build is required.
3. Android push also needs a Firebase (FCM) key uploaded with `eas credentials`. iOS later needs an Apple Developer account ($99/yr).

## Not built yet
Video clips in the app (phase 2: opt-in upload to private storage with auto-delete).
