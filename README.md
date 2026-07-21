# Bonds Mobile

Real-time family messaging mobile app built with React Native (Expo).

## 🛠 Tech Stack

- React Native 0.81 (Expo SDK 54)
- TypeScript
- React Navigation (native stack)
- WebSocket / STOMP (@stomp/stompjs)
- Axios
- AsyncStorage
- Expo Notifications (push)
- react-native-svg (chat bubble shapes)

## 🚀 Features

- ✅ Email + password login with 2FA (one-time code sent by email)
- ✅ Auto refresh-token renewal (no forced re-login when the access token expires)
- ✅ Real-time messaging (WebSocket)
- ✅ Message history with pagination
- ✅ Message search within a chat
- ✅ Edit / delete / copy messages
- ✅ Clickable links in messages
- ✅ Image & voice messages
- ✅ Push notifications open the right chat
- ✅ Light/dark theme (follows system setting, manual override)
- ✅ RU/EN localization
- 🔄 End-to-end encryption (coming soon)

## 📋 Prerequisites

- Node.js 18+
- Expo CLI / EAS CLI
- Android Studio (for Android builds) or Xcode (for iOS)

## 📁 Project Structure

src/
- ├── components/    # Reusable UI (chat bubble, modals, floating clouds)
- ├── context/       # Language & theme context
- ├── hooks/         # Custom hooks (keyboard, etc.)
- ├── screens/       # App screens (login, register, OTP, room select, chat)
- ├── services/      # API client (axios) & WebSocket client
- ├── styles/        # Theme (colors, spacing, typography)
- ├── types/         # Shared TypeScript types
- └── utils/         # Date formatting, auth events, notifications, password rules

## 📱 Screens

- Login / Register / OTP verify (email 2FA)
- Room select (chat list, create/delete chat)
- Chat room (messages, search, edit/delete, image/voice, pagination)

## 🗄️ Configuration

- Backend URL: `src/services/api.ts` (`BASE_URL`)
- App config: `app.json` (Expo) — bundle IDs, push notification color, adaptive icon, splash screen

## 📄 License

MIT

## 👨‍💻 Author

Mykhailo Vorontsov

## 🔧 Quick Start

```bash
# Clone repository
git clone https://github.com/michw85/family-messenger-mobile.git
cd family-messenger-mobile

# Install dependencies
npm install

# Start Metro bundler
npx expo start

# Run on Android device/emulator
npx expo run:android

# Run on iOS simulator
npx expo run:ios
```
