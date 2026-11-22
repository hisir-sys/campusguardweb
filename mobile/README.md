# CampusGuard phone app

**Know your school's cameras are healthy, and get told the moment something happens.**

The head of school can't watch screens all day. The phone app shows, in one glance, how many cameras are online, what alerted in the last 24 hours and which areas are busiest, and it pushes a notification to a locked phone when a serious alert fires. It signs in with the same account as the website, shows your name and school, and lets you edit them and the phone numbers that receive alerts.

Android only, installed from an APK on the [releases page](https://github.com/hisir-sys/campusguardweb/releases). It is not published to app stores. It reads only through the website's `/api/sync-data` and `/api/profile`.

Not built yet: video clips in the app (a later phase: opt-in upload to private storage with auto-delete).

## For developers

```
npm install
npm test                  # status and alert logic
npx expo start --web      # quick look in a browser
```

Alerts to a closed app use Firebase Cloud Messaging: `google-services.json` is built into the app and the website needs the `FIREBASE_SERVICE_ACCOUNT` environment variable in Vercel. Releases are built by GitHub Actions when `mobile/**` changes on main and are tagged `mobile-v<version>`.
