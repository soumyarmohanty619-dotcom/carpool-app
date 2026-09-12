import { useState } from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export function MarkPaidButton({ bookingId, onPaid }: { bookingId: string; onPaid: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handlePress() {
    setSubmitting(true);
    await supabase.from("bookings").update({ paid_at: new Date().toISOString() }).eq("id", bookingId);
    setSubmitting(false);
    onPaid();
  }

  return (
    <Pressable onPress={handlePress} disabled={submitting}>
      <Text style={styles.text}>{submitting ? "…" : "Mark as paid"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: "#171717", fontWeight: "600", fontSize: 13 },
});
