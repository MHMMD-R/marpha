import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    I18nManager,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { collection, doc, onSnapshot } from "firebase/firestore";
import { BackButton } from "../../components/BackButton";
import { auth, db } from "../../firebase";

const { width: SCREEN_W } = Dimensions.get("window");

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
  }, []);

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

// ─── Overall Progress Hero Card ──────────────────────────────────
const OverallProgressCard = ({ subjects }: { subjects: any[] }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const totalLessons = subjects.reduce((sum, s) => sum + (s.lessonsCount || (s as any).lessons || 0), 0);
  const avgProgress = subjects.length ? Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length) : 0;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: 1, duration: 1200, delay: 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, []);

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
            <Text style={styles.heroStatValue}>{subjects.length}</Text>
            <Text style={styles.heroStatLabel}>مادة</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{totalLessons}</Text>
            <Text style={styles.heroStatLabel}>درس</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatValue, { color: C.gold }]}>{avgProgress}%</Text>
            <Text style={styles.heroStatLabel}>المعدل العام</Text>
          </View>
        </View>

        <View style={styles.heroProgressSection}>
          <View style={styles.progressTrackHero}>
            <Animated.View style={[styles.progressFillHero, {
              width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${avgProgress}%`] }),
            }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Animated Subject Card ──────────────────────────────────────
const AnimatedSubjectCard = ({ item, index }: { item: any; index: number }) => {
  const router = useRouter();
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1, duration: 450, delay: 400 + index * 80,
      easing: Easing.out(Easing.back(1.1)), useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.94, friction: 8, tension: 150, useNativeDriver: true }).start();
  }, []);
  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  }, []);

  const isHigh = item.progress >= 80;

  return (
    <Animated.View style={{
      width: '48%', marginBottom: 16,
      opacity: enterAnim,
      transform: [
        { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
        { scale: pressScale },
      ],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={() => router.push(`/subject/${item.id}` as any)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Icon / Thumbnail */}
        <View style={[styles.cardIconCircle, { backgroundColor: item.color + '15', overflow: 'hidden', borderWidth: 2, borderColor: item.color }]}>
          {item.teacherImage ? (
            <Image 
              source={{ uri: item.teacherImage }} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover"
            />
          ) : (
            <Ionicons name={item.icon} size={28} color={item.color} />
          )}
        </View>

        {/* Professor & Title */}
        <Text style={styles.cardTeacher} numberOfLines={1}>{item.professor || (item as any).teacherName}</Text>
        <Text style={styles.cardSubjectLine} numberOfLines={2}>{item.title}</Text>

        {/* Meta row */}
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaPill}>
            <Ionicons name="videocam" size={11} color={C.stationDark} />
            <Text style={styles.cardMetaPillText}>{item.lessonsCount || (item as any).lessons} درس</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.cardProgressSection}>
          <View style={styles.cardProgressTrack}>
            <View style={[styles.cardProgressFill, {
              width: `${item.progress}%`,
              backgroundColor: isHigh ? '#10B981' : C.gold,
            }]} />
          </View>
          <Text style={[styles.cardProgressText, isHigh && { color: '#10B981' }]}>
            {item.progress}%
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function SubjectsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [freeTrial, setFreeTrial] = useState<any>(null);
  const [hideSubscriptionUI, setHideSubscriptionUI] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const unsub = onSnapshot(doc(db, "students", user.uid), (docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubscription(data.subscription || { type: 'none', allowedTeachers: [], allowedSubjects: [] });
          setFreeTrial(data.freeTrial || null);
        }
      });
      const unsubConfig = onSnapshot(doc(db, "settings", "appConfig"), (snap) => {
        if (snap.exists()) {
          setHideSubscriptionUI(snap.data().hideSubscriptionUI);
        }
      });
      return () => { unsub(); unsubConfig(); };
    }
  }, []);

  useEffect(() => {
    try {
      const unsubscribeSubjects = onSnapshot(collection(db, "subjects"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedSubjects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any;
          setSubjects(fetchedSubjects);
        }
      });
      const unsubscribeTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedTeachers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTeachers(fetchedTeachers);
        }
      });
      return () => {
        unsubscribeSubjects();
        unsubscribeTeachers();
      };
    } catch (e) {
      console.warn("Firebase not configured properly:", e);
    }
  }, []);

  const mergedSubjects = [...subjects];

  teachers.forEach(t => {
    if (!t.subject) return;

    const professorName = t.name || 'معلم غير محدد';
    const teacherImg = t.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(professorName)}&background=12453D&color=fff`;

    const existingIndex = mergedSubjects.findIndex(s => s.title === t.subject);
    
    if (existingIndex >= 0) {
      mergedSubjects[existingIndex] = {
        ...mergedSubjects[existingIndex],
        professor: professorName,
        teacherImage: teacherImg
      };
    } else {
      mergedSubjects.push({
        id: t.uid || t.id || Math.random(),
        title: t.subject,
        professor: professorName,
        lessonsCount: 0,
        icon: "book-outline" as any,
        color: '#12453D',
        progress: 0,
        teacherImage: teacherImg
      } as any);
    }
  });

  let finalSubjects = mergedSubjects;
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
      
      const normalize = (str: string) => typeof str === 'string' ? str.trim().replace(/^ال/, '') : '';

      finalSubjects = mergedSubjects.filter(s => {
          const isAllowedSub = s.title && allowedSubs.some(sub => normalize(sub) === normalize(s.title));
          const isAllowedTeach = allowedTeach.includes(s.id);
          return isAllowedSub || isAllowedTeach;
      });
  }

  const headerAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(heroAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(sectionAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgTop} />

      {/* Top Dark Background — matches Home Page */}
      <View style={styles.topBgLayer}>
        <HeaderDecorations />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E3A736" colors={["#E3A736"]} />}
        >

          {/* ─── Header ──────────────────────── */}
          <Animated.View style={[styles.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
          }]}>
            <View style={styles.headerLeft}>
              <BackButton />
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>مدرسين المادة</Text>
              <Text style={styles.headerSub}>المقررات الدراسية</Text>
            </View>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* ─── Hero Card ──────────────────────── */}
          <Animated.View style={{
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}>
            <OverallProgressCard subjects={finalSubjects} />
          </Animated.View>

          {/* ─── Section Header ─────────────────── */}
          <Animated.View style={[styles.sectionHeader, {
            opacity: sectionAnim,
            transform: [{ translateY: sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }]}>
            <Text style={styles.sectionTitle}>المواد الدراسية</Text>
            <Text style={styles.sectionCount}>{finalSubjects.length} مادة</Text>     
          </Animated.View>

          {/* ─── Subjects Grid ──────────────────── */}
          <View style={styles.grid}>
            {finalSubjects.length > 0 ? (
              finalSubjects.map((item, i) => (
                <AnimatedSubjectCard key={item.id || i} item={item} index={i} />
              ))
            ) : (
              <View style={styles.noAccessContainer}>
                {hideSubscriptionUI ? (
                  <>
                    <View style={styles.lockCircle}>
                      <Ionicons name="book-outline" size={40} color={C.gold} />
                    </View>
                    <Text style={styles.noAccessTitle}>لا توجد مواد دراسية</Text>
                    <Text style={styles.noAccessSub}>لم يتم إضافة أي مواد دراسية حتى الآن.</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.lockCircle}>
                      <Ionicons name="lock-closed" size={40} color={C.gold} />
                    </View>
                    <Text style={styles.noAccessTitle}>المحتوى مغلق</Text>
                    <Text style={styles.noAccessSub}>يجب الاشتراك أو تفعيل الفترة التجريبية للوصول إلى المواد الدراسية</Text>
                    <TouchableOpacity 
                      style={styles.subscribeBtn}
                      onPress={() => router.push('/profile')}
                    >
                      <Text style={styles.subscribeBtnText}>عرض خطط الاشتراك</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES — Aligned with Home Page design system
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },

  // Same top background layer as Home Page
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    backgroundColor: C.bgTop,
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  decorCircle: { position: 'absolute' },

  scrollContent: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 50 },

  // Header — mirrors Home Page
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, direction: 'ltr', paddingHorizontal: 4 },
  headerLeft: { justifyContent: 'center' },
  headerCenter: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.textLight, marginBottom: 2 },
  headerSub: { fontSize: 12, color: '#97AEA9', fontWeight: '600' },
  placeholder: { width: 44 },

  // Hero Card — matches Home Page hero
  heroCard: {
    backgroundColor: C.heroCard, borderRadius: 28, overflow: 'hidden', marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  heroContent: { padding: 24 },
  heroStatsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20, direction: 'rtl' },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 28, fontWeight: '900', color: C.textLight, marginBottom: 2 },
  heroStatLabel: { fontSize: 12, fontWeight: '600', color: C.textGrayLight },
  heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroProgressSection: { flexDirection: 'row', alignItems: 'center', gap: 12, direction: 'rtl' },
  progressTrackHero: { flex: 1, height: 10, backgroundColor: C.goldTrack, borderRadius: 5, overflow: 'hidden' },
  progressFillHero: { height: 10, backgroundColor: C.gold, borderRadius: 5 },

  // Section Header — matches Home Page
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 18, paddingHorizontal: 6, direction: 'rtl',
    backgroundColor: C.bgMain, borderRadius: 12, paddingVertical: 4
  },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: C.textDark },
  sectionCount: { fontSize: 13, fontWeight: '700', color: '#5A7A74' },

  // Subjects Grid — 2-column like Home Page stations
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', direction: 'rtl', paddingHorizontal: 2 },

  // Subject Card — mirrors station card style
  card: {
    width: '100%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18,
    alignItems: 'center', backgroundColor: C.white,
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 22 },
      android: { elevation: 4 },
    }),
  },
  cardIconCircle: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTeacher: { fontSize: 15, fontWeight: '900', color: C.textDark, textAlign: 'center', marginBottom: 3, lineHeight: 22 },
  cardSubjectLine: { fontSize: 12, fontWeight: '600', color: C.textGrayDark, marginBottom: 8, textAlign: 'center' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardMetaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF3F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  cardMetaPillText: { fontSize: 10, fontWeight: '700', color: '#174A42' },

  // Card progress
  cardProgressSection: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  cardProgressTrack: { flex: 1, height: 5, backgroundColor: '#EAEFEE', borderRadius: 3, overflow: 'hidden' },
  cardProgressFill: { height: 5, borderRadius: 3 },
  cardProgressText: { fontSize: 12, fontWeight: '900', color: C.textDark, width: 32, textAlign: 'left' },

  // No Access State
  noAccessContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderRadius: 24,
    paddingHorizontal: 30,
    marginTop: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  noAccessSub: {
    fontSize: 14,
    color: C.textGrayDark,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  subscribeBtn: {
    backgroundColor: C.stationDark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  subscribeBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
