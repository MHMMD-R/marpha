import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { auth, db } from "../../firebase";

// ─── Design System ───
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
  heroCard: "#0A1C18",
  heroDecor: "#152C26",
  danger: "#FF3B30",
  dangerSoft: "#FFF0F0",
};

// ─── Card Theme Palette ───
const CARD_THEMES = [
  { banner: '#12453D', bannerSoft: '#1A5C52', badgeBg: C.accent },
  { banner: '#1E3A5F', bannerSoft: '#274B77', badgeBg: '#60A5FA' },
  { banner: '#4A1942', bannerSoft: '#5E2256', badgeBg: '#E84393' },
  { banner: '#3D1A0A', bannerSoft: '#5C2E16', badgeBg: '#F97316' },
  { banner: '#0C2D48', bannerSoft: '#144163', badgeBg: '#0EA5E9' },
];

// ─── Animated header circles ───
const HeaderDecorations = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(float1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [float1, float2]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -60, right: -100, backgroundColor: 'rgba(255,255,255,0.03)', transform: [{ translateY: float1.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }] }} />
      <Animated.View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, top: 80, left: -80, backgroundColor: 'rgba(255,255,255,0.04)', transform: [{ translateY: float2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }} />
    </View>
  );
};

// ─── Animated Quiz Card (Two-Tone) ───
function AnimatedQuizCard({ item, index, userScore }: { item: any; index: number; userScore: string | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 500, delay: 100 + index * 90,
      easing: Easing.out(Easing.back(1.1)), useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const questionCount = item.questions?.length || 0;
  const theme = CARD_THEMES[index % CARD_THEMES.length];

  const isGraded = userScore !== null && userScore !== 'بانتظار التصحيح' && userScore !== 'لم يتم الحل';
  const isPending = userScore === 'بانتظار التصحيح';
  const isUnattempted = userScore === null || userScore === 'لم يتم الحل';

  return (
    <Animated.View style={{
      marginBottom: 18, opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
        { scale: pressScale },
      ],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start()}
        onPress={() => router.push(`/quiz/${item.id}` as any)}
        style={s.quizCard}
      >
        {/* Colored Banner Top */}
        <View style={[s.cardBanner, { backgroundColor: theme.banner }]}>
          <View style={[s.bannerCircle1, { backgroundColor: theme.bannerSoft }]} />
          <View style={[s.bannerCircle2, { backgroundColor: theme.bannerSoft }]} />

          <View style={s.bannerContent}>
            {/* Question count badge */}
            <View style={[s.questionBadge, { backgroundColor: theme.badgeBg }]}>
              <Text style={s.questionBadgeNum}>{questionCount}</Text>
              <Text style={s.questionBadgeLabel}>أسئلة</Text>
            </View>

            {/* Title + status */}
            <View style={s.bannerTitleRow}>
              <View style={s.bannerTitleCol}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.course && <Text style={s.cardCourse}>{item.course}</Text>}
              </View>
              <View style={s.bannerIconCircle}>
                <Ionicons name="document-text" size={22} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        </View>

        {/* White footer */}
        <View style={s.cardBody}>
          <View style={s.cardBodyRow}>
            {/* Score / CTA */}
            {isGraded ? (
              <View style={s.scoreBadge}>
                <Ionicons name="ribbon" size={14} color={C.success} />
                <Text style={s.scoreText}>{userScore}</Text>
              </View>
            ) : isPending ? (
              <View style={s.pendingBadge}>
                <Ionicons name="hourglass-outline" size={14} color={C.accent} />
                <Text style={s.pendingText}>بانتظار التصحيح</Text>
              </View>
            ) : (
              <View style={s.ctaBadge}>
                <Ionicons name="chevron-back" size={12} color={C.primary} />
                <Text style={s.ctaText}>ابدأ الاختبار</Text>
                <Ionicons name="play-circle-outline" size={15} color={C.primary} />
              </View>
            )}

            {/* Date */}
            {item.createdAt?.toDate && (
              <View style={s.dateMeta}>
                <Text style={s.dateMetaText}>
                  {item.createdAt.toDate().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════
export default function QuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [freeTrial, setFreeTrial] = useState<any>(null);
  const [hideSubscriptionUI, setHideSubscriptionUI] = useState(false);
  const [filter, setFilter] = useState("all");

  // Fetch quizzes and subscription
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribeUser = onSnapshot(doc(db, "students", user.uid), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubscription(data.subscription || { type: 'none', allowedTeachers: [], allowedSubjects: [] });
        setFreeTrial(data.freeTrial || null);
      }
    });

    try {
      const unsubscribeQuizzes = onSnapshot(collection(db, "quizzes"), (snapshot) => {
        setQuizzes(snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const unsubConfig = onSnapshot(doc(db, "settings", "appConfig"), (snap) => {
        if (snap.exists()) {
          setHideSubscriptionUI(snap.data().hideSubscriptionUI);
        }
      });

      return () => { unsubscribeQuizzes(); unsubscribeUser(); unsubConfig(); };
    } catch (e) {
      console.warn("Firebase not configured:", e);
      return () => unsubscribeUser();
    }
  }, []);

  // Fetch student's quiz submissions
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const fetchScores = async () => {
      try {
        const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', user.uid)));
        const scoreMap: Record<string, string> = {};
        subSnap.docs.forEach(d => {
          const data = d.data();
          scoreMap[data.quizId] = data.graded ? String(data.score) : 'بانتظار التصحيح';
        });
        setScores(scoreMap);
      } catch {}
    };
    fetchScores();
  }, [quizzes]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      try {
        const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', user.uid)));
        const scoreMap: Record<string, string> = {};
        subSnap.docs.forEach(d => {
          const data = d.data();
          scoreMap[data.quizId] = data.graded ? String(data.score) : 'بانتظار التصحيح';
        });
        setScores(scoreMap);
      } catch {}
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim]);

  // Compute filter counts
  const completedCount = Object.keys(scores).length;
  const pendingCount = Object.values(scores).filter(v => v === 'بانتظار التصحيح').length;
  const activeCount = quizzes.length - completedCount;

  const filteredQuizzes = quizzes.filter((q) => {
    let isFull = subscription && subscription.type === 'full';
    let isSubActive = true;
    if (subscription && subscription.endDate) {
       isSubActive = new Date() < new Date(subscription.endDate);
    }
    
    if (subscription && subscription.type === 'none') {
       isFull = false;
       isSubActive = false;
    }

    if (hideSubscriptionUI) {
      // Review mode: open access to all, no filtering
    } else if (!isFull || !isSubActive) {
      let allowedSubs: string[] = isSubActive ? (subscription?.allowedSubjects || []) : [];
      let allowedTeach: string[] = isSubActive ? (subscription?.allowedTeachers || []) : [];

      if (freeTrial && freeTrial.isActive && new Date() < new Date(freeTrial.endDate)) {
          allowedSubs = [...allowedSubs, ...(freeTrial.access?.allowedSubjects || [])];
          allowedTeach = [...allowedTeach, ...(freeTrial.access?.allowedTeachers || [])];
      }

      const qSubject = q.course || q.subject || "";
      const normalize = (str: string) => typeof str === 'string' ? str.trim().replace(/^ال/, '') : '';
      const isAllowedSub = allowedSubs.some(sub => normalize(sub) === normalize(qSubject));
      const isAllowedTeach = q.teacherId && allowedTeach.includes(q.teacherId);
      
      if (!isAllowedSub && !isAllowedTeach) return false;
    }

    if (filter === "all") return true;
    // "completed" = student submitted (includes graded + pending grading)
    if (filter === "completed") return scores[q.id] && scores[q.id] !== 'لم يتم الحل';
    // "active" = student hasn't submitted yet
    if (filter === "active") return !scores[q.id] || scores[q.id] === 'لم يتم الحل';
    return true;
  });

  const filters = [
    { id: "all", label: "الكل", icon: "apps" as const, count: quizzes.length },
    { id: "active", label: "متاح", icon: "play-circle" as const, count: activeCount },
    { id: "completed", label: "مكتمل", icon: "checkmark-circle" as const, count: completedCount },
  ];

  return (
    <View style={s.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      {/* Background */}
      <View style={s.topBgLayer}>
        <HeaderDecorations />
      </View>
      <View style={s.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <Animated.View style={[s.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }],
        }]}>
          <BackButton />
          <View style={s.headerTitleContainer}>
            <Text style={s.headerSubtitle}>تقييم المعرفة</Text>
            <Text style={s.headerTitle}>الاختبارات</Text>
          </View>
        </Animated.View>

        {/* Stats pills */}
        <View style={s.statsRow}>
          <View style={s.statPill}>
            <Ionicons name="document-text" size={14} color={C.accent} />
            <Text style={s.statPillText}>{quizzes.length} اختبار</Text>
          </View>
          <View style={s.statPill}>
            <Ionicons name="checkmark-circle" size={14} color="#2FD67C" />
            <Text style={s.statPillText}>{completedCount} مكتمل</Text>
          </View>
          <View style={s.statPill}>
            <Ionicons name="play-circle" size={14} color={C.accent} />
            <Text style={s.statPillText}>{activeCount} متاح</Text>
          </View>
        </View>

        {/* Content */}
        <View style={s.content}>
          {/* Compact filter chips */}
          <View style={s.filterRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, filter === f.id && s.filterChipActive]}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.filterChipCount, filter === f.id && s.filterChipCountActive]}>
                  {f.count}
                </Text>
                <Text style={[s.filterChipText, filter === f.id && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quiz list */}
          <ScrollView
            contentContainerStyle={s.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E3A736" colors={["#E3A736"]} />}
          >
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((item, idx) => (
                <AnimatedQuizCard
                  key={item.id}
                  item={item}
                  index={idx}
                  userScore={scores[item.id] || 'لم يتم الحل'}
                />
              ))
            ) : (
              <View style={s.emptyContainer}>
                {hideSubscriptionUI ? (
                  <>
                    <View style={s.emptyIconCircle}>
                      <Ionicons name="document-text-outline" size={42} color={C.accent} />
                    </View>
                    <Text style={s.emptyTitle}>لا توجد اختبارات</Text>
                    <Text style={s.emptyText}>لم يتم إضافة أي اختبارات حتى الآن.</Text>
                  </>
                ) : (
                  <>
                    <View style={s.emptyIconCircle}>
                      <Ionicons name="lock-closed-outline" size={42} color={C.accent} />
                    </View>
                    <Text style={s.emptyTitle}>المحتوى مغلق</Text>
                    <Text style={s.emptyText}>يجب الاشتراك للوصول إلى الاختبارات</Text>
                    <TouchableOpacity 
                      style={s.subscribeBtn}
                      onPress={() => router.push('/profile')}
                    >
                      <Text style={s.subscribeBtnText}>عرض خطط الاشتراك</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES — split to avoid TS limit
// ═══════════════════════════════════════════════
const pageStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: "absolute", top: 0, left: 0, right: 0, height: 300,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  topBgGlow: {
    position: "absolute", top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft, opacity: 0.55,
  },

  // ─── Header ───
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  headerTitleContainer: { alignItems: "flex-end" },
  headerSubtitle: { fontSize: 12, color: "#97AEA9", marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: C.white },

  // ─── Stats pills ───
  statsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 24, gap: 8, marginBottom: 16, flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  // ─── Content ───
  content: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },

  // ─── Filter Chips (compact) ───
  filterRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.borderLight,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  filterChipTextActive: { color: C.white },
  filterChipCount: {
    fontSize: 12, fontWeight: '900', color: C.textSecondary,
    backgroundColor: C.softGreen,
    width: 24, height: 24, borderRadius: 8,
    textAlign: 'center', lineHeight: 24,
    overflow: 'hidden',
  },
  filterChipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: C.white,
  },

  // ─── List ───
  listContainer: { padding: 20, paddingBottom: 40 },

  // ─── Empty ───
  emptyContainer: { justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: C.softGreen,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginBottom: 12 },
  subscribeBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  subscribeBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

const cardStyles = StyleSheet.create({
  // ─── Quiz Card (Two-Tone) ───
  quizCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  cardBanner: {
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    overflow: 'hidden', position: 'relative',
  },
  bannerCircle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    top: -30, left: -30, opacity: 0.6,
  },
  bannerCircle2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    bottom: -25, right: -15, opacity: 0.5,
  },
  bannerContent: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', zIndex: 2,
  },
  bannerTitleRow: {
    flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 12,
  },
  bannerIconCircle: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitleCol: { flex: 1, alignItems: 'flex-end' },
  cardTitle: {
    fontSize: 16, fontWeight: '900', color: C.white,
    marginBottom: 4, textAlign: 'right', lineHeight: 22,
  },
  cardCourse: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
  },
  questionBadge: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginLeft: 14,
  },
  questionBadgeNum: { fontSize: 22, fontWeight: '900', color: C.white, lineHeight: 26 },
  questionBadgeLabel: { fontSize: 9, fontWeight: '700', color: C.white, opacity: 0.85, marginTop: -2 },

  // ─── Card Footer ───
  cardBody: { paddingHorizontal: 16, paddingVertical: 12 },
  cardBodyRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  scoreBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.successSoft,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  scoreText: { fontSize: 13, fontWeight: '800', color: C.success },
  pendingBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.softGold,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  pendingText: { fontSize: 12, fontWeight: '700', color: C.accent },
  ctaBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.softGreen,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: C.primary },
  dateMeta: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
  },
  dateMetaText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
});

const s = { ...pageStyles, ...cardStyles };
