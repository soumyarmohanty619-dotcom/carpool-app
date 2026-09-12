import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/AuthProvider";

export default function Home() {
  const { profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome"}
      </Text>
      <Text style={styles.subtitle}>Signed in as {profile?.roles.join(" & ")}.</Text>

      <View style={styles.menu}>
        <Link href="/(app)/rides" asChild>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Find a ride</Text>
          </Pressable>
        </Link>
        <Link href="/(app)/rides/new" asChild>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>Post a ride</Text>
          </Pressable>
        </Link>
        <Link href="/(app)/my-bookings" asChild>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>My bookings</Text>
          </Pressable>
        </Link>
        <Link href="/(app)/my-rides" asChild>
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuText}>My rides</Text>
          </Pressable>
        </Link>
      </View>

      <Pressable style={styles.signOut} onPress={handleSignOut} disabled={signingOut}>
        <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { color: "#525252", marginBottom: 12 },
  menu: { gap: 10 },
  menuItem: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    padding: 14,
  },
  menuText: { fontWeight: "600", color: "#171717" },
  signOut: { marginTop: 20, alignItems: "center" },
  signOutText: { color: "#dc2626", fontWeight: "600" },
});
