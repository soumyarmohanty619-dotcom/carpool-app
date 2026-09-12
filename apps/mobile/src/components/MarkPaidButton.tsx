import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";

export function MarkPaidButton({ bookingId, onPaid }: { bookingId: string; onPaid: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{ url: string }>(
      "create-checkout-session",
      { body: { bookingId, returnBaseUrl: Linking.createURL("/") } }
    );
    if (invokeError || !data?.url) {
      setSubmitting(false);
      setError(invokeError?.message ?? "Could not start checkout.");
      return;
    }
    await WebBrowser.openBrowserAsync(data.url);
    setSubmitting(false);
    onPaid();
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={handlePress} disabled={submitting}>
        <Text style={styles.text}>{submitting ? "…" : "Pay now"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: "#171717", fontWeight: "600", fontSize: 13 },
  error: { color: "#dc2626", fontSize: 12 },
});
