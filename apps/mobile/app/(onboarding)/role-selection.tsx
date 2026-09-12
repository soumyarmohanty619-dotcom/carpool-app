import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ALL_ROLES, type AppRole } from "@carpool/shared";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/AuthProvider";

const ROLE_LABELS: Record<AppRole, string> = {
  rider: "I want to book rides",
  driver: "I want to offer rides",
};

export default function RoleSelection() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<AppRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: AppRole) {
    setSelected((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    );
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (selected.length === 0) {
      setError("Pick at least one — you can add the other later.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ roles: selected })
      .eq("id", session.user.id);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    router.replace("/");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you use Carpool?</Text>
      <Text style={styles.subtitle}>Pick one or both — you can change this later.</Text>
      {ALL_ROLES.map((role) => {
        const active = selected.includes(role);
        return (
          <Pressable
            key={role}
            onPress={() => toggleRole(role)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={active ? styles.optionTextActive : styles.optionText}>
              {ROLE_LABELS[role]}
            </Text>
          </Pressable>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving…" : "Continue"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  subtitle: { color: "#525252", marginBottom: 8 },
  option: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 8, padding: 14 },
  optionActive: { borderColor: "#171717", backgroundColor: "#f5f5f5" },
  optionText: { color: "#171717" },
  optionTextActive: { color: "#171717", fontWeight: "600" },
  error: { color: "#dc2626" },
  button: {
    backgroundColor: "#171717",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
