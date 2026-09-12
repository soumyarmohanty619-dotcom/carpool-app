import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import type { BookingStatus } from "@carpool/shared";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/AuthProvider";
import { MarkPaidButton } from "../../src/components/MarkPaidButton";
import { RatingForm } from "../../src/components/RatingForm";

type BookingRow = {
  id: string;
  seats_booked: number;
  status: BookingStatus;
  paid_at: string | null;
  rides: { origin_text: string; destination_text: string; departure_at: string; driver_id: string } | null;
};

export default function MyBookings() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [driverNames, setDriverNames] = useState<Record<string, string>>({});
  const [ratedBookingIds, setRatedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, seats_booked, status, paid_at, rides(origin_text, destination_text, departure_at, driver_id)")
      .eq("rider_id", session.user.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as BookingRow[];
    setBookings(rows);

    const driverIds = [...new Set(rows.map((row) => row.rides?.driver_id).filter(Boolean))] as string[];
    if (driverIds.length) {
      const { data: drivers } = await supabase.from("public_profiles").select("id, full_name").in("id", driverIds);
      setDriverNames(Object.fromEntries((drivers ?? []).map((driver) => [driver.id, driver.full_name])));
    }

    const bookingIds = rows.map((row) => row.id);
    if (bookingIds.length) {
      const { data: myRatings } = await supabase
        .from("ratings")
        .select("booking_id")
        .eq("rater_id", session.user.id)
        .in("booking_id", bookingIds);
      setRatedBookingIds(new Set((myRatings ?? []).map((rating) => rating.booking_id)));
    }
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function cancel(bookingId: string) {
    setPendingId(bookingId);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    setPendingId(null);
    load();
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<Text style={styles.title}>My bookings</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No requests yet — go find a ride.</Text>}
      renderItem={({ item: booking }) => {
        const driverId = booking.rides?.driver_id ?? "";
        const driverName = driverNames[driverId] ?? "driver";
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {booking.rides?.origin_text} → {booking.rides?.destination_text}
            </Text>
            <Text style={styles.cardMeta}>
              {booking.rides ? new Date(booking.rides.departure_at).toLocaleString() : ""} · with {driverName} ·{" "}
              {booking.seats_booked} seat{booking.seats_booked === 1 ? "" : "s"} · {booking.status}
              {booking.paid_at ? " · paid" : ""}
            </Text>
            {booking.status === "requested" || booking.status === "accepted" ? (
              <Pressable disabled={pendingId === booking.id} onPress={() => cancel(booking.id)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            ) : null}
            {(booking.status === "accepted" || booking.status === "completed") && !booking.paid_at ? (
              <MarkPaidButton bookingId={booking.id} onPaid={load} />
            ) : null}
            {booking.status === "completed" && !ratedBookingIds.has(booking.id) ? (
              <RatingForm bookingId={booking.id} rateeId={driverId} rateeName={driverName} onRated={load} />
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  empty: { color: "#525252" },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, marginBottom: 10, gap: 6 },
  cardTitle: { fontWeight: "600" },
  cardMeta: { color: "#525252", fontSize: 13 },
  cancel: { color: "#dc2626", fontWeight: "600" },
});
