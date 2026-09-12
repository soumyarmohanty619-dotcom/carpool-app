import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import type { BookingStatus } from "@carpool/shared";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/AuthProvider";
import { RatingForm } from "../../src/components/RatingForm";

type RideRow = {
  id: string;
  origin_text: string;
  destination_text: string;
  departure_at: string;
  seats_available: number;
  seats_total: number;
};
type BookingRow = {
  id: string;
  ride_id: string;
  rider_id: string;
  seats_booked: number;
  status: BookingStatus;
  paid_at: string | null;
};

export default function MyRides() {
  const { session } = useAuth();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [riderNames, setRiderNames] = useState<Record<string, string>>({});
  const [ratedBookingIds, setRatedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data: rideRows } = await supabase
      .from("rides")
      .select("id, origin_text, destination_text, departure_at, seats_available, seats_total")
      .eq("driver_id", session.user.id)
      .order("departure_at", { ascending: true });
    setRides(rideRows ?? []);

    const rideIds = (rideRows ?? []).map((ride) => ride.id);
    if (rideIds.length) {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, ride_id, rider_id, seats_booked, status, paid_at")
        .in("ride_id", rideIds)
        .order("created_at", { ascending: true });
      setBookings(bookingRows ?? []);

      const riderIds = [...new Set((bookingRows ?? []).map((booking) => booking.rider_id))];
      if (riderIds.length) {
        const { data: riders } = await supabase.from("public_profiles").select("id, full_name").in("id", riderIds);
        setRiderNames(Object.fromEntries((riders ?? []).map((rider) => [rider.id, rider.full_name])));
      }

      const bookingIds = (bookingRows ?? []).map((booking) => booking.id);
      if (bookingIds.length) {
        const { data: myRatings } = await supabase
          .from("ratings")
          .select("booking_id")
          .eq("rater_id", session.user.id)
          .in("booking_id", bookingIds);
        setRatedBookingIds(new Set((myRatings ?? []).map((rating) => rating.booking_id)));
      }
    } else {
      setBookings([]);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function respond(bookingId: string, status: BookingStatus) {
    setPendingId(bookingId);
    await supabase.from("bookings").update({ status }).eq("id", bookingId);
    setPendingId(null);
    load();
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={rides}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<Text style={styles.title}>My rides</Text>}
      ListEmptyComponent={<Text style={styles.empty}>You haven&apos;t posted any rides yet.</Text>}
      renderItem={({ item: ride }) => {
        const rideBookings = bookings.filter((booking) => booking.ride_id === ride.id);
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {ride.origin_text} → {ride.destination_text}
            </Text>
            <Text style={styles.cardMeta}>
              {new Date(ride.departure_at).toLocaleString()} · {ride.seats_available}/{ride.seats_total} seats
              free
            </Text>
            {rideBookings.length === 0 ? (
              <Text style={styles.empty}>No requests yet.</Text>
            ) : (
              rideBookings.map((booking) => {
                const riderName = riderNames[booking.rider_id] ?? "Rider";
                return (
                  <View key={booking.id} style={styles.bookingRow}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.bookingText}>
                        {riderName} · {booking.seats_booked} seat{booking.seats_booked === 1 ? "" : "s"} ·{" "}
                        {booking.status} · {booking.paid_at ? "paid" : "unpaid"}
                      </Text>
                      {booking.status === "requested" ? (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            disabled={pendingId === booking.id}
                            onPress={() => respond(booking.id, "accepted")}
                          >
                            <Text style={styles.actionAccept}>Accept</Text>
                          </Pressable>
                          <Pressable
                            disabled={pendingId === booking.id}
                            onPress={() => respond(booking.id, "declined")}
                          >
                            <Text style={styles.actionDecline}>Decline</Text>
                          </Pressable>
                        </View>
                      ) : booking.status === "accepted" ? (
                        <Pressable
                          disabled={pendingId === booking.id}
                          onPress={() => respond(booking.id, "completed")}
                        >
                          <Text style={styles.actionAccept}>Mark completed</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {booking.status === "completed" && !ratedBookingIds.has(booking.id) ? (
                      <RatingForm
                        bookingId={booking.id}
                        rateeId={booking.rider_id}
                        rateeName={riderName}
                        onRated={load}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
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
  bookingRow: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  bookingText: { fontSize: 13, flexShrink: 1 },
  actionAccept: { color: "#171717", fontWeight: "600", fontSize: 13 },
  actionDecline: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
});
