import type { ExpoConfig } from "expo/config";

// EXPO_PUBLIC_* env vars are inlined by the Expo bundler automatically —
// read directly via process.env in code, nothing needed here.
const config: ExpoConfig = {
  name: "Carpool",
  slug: "carpool-app",
  scheme: "carpool",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.carpoolapp.mobile",
  },
  android: {
    package: "com.carpoolapp.mobile",
  },
  plugins: ["expo-router"],
};

export default config;
