import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    I18nManager,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  maroon: "#0c3b35",
  maroonDeep: "#08221f",
  maroonSoft: "#14594f",
  maroonGlow: "#1a7568",
  rose: "#a0d8cc",
  gold: "#D4A043",
  goldLight: "#F5DBA3",
  bg: "#F0F2F1",
  surface: "#FFFFFF",
  surfaceWarm: "#F5FAF8",
  text: "#0F1A18",
  textMuted: "#7A8A85",
  overlay: "rgba(8, 34, 31, 0.55)",
};

const NOTIFICATIONS = [
  {
    id: 1,
    title: "تم رصد درجة الخوارزميات",
    course: "تحديث جديد",
    type: "grade",
    status: "غير مقروء",
    date: "منذ ١٥ دقيقة",
  },
  {
    id: 2,
    title: "محاضرة مباشرة: هياكل البيانات",
    course: "تذكير بموعد محاضرة",
    type: "alert",
    status: "غير مقروء",
    date: "اليوم ٤:٠٠ م",
  },
  {
    id: 3,
    title: "إضافة ملفات جديدة",
    course: "مقرر هندسة البرمجيات",
    type: "file",
    status: "مقروء",
    date: "أمس",
  },
];

function AnimatedNotificationCard({
  item,
  index,
}: {
  item: (typeof NOTIFICATIONS)[0];
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: 150 + index * 100,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const isUnread = item.status === "غير مقروء";

  const getIcon = () => {
    switch (item.type) {
      case "grade":
        return "school";
      case "alert":
        return "alarm";
      case "file":
        return "folder";
      default:
        return "notifications";
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.card,
          isUnread
            ? { backgroundColor: C.surfaceWarm }
            : { backgroundColor: C.surface },
        ]}
      >
        <View
          style={[
            styles.cardIconBox,
            isUnread
              ? { backgroundColor: "rgba(12,59,53,0.1)" }
              : { backgroundColor: "rgba(122,138,133,0.1)" },
          ]}
        >
          <Ionicons
            name={getIcon()}
            size={28}
            color={isUnread ? C.maroon : C.textMuted}
          />
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

        {isUnread && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: C.gold,
              alignSelf: "center",
              marginLeft: 8,
            }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgLayer}>
        <View style={styles.bgPrimary} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Ionicons
                name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
                size={26}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>إشعاراتي</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Filters/Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[styles.filterPill, styles.filterPillActive]}
            >
              <Text
                style={[styles.filterPillText, styles.filterPillTextActive]}
              >
                الكل
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>مستمر</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>مكتمل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>تم الحفظ</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Lectures List */}
          <View style={styles.listContainer}>
            {NOTIFICATIONS.map((item, idx) => (
              <AnimatedNotificationCard key={item.id} item={item} index={idx} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bgPrimary: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.maroon,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 25,
    direction: "rtl",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 42,
  },
  filtersScroll: {
    marginBottom: 20,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
    direction: "rtl",
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0,0,0,0.1)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {
        shadowColor: "rgba(0,0,0,0.1)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
    }),
  },
  filterPillActive: {
    backgroundColor: C.gold,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  filterPillTextActive: {
    color: C.maroonDeep,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardOuter: {
    width: "100%",
  },
  card: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 16,
    direction: "rtl",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
    }),
  },
  cardIconBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardCourse: {
    fontSize: 12,
    fontWeight: "600",
    color: C.maroon,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    direction: "rtl",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.maroon,
    marginRight: 12,
  },
});
