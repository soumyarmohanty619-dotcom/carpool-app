import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { hasRole } from "@carpool/shared";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/providers/AuthProvider";

export default function NewRide() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [priceDollars, setPriceDollars] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!profile || !hasRole(profile, "driver")) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Driver mode required</Text>
        <Text style={styles.subtitle}>Posting a ride needs the driver role on your account.</Text>
      </View>
    );
  }

  async function handleSubmit() {
    if (!session?.user) return;
    setSubmitting(true);
    setError(null);

    const seats = parseInt(seatsTotal, 10);
    const priceCents = priceDollars ? Math.round(parseFloat(priceDollars) * 100) : 0;
    const departure = new Date(departureAt.trim().replace(" ", "T"));

    if (!originText || !destinationText || Number.isNaN(seats) || Number.isNaN(departure.getTime())) {
      setError("Fill in all fields — departure as YYYY-MM-DD HH:MM.");
      setSubmitting(false);
      return;
    }

    const { data: ride, error: insertError } = await supabase
      .from("rides")
      .insert({
        driver_id: session.user.id,
        origin_text: originText,
        destination_text: destinationText,
        departure_at: departure.toISOString(),
        seats_total: seats,
        seats_available: seats,
        price_cents: priceCents,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError || !ride) {
      setError(insertError?.message ?? "Could not post this ride.");
      return;
    }

    router.replace(`/(app)/rides/${ride.id}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Post a ride</Text>
      <TextInput
        style={styles.input}
        placeholder="From (e.g. Downtown Austin)"
        value={originText}
        onChangeText={setOriginText}
      />
      <TextInput
        style={styles.input}
        placeholder="To (e.g. Houston)"
        value={destinationText}
        onChangeText={setDestinationText}
      />
      <TextInput
        style={styles.input}
        placeholder="Departure (YYYY-MM-DD HH:MM)"
        value={departureAt}
        onChangeText={setDepartureAt}
      />
      <TextInput
        style={styles.input}
        placeholder="Seats"
        keyboardType="number-pad"
        value={seatsTotal}
        onChangeText={setSeatsTotal}
      />
      <TextInput
        style={styles.input}
        placeholder="Price per seat (USD)"
        keyboardType="decimal-pad"
        value={priceDollars}
        onChangeText={setPriceDollars}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Posting…" : "Post ride"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 4 },
  subtitle: { color: "#525252" },
  input: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 8, padding: 12 },
  error: { color: "#dc2626" },
  button: { backgroundColor: "#171717", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
