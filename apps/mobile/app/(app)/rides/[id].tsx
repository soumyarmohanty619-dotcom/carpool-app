import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import type { Ride, Booking } from "@carpool/shared";
import { supabase } from "../../../src/lib/supabase";
import { useAuth } from "../../../src/providers/AuthProvider";

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<Pick<
    Booking,
    "id" | "status" | "seats_booked"
  > | null>(null);
  const [seats, setSeats] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session?.user) return;
    const { data: rideData } = await supabase.from("rides").select("*").eq("id", id).single();
    setRide(rideData ?? null);

    if (rideData) {
      const { data: driver } = await supabase
        .from("public_profiles")
        .select("full_name")
        .eq("id", rideData.driver_id)
        .single();
      setDriverName(driver?.full_name ?? null);
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, seats_booked")
      .eq("ride_id", id)
      .eq("rider_id", session.user.id)
      .maybeSingle();
    setExistingBooking(booking ?? null);
  }, [id, session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleBook() {
    if (!session?.user || !ride) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("bookings").insert({
      ride_id: ride.id,
      rider_id: session.user.id,
      seats_booked: parseInt(seats, 10) || 1,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    load();
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const isOwnRide = ride.driver_id === session?.user.id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {ride.origin_text} → {ride.destination_text}
      </Text>
      <Text style={styles.meta}>
        {new Date(ride.departure_at).toLocaleString()} · driven by {driverName ?? "Driver"}
      </Text>
      <Text style={styles.meta}>
        {ride.seats_available} of {ride.seats_total} seats left ·{" "}
        {ride.price_cents > 0 ? `$${(ride.price_cents / 100).toFixed(2)} / seat` : "Free"}
      </Text>

      {isOwnRide ? (
        <Text style={styles.meta}>This is your own ride — manage requests from My Rides.</Text>
      ) : existingBooking ? (
        <Text style={styles.meta}>
          Your request is <Text style={{ fontWeight: "600" }}>{existingBooking.status}</Text>.
        </Text>
      ) : ride.seats_available > 0 && ride.status === "active" ? (
        <View style={{ gap: 12 }}>
          <TextInput
            style={styles.input}
            placeholder="Seats to request"
            keyboardType="number-pad"
            value={seats}
            onChangeText={setSeats}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={handleBook} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Requesting…" : "Request seat"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.meta}>This ride is no longer available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: "600" },
  meta: { color: "#525252" },
  input: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 8, padding: 12 },
  error: { color: "#dc2626" },
  button: { backgroundColor: "#171717", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
