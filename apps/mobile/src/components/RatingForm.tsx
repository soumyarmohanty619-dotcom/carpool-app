import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

export function RatingForm({
  bookingId,
  rateeId,
  rateeName,
  onRated,
}: {
  bookingId: string;
  rateeId: string;
  rateeName: string;
  onRated: () => void;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!session?.user) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("ratings").insert({
      booking_id: bookingId,
      rater_id: session.user.id,
      ratee_id: rateeId,
      score,
      comment: comment || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setOpen(false);
    onRated();
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Text style={styles.link}>Rate {rateeName}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setScore(value)}>
            <Text style={value <= score ? styles.starActive : styles.starInactive}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Optional comment" value={comment} onChangeText={setComment} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submit}>{submitting ? "Submitting…" : "Submit rating"}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(false)}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: "#171717", fontWeight: "600", fontSize: 13 },
  form: { gap: 8, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 8, padding: 10, marginTop: 6 },
  starActive: { fontSize: 18, color: "#f59e0b" },
  starInactive: { fontSize: 18, color: "#d4d4d4" },
  input: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 6, padding: 8, fontSize: 13 },
  error: { color: "#dc2626", fontSize: 12 },
  submit: { color: "#171717", fontWeight: "600", fontSize: 13 },
  cancel: { color: "#737373", fontSize: 13 },
});
