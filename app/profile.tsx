import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase";

const { width } = Dimensions.get("window");

const C = {
  bgDeep: "#061a15",
  bgMid: "#0a2e25",
  bgLight: "#0f4236",
  bgMain: "#F4F7F6",
  white: "#FFFFFF",
  glass: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.2)",
  gold: "#D4A043",
  textGray: "#808A87",
  textBlack: "#1a1f1d",
  surface: "#FFFFFF",
  redBadge: "#FF3B30",
  danger: "#FF3B30",
};

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Check if teacher first
          const teacherDocRef = doc(db, "teachers", user.uid);
          const teacherSnap = await getDoc(teacherDocRef);
          if (teacherSnap.exists()) {
            setRole("teacher");
            setUserData(teacherSnap.data());
            return;
          }

          // Otherwise, must be a student
          const studentDocRef = doc(db, "students", user.uid);
          const studentSnap = await getDoc(studentDocRef);
          if (studentSnap.exists()) {
            setRole("student");
            setUserData(studentSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("خطأ", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.gold} />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-forward" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {userData?.image ? (
              <Image
                source={{ uri: userData.image }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={50} color={C.white} />
            )}
            <View style={styles.roleBadge}>
              <Ionicons
                name={role === "teacher" ? "ribbon" : "school"}
                size={14}
                color={C.white}
              />
              <Text style={styles.roleText}>
                {role === "teacher" ? "معلم" : "طالب"}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>
            {userData?.name || auth.currentUser?.displayName || "المستخدم"}
          </Text>
          <Text style={styles.email}>
            {userData?.email || auth.currentUser?.email}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {role === "teacher" ? "المادة" : "الفرع"}
              </Text>
              <Text style={styles.statValue}>{userData?.subject || "عام"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {role === "teacher" ? "تاريخ الانضمام" : "التقدم"}
              </Text>
              <Text style={styles.statValue}>
                {role === "teacher"
                  ? userData?.createdAt
                    ? new Date(userData.createdAt).getFullYear()
                    : new Date().getFullYear()
                  : `${userData?.progress || 0}%`}
              </Text>
            </View>
          </View>
          {role === "teacher" && (
            <View style={{ marginTop: 24, width: "100%" }}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/teacher_lectures")}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name="videocam" size={20} color={C.bgDeep} />
                </View>
                <Text style={styles.menuItemText}>المحاضرات المرفوعة</Text>
                <Ionicons name="chevron-back" size={20} color={C.textGray} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push("/teacher_quizzes")}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name="document-text" size={20} color={C.bgDeep} />
                </View>
                <Text style={styles.menuItemText}>الاختبارات المنشأة</Text>
                <Ionicons name="chevron-back" size={20} color={C.textGray} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color={C.white} />
          <Text style={styles.actionText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgLight },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bgLight,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
    height: 100,
    backgroundColor: C.textBlack,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: C.white },
  content: { padding: 24, paddingTop: 80, paddingBottom: 60 },
  profileCard: {
    backgroundColor: C.surface,
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    elevation: 8,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.bgLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: -80,
    borderWidth: 6,
    borderColor: C.surface,
    elevation: 10,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 60 },
  roleBadge: {
    position: "absolute",
    bottom: -5,
    backgroundColor: C.gold,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: C.surface,
    gap: 4,
  },
  roleText: { color: C.white, fontSize: 14, fontWeight: "bold" },
  name: {
    fontSize: 26,
    fontWeight: "900",
    color: C.textBlack,
    marginBottom: 6,
  },
  email: { fontSize: 15, color: C.textGray, marginBottom: 24 },
  statsContainer: {
    flexDirection: "row-reverse",
    backgroundColor: "#F5FAF8",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statBox: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    height: "80%",
    alignSelf: "center",
  },
  statLabel: {
    fontSize: 14,
    color: C.textGray,
    marginBottom: 6,
    fontWeight: "bold",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: C.bgDeep },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: C.textBlack,
    marginRight: 16,
    textAlign: "right",
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: C.danger,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    gap: 10,
    elevation: 6,
  },
  actionText: { color: C.white, fontSize: 18, fontWeight: "bold" },
});
