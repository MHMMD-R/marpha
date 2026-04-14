import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebase";

const C = {
  bgMain: "#F4F7F6",
  topOverlay: "#0B2923",
  topOverlaySoft: "#123B34",
  primary: "#12453D",
  primarySoft: "#2E5E55",
  accent: "#E3A736",
  white: "#FFFFFF",
  textPrimary: "#10241F",
  textSecondary: "#8A9E99",
  borderLight: "#E8EDEC",
  softGreen: "#EEF5F3",
  softGold: "#FFF8E8",
  success: "#10B981",
  successSoft: "#ECFDF5",
};

function AnimatedQuizCard({
  item,
  index,
}: {
  item: any;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: 100 + index * 80,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const router = useRouter();
  const isCompleted = item.status === "مكتمل";
  const questionCount = item.questions?.length || 0;

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
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.card}
        onPress={() => router.push(`/quiz/${item.id}` as any)}
      >
        {/* Status indicator strip */}
        <View
          style={[
            styles.cardStrip,
            { backgroundColor: isCompleted ? C.success : C.accent },
          ]}
        />

        <View style={styles.cardBody}>
          {/* Top row: Icon + Title */}
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.cardIconBox,
                isCompleted
                  ? { backgroundColor: C.successSoft }
                  : { backgroundColor: C.softGold },
              ]}
            >
              <Ionicons
                name={isCompleted ? "checkmark-done-circle" : "document-text"}
                size={28}
                color={isCompleted ? C.success : C.accent}
              />
            </View>

            <View style={styles.cardTitleWrap}>
              {item.course && (
                <Text style={styles.cardCourse}>{item.course}</Text>
              )}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.cardMetaRow}>
            {item.duration && (
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={13} color={C.textSecondary} />
                <Text style={styles.metaPillText}>{item.duration}</Text>
              </View>
            )}
            {item.date && (
              <View style={styles.metaPill}>
                <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
                <Text style={styles.metaPillText}>{item.date}</Text>
              </View>
            )}
            {questionCount > 0 && (
              <View style={styles.metaPill}>
                <Ionicons name="help-circle-outline" size={13} color={C.textSecondary} />
                <Text style={styles.metaPillText}>{questionCount} سؤال</Text>
              </View>
            )}
          </View>

          {/* Bottom CTA */}
          <View style={styles.cardFooter}>
            {isCompleted ? (
              <View style={styles.scoreBadge}>
                <Ionicons name="ribbon" size={16} color={C.success} />
                <Text style={styles.scoreText}>الدرجة: {item.score}</Text>
              </View>
            ) : (
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaText}>ابدأ الاختبار</Text>
                <Ionicons name="arrow-back" size={14} color={C.accent} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "quizzes"), (snapshot) => {
        if (!snapshot.empty) {
          setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setQuizzes([]);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase not configured:", e);
    }
  }, []);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Subtle pulse on the stats count
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [headerAnim, pulseAnim]);

  const filteredQuizzes = quizzes.filter((q) => {
    if (filter === "all") return true;
    if (filter === "completed") return q.status === "مكتمل";
    if (filter === "active") return q.status !== "مكتمل";
    return true;
  });

  const filters = [
    { id: "all", label: "الكل", icon: "apps" as const },
    { id: "active", label: "متاح", icon: "play-circle" as const },
    { id: "completed", label: "مكتمل", icon: "checkmark-circle" as const },
  ];

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      {/* Background */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
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
                    outputRange: [-15, 0],
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
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>تقييم المعرفة</Text>
            <Text style={styles.headerTitle}>الاختبارات</Text>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Animated.View style={[styles.statCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.statValue}>{quizzes.length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </Animated.View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.success }]}>
              {quizzes.filter((q) => q.status === "مكتمل").length}
            </Text>
            <Text style={styles.statLabel}>مكتمل</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.accent }]}>
              {quizzes.filter((q) => q.status !== "مكتمل").length}
            </Text>
            <Text style={styles.statLabel}>متاح</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersScroll}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  filter === f.id && styles.filterPillActive,
                ]}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={f.icon}
                  size={15}
                  color={filter === f.id ? C.white : C.textSecondary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    filter === f.id && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quiz list */}
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((item, idx) => (
                <AnimatedQuizCard key={item.id} item={item} index={idx} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={C.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>لا توجد اختبارات</Text>
                <Text style={styles.emptyText}>
                  لا توجد اختبارات متاحة حالياً
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.topOverlaySoft,
    opacity: 0.55,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#97AEA9",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.white,
  },

  statsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.white,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },

  filtersScroll: { marginTop: 20 },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 10,
    flexDirection: "row-reverse",
  },
  filterPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  filterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
  },
  filterPillTextActive: {
    color: C.white,
  },

  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  cardOuter: {
    width: "100%",
    marginBottom: 14,
  },
  card: {
    flexDirection: "row-reverse",
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardStrip: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  cardCourse: {
    fontSize: 11,
    fontWeight: "800",
    color: C.accent,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: "right",
    lineHeight: 22,
  },
  cardMetaRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.softGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 10,
  },
  scoreBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.success,
  },
  ctaBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.softGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.accent,
  },

  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
  },
});
