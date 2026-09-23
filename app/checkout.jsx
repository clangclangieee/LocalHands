import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";

export default function CheckoutScreen() {
  const { itemId, itemType } = useLocalSearchParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const boostFee = 50; // Set your boost price here (e.g., ₱50)

  // Cross-platform alert (Alert.alert for mobile, window.alert for web)
  const showAlert = (title, message, onOk) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [
        { text: "OK", onPress: onOk },
      ]);
    }
  };

  useEffect(() => {
    if (itemId && itemType) {
      fetchItemDetails();
    }
  }, [itemId, itemType]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const tableName = itemType === "chore" ? "chores" : "applicants";

      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) throw error;
      setItem(data);
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

 const BOOST_HOURS = 3; // Set boost duration to 3 hours

const handleConfirmBoost = async () => {
  try {
    setProcessing(true);
    const tableName = itemType === "chore" ? "chores" : "applicants";

    // Calculate expiration timestamp (+3 hours from now)
    const boostedUntil = new Date();
    boostedUntil.setHours(boostedUntil.getHours() + BOOST_HOURS);

    const { error } = await supabase
      .from(tableName)
      .update({
        is_boosted: true,
        boosted_until: boostedUntil.toISOString(),
      })
      .eq("id", itemId);

    if (error) throw error;

    showAlert(
      "Success! ⚡",
      `Your ${itemType === "chore" ? "task" : "profile"} is now marked as URGENT for 3 hours!`,
      () => router.back()
    );
  } catch (err) {
    showAlert("Payment/Boost Failed", err.message);
  } finally {
    setProcessing(false);
  }
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#660005" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.cardWrapper}>
        <Text style={styles.headerTitle}>⚡ Boost to Top</Text>
        <Text style={styles.subtitle}>
          Get 5x more visibility by placing your listing at the top of the feed!
        </Text>

        {/* Item Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeader}>
            {itemType === "chore" ? "TASK DETAILS" : "APPLICANT PROFILE"}
          </Text>

          <Text style={styles.itemTitle}>
            {itemType === "chore"
              ? item?.category
              : item?.full_name || item?.skills}
          </Text>

          <Text style={styles.itemDesc} numberOfLines={3}>
            {itemType === "chore" ? item?.description : item?.experience}
          </Text>
        </View>

        {/* Order Total */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Boost Fee:</Text>
          <Text style={styles.priceValue}>₱{boostFee}.00</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.confirmBtn, processing && styles.disabledBtn]}
          onPress={handleConfirmBoost}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm & Pay ₱{boostFee}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    backgroundColor: "#F8F9FA",
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 500, // Keeps the web layout centered and neat
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#660005",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#DF8F9C",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#660005",
    letterSpacing: 1,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  itemDesc: {
    color: "#333333",
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  confirmBtn: {
    backgroundColor: "#660005",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    cursor: "pointer", // Native pointer cursor on web
  },
  disabledBtn: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelBtn: {
    padding: 14,
    alignItems: "center",
    cursor: "pointer",
  },
  cancelBtnText: {
    color: "#888888",
    fontWeight: "600",
  },
});