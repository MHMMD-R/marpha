import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  I18nManager,
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

// Exact color palette from the Home Page
const C = {
  bgTop: '#0B2923',
  bgMain: '#F4F7F6',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
  stationDark: '#12453D',
  stationIconBg: '#2E5E55',
  white: '#FFFFFF',
  gold: '#E3A736',
  goldTrack: '#233935',
  textLight: '#FFFFFF',
  textGrayLight: '#9FB5AF',
  textDark: '#111A18',
  textGrayDark: '#8A9592',
  redBadge: '#FF3B30',
};

const STATUSES = ["الكل", "مكتمل", "قيد المشاهدة", "لم يبدأ"];

type LectureItem = {
  id: string;
  title: string;
  subject: string;
  duration: string;
  progress: number;
  watched: boolean;
  createdAt: string;
  status?: string;
};

type LectureDoc = {
  title?: string;
  subject?: string;
  duration?: string;
  createdAt?: string;
  watched?: boolean;
  progress?: number;
  status?: string;
};

// ─── Animated Decorative Circles (from Home) ─────────────────────
const HeaderDecorations = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [float1, float2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.decorCircle, {
        width: 350, height: 350, borderRadius: 175, top: -50, right: -100,
        backgroundColor: 'rgba(255,255,255,0.03)',
        transform: [{ translateY: float1.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }],
      }]} />
      <Animated.View style={[styles.decorCircle, {
        width: 250, height: 250, borderRadius: 125, top: 150, left: -80,
        backgroundColor: 'rgba(255,255,255,0.03)',
        transform: [{ translateY: float2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
      }]} />
    </View>
  );
};

// ─── Dashboard Card ───────────────────────────────────────────
const DashboardCard = ({ videos }: { videos: LectureItem[] }) => {
  const total = videos.length;
  const completed = videos.filter(v => v.progress === 100).length;
  const inProgress = videos.filter(v => v.progress > 0 && v.progress < 100).length;

  return (
    <View style={styles.heroCard}>
      {/* Decorative circles inside hero */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 28 }]} pointerEvents="none">
        <View style={[styles.decorCircle, { width: 180, height: 180, borderRadius: 90, top: -40, left: -40, backgroundColor: C.heroDecor, opacity: 0.8 }]} />
        <View style={[styles.decorCircle, { width: 240, height: 240, borderRadius: 120, bottom: -80, right: -60, backgroundColor: C.heroDecor, opacity: 0.6 }]} />
      </View>

      <View style={styles.heroContent}>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{total}</Text>
            <Text style={styles.heroStatLabel}>محاضرة</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatValue, { color: '#10B981' }]}>{completed}</Text>
            <Text style={styles.heroStatLabel}>مكتمل</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatValue, { color: C.gold }]}>{inProgress}</Text>
            <Text style={styles.heroStatLabel}>قيد المشاهدة</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Animated Lecture Card ───────────────────────────────────────
function AnimatedVideoCard({
  item,
  index,
  onToggleWatched,
}: {
  item: LectureItem;
  index: number;
  onToggleWatched: (id: string, currentStatus: boolean) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      delay: Math.min(index * 80, 400) + 200,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [anim, item.id, index]);

  const router = useRouter();
  const isCompleted = item.watched || item.progress === 100;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.97, friction: 8, tension: 150, useNativeDriver: true }).start();
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  }, [pressScale]);

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: pressScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } } as any)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Left side: Play thumbnail */}
        <View style={styles.cardRow}>
          <View style={[styles.cardThumb, isCompleted && styles.cardThumbCompleted]}>
            <Ionicons
              name={isCompleted ? "checkmark-done" : "play"}
              size={isCompleted ? 24 : 26}
              color={isCompleted ? C.white : C.stationDark}
            />
          </View>

          {/* Right side: Info */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.cardMetaPill}>
                <Text style={styles.cardMetaPillText}>{item.subject}</Text>
              </View>
              <View style={styles.cardMetaItem}>
                <Ionicons name="time-outline" size={13} color={C.textGrayDark} />
                <Text style={styles.cardMetaText}>{item.duration}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.cardProgressRow}>
              <View style={styles.cardProgressTrack}>
                <View style={[
                  styles.cardProgressFill,
                  {
                    width: `${item.progress}%`,
                    backgroundColor: isCompleted ? '#10B981' : C.gold,
                  }
                ]} />
              </View>
              <Text style={[styles.cardProgressText, isCompleted && { color: '#10B981' }]}>
                {item.progress}%
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function LecturesScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  const [videos, setVideos] = useState<LectureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(filterAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(statsAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [filterAnim, headerAnim, statsAnim]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "lectures"),
      (snapshot) => {
        let nextLectures = snapshot.docs
          .map((lectureDoc) => {
            const data = lectureDoc.data() as LectureDoc;
            const progressValue = typeof data.progress === "number" ? data.progress : 0;
            const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressValue)));

            return {
              id: lectureDoc.id,
              title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "محاضرة بدون عنوان",
              subject: typeof data.subject === "string" && data.subject.trim() ? data.subject.trim() : "عام",
              duration: typeof data.duration === "string" && data.duration.trim() ? data.duration.trim() : "غير محدد",
              watched: typeof data.watched === "boolean" ? data.watched : normalizedProgress === 100,
              progress: normalizedProgress,
              createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
              status: data.status || "active",
            };
          })
          .filter(lec => lec.status === "accepted" || lec.status === "active")
          .sort((a, b) => {
            const firstDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const secondDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return secondDate - firstDate;
          });

        setVideos(nextLectures);
        setLoadError("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading lectures:", error);
        setLoadError("تعذر تحميل المحاضرات حالياً");
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const subjects = [
    "الكل",
    ...Array.from(new Set(videos.map((video) => video.subject))).filter((subject) => subject && subject !== "الكل"),
  ];

  const toggleWatched = (id: string, currentStatus: boolean) => {
    setVideos(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          watched: !currentStatus,
          progress: !currentStatus ? 100 : 0,
        };
      }
      return v;
    }));
  };

  const filteredVideos = videos.filter(v => {
    if (subjectFilter !== "الكل" && v.subject !== subjectFilter) return false;
    if (statusFilter === "مكتمل" && v.progress !== 100) return false;
    if (statusFilter === "قيد المشاهدة" && (v.progress === 0 || v.progress === 100)) return false;
    if (statusFilter === "لم يبدأ" && v.progress > 0) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgTop} />

      {/* Top Dark Background — matches Home Page exactly */}
      <View style={styles.topBgLayer}>
        <HeaderDecorations />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ─── Header ──────────────────────── */}
          <Animated.View style={[styles.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
          }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
                <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={C.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>محاضراتي</Text>
              <Text style={styles.headerSub}>جميع الفيديوهات والتسجيلات</Text>
            </View>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* ─── Dashboard Stats ─────────────────── */}
          <Animated.View style={{
            opacity: statsAnim,
            transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}>
            <DashboardCard videos={videos} />
          </Animated.View>

          {/* ─── Filters ──────────────────────── */}
          <Animated.View style={{
            opacity: filterAnim,
            transform: [{ translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}>
            {/* Subject filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  activeOpacity={0.8}
                  style={[styles.filterPill, subjectFilter === sub && styles.filterPillActive]}
                  onPress={() => setSubjectFilter(sub)}
                >
                  <Text style={[styles.filterPillText, subjectFilter === sub && styles.filterPillTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: 10 }]}>
              {STATUSES.map((stat) => (
                <TouchableOpacity
                  key={stat}
                  activeOpacity={0.8}
                  style={[styles.filterPillAlt, statusFilter === stat && styles.filterPillAltActive]}
                  onPress={() => setStatusFilter(stat)}
                >
                  <Text style={[styles.filterPillAltText, statusFilter === stat && styles.filterPillAltTextActive]}>{stat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* ─── Section Header ────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>النتائج</Text>
            <Text style={styles.sectionCount}>{filteredVideos.length} محاضرة</Text>
          </View>

          {/* ─── Lecture List ──────────────────── */}
          <View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={C.stationDark} />
                <Text style={styles.emptyText}>جاري تحميل المحاضرات...</Text>
              </View>
            ) : null}

            {!isLoading && loadError ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="alert-circle-outline" size={40} color={C.redBadge} />
                </View>
                <Text style={styles.emptyTitle}>حدث خطأ</Text>
                <Text style={styles.emptyText}>{loadError}</Text>
              </View>
            ) : null}

            {!isLoading && !loadError && filteredVideos.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="film-outline" size={40} color={C.textGrayDark} />
                </View>
                <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
                <Text style={styles.emptyText}>لا توجد محاضرات تطابق الفلاتر المحددة</Text>
              </View>
            ) : (
              !isLoading && !loadError && filteredVideos.map((item, idx) => (
                <AnimatedVideoCard key={`${item.id}`} item={item} index={idx} onToggleWatched={toggleWatched} />
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES — Directly aligned with Home Page design system
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },

  // Same top background layer as Home Page
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 280,
    backgroundColor: C.bgTop,
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  decorCircle: { position: 'absolute' },

  scrollContent: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 50 },

  // Header — mirrors Home Page header style
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, direction: 'ltr', paddingHorizontal: 4 },
  headerLeft: { justifyContent: 'center' },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.textLight, marginBottom: 2 },
  headerSub: { fontSize: 12, color: '#97AEA9', fontWeight: '600' },
  placeholder: { width: 44 },

  // Dashboard Card — matches Home Page hero
  heroCard: {
    backgroundColor: C.heroCard, borderRadius: 28, overflow: 'hidden', marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  heroContent: { padding: 24 },
  heroStatsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', direction: 'rtl' },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 26, fontWeight: '900', color: C.textLight, marginBottom: 2 },
  heroStatLabel: { fontSize: 12, fontWeight: '600', color: C.textGrayLight },
  heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },

  // Filter Pills — clean, on light background
  filterScroll: { paddingHorizontal: 4, gap: 8, direction: 'rtl', marginBottom: 6 },
  filterPill: {
    backgroundColor: C.white, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E8EDEC',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.03)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  filterPillActive: { backgroundColor: C.stationDark, borderColor: C.stationDark },
  filterPillText: { fontSize: 13, fontWeight: '700', color: C.textGrayDark },
  filterPillTextActive: { color: C.white, fontWeight: '800' },

  filterPillAlt: {
    backgroundColor: C.bgMain, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#D9E0DE',
  },
  filterPillAltActive: { backgroundColor: C.gold, borderColor: C.gold },
  filterPillAltText: { fontSize: 12, fontWeight: '600', color: C.textGrayDark },
  filterPillAltTextActive: { color: C.bgTop, fontWeight: '800' },

  // Section Header — matches Home Page
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, marginBottom: 16, paddingHorizontal: 6, direction: 'rtl',
    backgroundColor: C.bgMain, borderRadius: 12, paddingVertical: 4
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: C.textDark },
  sectionCount: { fontSize: 13, fontWeight: '700', color: '#5A7A74' },

  // Lecture Cards
  listContainer: { gap: 12 },
  cardOuter: { width: '100%' },
  card: {
    backgroundColor: C.white, borderRadius: 18, padding: 16, direction: 'rtl',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 22 },
      android: { elevation: 4 },
    }),
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardThumb: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#F2F6F5',
    justifyContent: 'center', alignItems: 'center', marginLeft: 14,
  },
  cardThumbCompleted: { backgroundColor: '#10B981' },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.textDark, lineHeight: 21, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardMetaPill: {
    backgroundColor: '#EEF3F2', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  cardMetaPillText: { fontSize: 11, fontWeight: '700', color: '#174A42' },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 11, fontWeight: '600', color: C.textGrayDark },

  // Card Progress — gold accent like Home Page
  cardProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardProgressTrack: { flex: 1, height: 5, backgroundColor: '#EAEFEE', borderRadius: 3, overflow: 'hidden' },
  cardProgressFill: { height: 5, borderRadius: 3 },
  cardProgressText: { fontSize: 12, fontWeight: '900', color: C.textDark, width: 35, textAlign: 'left' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#F2F6F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  emptyText: { fontSize: 13, color: C.textGrayDark, fontWeight: '600' },
});
