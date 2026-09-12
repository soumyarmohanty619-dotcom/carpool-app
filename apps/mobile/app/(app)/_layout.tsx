import { Redirect, Stack } from "expo-router";
import { needsRoleSelection } from "@carpool/shared";
import { useAuth } from "../../src/providers/AuthProvider";

export default function AppLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile || needsRoleSelection(profile)) return <Redirect href="/(onboarding)/role-selection" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
