import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    I18nManager,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../firebase";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  maroon: "#0c3b35", maroonDeep: "#08221f", maroonSoft: "#14594f", maroonGlow: "#1a7568",
  rose: "#a0d8cc", gold: "#D4A043", goldLight: "#F5DBA3", bg: "#F0F2F1", surface: "#FFFFFF",
  surfaceWarm: "#F5FAF8", text: "#0F1A18", textMuted: "#7A8A85", overlay: "rgba(8, 34, 31, 0.55)",
};

type AppNotification = {
  id: string;
  title: string;
  course: string;
  type: "file" | "alert" | "grade" | "chat";
  status: "unread" | "read";
  date: string;
  timestamp: number;
  routeObj: any;
};

function formatTime(ts: number) {
  if (!ts) return "الآن";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

function AnimatedNotificationCard({ item, index, onPress }: { item: AppNotification; index: number; onPress: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: 150 + index * 100, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, []);

  const isUnread = item.status === "unread";

  const getIcon = () => {
    switch (item.type) {
      case "grade": return "school";
      case "alert": return "alarm";
      case "file": return "play-circle-outline";
      case "chat": return "chatbubble-ellipses";
      default: return "notifications";
    }
  };

  return (
    <Animated.View style={[styles.cardOuter, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, isUnread ? { backgroundColor: C.surfaceWarm } : { backgroundColor: C.surface }]}>
        <View style={[styles.cardIconBox, isUnread ? { backgroundColor: "rgba(12,59,53,0.1)" } : { backgroundColor: "rgba(122,138,133,0.1)" }]}>
          <Ionicons name={getIcon()} size={28} color={isUnread ? C.maroon : C.textMuted} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardCourse}>{item.course}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaBadge}>
              <Ionicons name="time-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
          </View>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    let items: Record<string, AppNotification> = {};

    const updateItems = () => {
      setNotifications(Object.values(items).sort((a, b) => b.timestamp - a.timestamp));
    };

    // 1. Chats
    const unsubChats = onSnapshot(query(collection(db, "chats"), where("participants", "array-contains", user.uid)), (snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        const unread = data[`unreadCount_${user.uid}`] || 0;
        const otherTypeKey = `chat_${doc.id}`;
        if (unread > 0) {
          const otherParticipant = data.participants?.find((p: string) => p !== user.uid);
          // Only show up if we can identify the sender
          if (otherParticipant) {
             items[otherTypeKey] = {
               id: otherTypeKey, 
               title: `تم استلام ${unread} رسالة غير مقروءة`, 
               course: "محادثة جديدة", 
               type: "chat", 
               status: "unread",
               timestamp: data.lastMessageTime?.toMillis() || Date.now(),
               date: formatTime(data.lastMessageTime?.toMillis()),
               routeObj: { pathname: "/chat/[id]", params: { id: otherParticipant, name: "رسائل" } }
             };
          }
        } else {
          delete items[otherTypeKey];
        }
      });
      updateItems();
    });

    // 2. Lectures
    const unsubLectures = onSnapshot(query(collection(db, "lectures"), orderBy("createdAt", "desc"), limit(10)), (snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "active" || data.status === "accepted") {
          const ts = data.createdAt?.toMillis() || Date.now();
          items[`lec_${doc.id}`] = {
            id: `lec_${doc.id}`, 
            title: data.title || "محاضرة جديدة أضيفت", 
            course: "محاضرة جديدة", 
            type: "file", 
            status: "unread",
            timestamp: ts, 
            date: formatTime(ts), 
            routeObj: `/video/${doc.id}`
          };
        }
      });
      updateItems();
    });

    // 3. Quizzes
    const unsubQuizzes = onSnapshot(query(collection(db, "quizzes"), orderBy("createdAt", "desc"), limit(10)), (snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "active" || data.status === "accepted") {
          const ts = data.createdAt?.toMillis() || Date.now();
          items[`qz_${doc.id}`] = {
            id: `qz_${doc.id}`, 
            title: data.title || "تم إضافة اختبار جديد لك", 
            course: "اختبار متاح", 
            type: "alert", 
            status: "unread",
            timestamp: ts, 
            date: formatTime(ts), 
            routeObj: `/quiz/${doc.id}`
          };
        }
      });
      updateItems();
    });

    // 4. Graded Submissions
    const unsubGrades = onSnapshot(query(collection(db, "quiz_submissions"), where("studentId", "==", user.uid)), (snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.graded) {
          const ts = data.createdAt?.toMillis() || Date.now();
          items[`grd_${doc.id}`] = {
            id: `grd_${doc.id}`, 
            title: `تم تقييمك بدرجة: ${data.score}`, 
            course: data.quizTitle || "نتيجة اختبار", 
            type: "grade", 
            status: "unread",
            timestamp: ts, 
            date: formatTime(ts), 
            routeObj: `/quiz/${data.quizId}`
          };
        }
      });
      updateItems();
      setLoading(false);
    });

    return () => { unsubChats(); unsubLectures(); unsubQuizzes(); unsubGrades(); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgLayer}><View style={styles.bgPrimary} /></View>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
            <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
              <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>إشعاراتي</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 40 }} />
            ) : notifications.length === 0 ? (
              <Text style={{ textAlign: "center", color: C.textMuted, marginTop: 40, fontSize: 16 }}>لا توجد إشعارات حتى الآن</Text>
            ) : (
              notifications.map((item, idx) => (
                <AnimatedNotificationCard key={item.id} item={item} index={idx} onPress={() => router.push(item.routeObj)} />
              ))
            )}
           </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  bgLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 160 },
  bgPrimary: { ...StyleSheet.absoluteFillObject, backgroundColor: C.maroon, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  scrollContent: { paddingTop: 12, paddingBottom: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 25, direction: "rtl" },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  placeholder: { width: 42 },
  listContainer: { paddingHorizontal: 20, paddingTop: 10 },
  cardOuter: { marginBottom: 16 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, shadowColor: "#08221f", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, direction: "rtl" },
  cardIconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center", marginLeft: 16 },
  cardContent: { flex: 1, alignItems: "flex-end" },
  cardCourse: { fontSize: 12, fontWeight: "700", color: C.maroonGlow, marginBottom: 4, textAlign: 'right' },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 8, lineHeight: 22, textAlign: 'right' },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  metaBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  metaText: { fontSize: 11, fontWeight: "600", color: C.textMuted, marginRight: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold, position: "absolute", top: 24, left: 16 },
});
