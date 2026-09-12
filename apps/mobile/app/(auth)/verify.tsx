import { View, Text, StyleSheet } from "react-native";

export default function Verify() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent you a confirmation link. Open it on this device, then come back and sign in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: "600" },
  body: { textAlign: "center", color: "#525252" },
});
