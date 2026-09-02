import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kairos',
  slug: 'kairos-mvp',
  version: '1.0.0',
  scheme: 'kairos',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.atomzdigital.kairos',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'Kairos uses the camera to capture continuity photos on set.',
      NSPhotoLibraryUsageDescription: 'Kairos needs access to your photo library to attach continuity photos.',
      NSMicrophoneUsageDescription: 'Kairos uses the microphone for team video calls.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.atomzdigital.kairos',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0F172A',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['CAMERA', 'RECORD_AUDIO', 'READ_MEDIA_IMAGES'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    ['expo-image-picker', { photosPermission: 'Kairos needs access to your photo library to attach continuity photos.', cameraPermission: 'Kairos uses the camera to capture continuity photos on set.' }],
    'expo-document-picker',
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
