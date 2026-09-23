# Stoqra Mobile App 📦

React Native (Expo) wrapper app for the **Stoqra Inventory Manager** web application. 
The app loads the Stoqra website inside a native WebView shell for Android & iOS.

---

## ✨ Features

- **Full Stoqra Web App** inside a native shell — no data duplication
- **Native back button** support (Android hardware back, iOS swipe)
- **Offline error screen** with retry button
- **Pull-to-refresh** support
- **File uploads** (invoice PDFs) work natively
- **Store name** shown in header
- Splash screen, app icon, status bar integration

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Node.js 18+ from https://nodejs.org
# Install Expo CLI globally
npm install -g expo-cli eas-cli
```

### Run in Development

```bash
cd mobile
npm install
npx expo start
```

Then:
- **Android**: Press `a` (needs Android Studio + emulator, or scan QR with Expo Go app)
- **iOS**: Press `i` (needs Xcode on macOS, or scan QR with Expo Go app)
- **Web**: Press `w`

---

## 📱 Building & Publishing

### Option 1 — EAS Build (Recommended, Cloud Build)

**One-time setup:**
```bash
npx eas login
npx eas build:configure
```

**Build APK for Android (sideload/testing):**
```bash
npm run build:android:apk
# Downloads a .apk file you can install directly on any Android phone
```

**Build AAB for Google Play Store:**
```bash
npm run build:android:aab
```

**Build IPA for iOS App Store:**
```bash
npm run build:ios
# Requires Apple Developer account ($99/year)
```

### Option 2 — Local Build (Advanced)

```bash
# Android (requires Android Studio + Java)
npx expo run:android --variant release

# iOS (requires Xcode on macOS)
npx expo run:ios --configuration Release
```

---

## 🔧 Changing the Target URL

The app URL is defined at the top of `App.js`:

```js
const STOQRA_URL = 'https://ialksng.me/projects/stoqra/';
```

Change this if you self-host Stoqra at a different domain.

---

## 📁 Project Structure

```
mobile/
├── App.js            ← Main app (WebView wrapper)
├── app.json          ← Expo config (name, icons, permissions)
├── eas.json          ← EAS build profiles
├── package.json      ← Dependencies
└── assets/
    ├── icon.png          ← App icon (1024x1024 PNG)
    ├── splash-icon.png   ← Splash screen image
    └── adaptive-icon.png ← Android adaptive icon foreground
```

---

## 🔑 App Store Requirements

### Google Play Store
1. Create account at [play.google.com/console](https://play.google.com/console) (\$25 one-time fee)
2. Run `npm run build:android:aab` to get `.aab` file
3. Upload to Play Console → Create new app → Internal testing → Upload bundle
4. Fill in store listing details

### Apple App Store
1. Create Apple Developer account at [developer.apple.com](https://developer.apple.com) (\$99/year)
2. Run `npm run build:ios`
3. Submit via `npm run submit:ios` (fill in your Apple credentials in `eas.json`)
4. Review can take 1-3 days

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen | Check internet connection; verify STOQRA_URL is accessible |
| Build fails | Run `npx expo doctor` and fix any issues |
| Can't upload files on iOS | Check `NSPhotoLibraryUsageDescription` in app.json |
| Back button not working | Android only — make sure `canGoBack` state is updating |
