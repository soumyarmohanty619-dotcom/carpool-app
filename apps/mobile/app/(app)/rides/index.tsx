import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

type RideRow = {
  id: string;
  origin_text: string;
  destination_text: string;
  departure_at: string;
  seats_available: number;
  price_cents: number;
  driver_id: string;
};

export default function RidesList() {
  const [rides, setRides] = useState<RideRow[]>([]);
  const [driverNames, setDriverNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    let request = supabase
      .from("rides")
      .select("id, origin_text, destination_text, departure_at, seats_available, price_cents, driver_id")
      .eq("status", "active")
      .gt("seats_available", 0)
      .gt("departure_at", new Date().toISOString())
      .order("departure_at", { ascending: true })
      .limit(50);

    if (q) {
      request = request.or(`origin_text.ilike.%${q}%,destination_text.ilike.%${q}%`);
    }

    const { data } = await request;
    setRides(data ?? []);

    const driverIds = [...new Set((data ?? []).map((ride) => ride.driver_id))];
    if (driverIds.length) {
      const { data: drivers } = await supabase.from("public_profiles").select("id, full_name").in("id", driverIds);
      setDriverNames(Object.fromEntries((drivers ?? []).map((driver) => [driver.id, driver.full_name])));
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Find a ride</Text>
        <Link href="/(app)/rides/new">
          <Text style={styles.link}>Post a ride</Text>
        </Link>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search by city…"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query)}
        returnKeyType="search"
      />
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(query)} />}
        ListEmptyComponent={<Text style={styles.empty}>No upcoming rides match yet.</Text>}
        renderItem={({ item }) => (
          <Link href={`/(app)/rides/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.origin_text} → {item.destination_text}
              </Text>
              <Text style={styles.cardMeta}>
                {new Date(item.departure_at).toLocaleString()} · {item.seats_available} seat
                {item.seats_available === 1 ? "" : "s"} left · {driverNames[item.driver_id] ?? "Driver"}
              </Text>
              <Text style={styles.cardMeta}>
                {item.price_cents > 0 ? `$${(item.price_cents / 100).toFixed(2)}` : "Free"}
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "600" },
  link: { color: "#171717", fontWeight: "600" },
  search: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 8, padding: 10 },
  empty: { color: "#525252", marginTop: 24, textAlign: "center" },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "600", marginBottom: 4 },
  cardMeta: { color: "#525252", fontSize: 13 },
});
