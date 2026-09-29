import type { ExpoConfig } from 'expo/config'

const inviteHost = process.env.EXPO_PUBLIC_INVITE_HOST || 'turnos.example.com'
const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713'
const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511'
const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.000000000000-placeholder'

const config: ExpoConfig = {
  name: 'Turnos Fútbol',
  slug: 'turnos-futbol',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'turnos',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.turnos.futbol',
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'app.turnos.futbol',
    adaptiveIcon: {
      backgroundColor: '#09090b',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: inviteHost, pathPrefix: '/j' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-secure-store',
    ['react-native-google-mobile-ads', { androidAppId, iosAppId }],
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
  ],
  extra: { inviteHost },
}

export default config
