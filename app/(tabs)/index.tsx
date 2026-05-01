import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    I18nManager,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';
import { getVisibleTeacherIdSetForStudent } from '../../utils/chatAccess';
// Precise Colors extracted from the design
const C = {
  bgTop: '#0B2923',
  bgMain: '#F4F7F6',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
  stationDark: '#12453D',
  stationIconBg: '#2E5E55',
  stationWhite: '#FFFFFF',
  gold: '#E3A736',
  goldTrack: '#233935',
  textLight: '#FFFFFF',
  textGrayLight: '#9FB5AF',
  textDark: '#111A18',
  textGrayDark: '#8A9592',
  redBadge: '#FF3B30',
};

type StationItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  isDark: boolean;
  route: string;
  badge?: string;
  badgeCount?: number;
  lightColor?: string;
  lightBg?: string;
};

// Data Models — ordered RTL: rightmost first
const STATIONS: StationItem[] = [
  { id: 'lectures', title: 'محاضراتي', subtitle: 'الفيديوهات والتسجيلات', icon: 'videocam', isDark: true, route: '/(tabs)/lectures' },
  { id: 'subjects', title: 'مدرسين المادة', subtitle: 'المقررات الدراسية', icon: 'stats-chart', isDark: true, route: '/(tabs)/subjects' },
  { id: 'quizzes', title: 'كوزاتي', subtitle: 'الاختبارات القصيرة', icon: 'document-text', isDark: false, route: '/(tabs)/quizzes', badge: 'جديد', lightColor: '#174A42', lightBg: '#EEF3F2' },
  { id: 'notifications', title: 'إشعاراتي', subtitle: 'التنبيهات والرسائل', icon: 'notifications', isDark: false, route: '/(tabs)/notifications', lightColor: '#CD713C', lightBg: '#FDEDE2' },
];

// ─── Animated Decorative Circles ─────────────────────────────────
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

const HeroDecorations = () => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale1, { toValue: 1.08, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale1, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale2, { toValue: 1.06, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale2, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [scale1, scale2]);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 28 }]} pointerEvents="none">
      <Animated.View style={[styles.decorCircle, {
        width: 180, height: 180, borderRadius: 90, top: -40, left: -40,
        backgroundColor: C.heroDecor, opacity: 0.8,
        transform: [{ scale: scale1 }],
      }]} />
      <Animated.View style={[styles.decorCircle, {
        width: 240, height: 240, borderRadius: 120, bottom: -80, right: -60,
        backgroundColor: C.heroDecor, opacity: 0.6,
        transform: [{ scale: scale2 }],
      }]} />
    </View>
  );
};

// ─── Pulsing Badge Dot ───────────────────────────────────────────
const PulsingDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <View style={{ position: 'relative', width: 6, height: 6 }}>
      <Animated.View style={{
        position: 'absolute', width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#2FD67C', opacity: 0.35,
        transform: [{ scale: pulse }],
      }} />
      <View style={styles.heroBadgeDot} />
    </View>
  );
};

// ─── Animated Stat Card ──────────────────────────────────────────
const AnimatedStatCard = ({ stat, index }: { stat: { id: number; label: string; value: string; icon: any; color: string; bg: string }; index: number }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const delay = 400 + index * 120;
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [anim, index, scaleAnim]);

  return (
    <Animated.View style={[styles.statCard, {
      opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        { scale: scaleAnim },
      ],
    }]}>
      <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
        <Ionicons name={stat.icon} size={22} color={stat.color} />
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );
};

// ─── Animated Station Card ──────────────────────────────────────
const AnimatedStationCard = ({ station, index, onPress }: { station: StationItem; index: number; onPress: () => void }) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1, duration: 450, delay: 600 + index * 100,
      easing: Easing.out(Easing.back(1.1)), useNativeDriver: true,
    }).start();
  }, [enterAnim, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.94, friction: 8, tension: 150, useNativeDriver: true }).start();
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  }, [pressScale]);

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
        style={[styles.stationCard, station.isDark ? styles.stationCardDark : styles.stationCardWhite]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {station.badge && (
          <View style={styles.redBadge}>
            <Text style={styles.redBadgeText}>{station.badge}</Text>
          </View>
        )}
        {station.badgeCount && (
          <View style={styles.redCircleBadge}>
            <Text style={styles.redBadgeText}>{station.badgeCount}</Text>
          </View>
        )}

        <View style={[
          styles.stationIconCircle,
          station.isDark ? styles.stationIconCircleDark : { backgroundColor: station.lightBg }
        ]}>
          <Ionicons name={station.icon as any} size={28} color={station.isDark ? C.textLight : station.lightColor} />
        </View>
        <Text style={[styles.stationTitle, { color: station.isDark ? C.textLight : C.textDark }]}>
          {station.title}
        </Text>
        <Text style={[styles.stationSub, { color: station.isDark ? '#A1BCB7' : C.textGrayDark }]}>
          {station.subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Progress Bar With Animated Fill ─────────────────────────────
const AnimatedProgressBar = ({ progress }: { progress: number }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: 1, duration: 1200, delay: 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [fillAnim]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, {
        width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.min(progress, 100)}%`] }),
      }]} />
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // Staggered entrance anims
  const headerAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(0)).current;
  const [totalLectures, setTotalLectures] = useState(0);
  const [watchedLectures, setWatchedLectures] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [submittedQuizzes, setSubmittedQuizzes] = useState(0);

  // Compute overall progress
  const totalItems = totalLectures + totalQuizzes;
  const completedItems = watchedLectures + submittedQuizzes;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clear previous listeners if auth state changes
      unsubs.forEach(unsub => unsub());
      unsubs = [];



      // Always fetch total counts (filtered by status for accuracy)
      unsubs.push(onSnapshot(query(collection(db, 'lectures'), where('status', 'in', ['accepted', 'active'])), (snap) => {
        setTotalLectures(snap.size);
      }));

      unsubs.push(onSnapshot(collection(db, 'quizzes'), (snap) => {
        setTotalQuizzes(snap.size);
      }));

      if (user) {
        // Fetch user-specific stats
        let studentProfile: any = null;
        let allTeachers: any[] = [];
        let chatDocs: any[] = [];
        let studentLoaded = false;
        let teachersLoaded = false;

        const syncVisibleUnread = () => {
          if (!studentLoaded || !teachersLoaded) {
            setTotalUnread(0);
            return;
          }

          const visibleTeacherIds = studentProfile
            ? getVisibleTeacherIdSetForStudent(allTeachers, studentProfile)
            : new Set<string>();
          let count = 0;
          chatDocs.forEach((chatData) => {
            const participants = Array.isArray(chatData.participants)
              ? chatData.participants.filter((participant: unknown): participant is string => typeof participant === "string")
              : [];
            if (!participants.includes(user.uid) || participants.length !== 2) return;

            const otherParticipant = participants.find((p: string) => p !== user.uid);
            if (!otherParticipant || !visibleTeacherIds.has(otherParticipant)) return;
            count += chatData[`unreadCount_${user.uid}`] || 0;
          });
          setTotalUnread(count);
        };

        unsubs.push(onSnapshot(doc(db, 'students', user.uid), (snap) => {
          studentLoaded = true;
          studentProfile = snap.exists() ? { id: snap.id, uid: snap.id, ...snap.data() } : null;
          syncVisibleUnread();
        }));

        unsubs.push(onSnapshot(collection(db, 'teachers'), (snap) => {
          teachersLoaded = true;
          allTeachers = snap.docs.map(docSnap => ({ id: docSnap.id, uid: docSnap.id, ...docSnap.data() }));
          syncVisibleUnread();
        }));

        const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
        unsubs.push(onSnapshot(qChats, (snapshot) => {
          chatDocs = snapshot.docs.map(docSnap => docSnap.data());
          syncVisibleUnread();
        }));

        const qProgress = query(collection(db, 'lecture_progress'), where('studentId', '==', user.uid), where('watched', '==', true));
        unsubs.push(onSnapshot(qProgress, (snap) => {
          setWatchedLectures(snap.size);
        }));

        const qSubs = query(collection(db, 'quiz_submissions'), where('studentId', '==', user.uid));
        unsubs.push(onSnapshot(qSubs, (snap) => {
          const uniqueQuizIds = new Set<string>();
          snap.forEach(d => uniqueQuizIds.add(d.data().quizId));
          setSubmittedQuizzes(uniqueQuizIds.size);
        }));

        // Count recent unread notifications (lectures + quizzes + admin)
        let notifLectureCount = 0;
        let notifQuizCount = 0;
        let notifAdminCount = 0;
        const updateNotifCount = () => setUnreadNotifications(notifLectureCount + notifQuizCount + notifAdminCount);

        unsubs.push(onSnapshot(query(collection(db, 'lectures'), where('status', 'in', ['accepted', 'active']), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
          notifLectureCount = snap.size;
          updateNotifCount();
        }));

        unsubs.push(onSnapshot(query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
          notifQuizCount = snap.size;
          updateNotifCount();
        }));

        unsubs.push(onSnapshot(query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(20)), (snap) => {
          notifAdminCount = snap.docs.filter(d => { const t = d.data().target; return t === 'all' || t === 'students'; }).length;
          updateNotifCount();
        }));
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {

    Animated.stagger(150, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(heroAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(sectionAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [headerAnim, heroAnim, sectionAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgTop} />

      {/* Top Dark Background Layer */}
      <View style={styles.topBgLayer}>
        <HeaderDecorations />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E3A736" colors={["#E3A736"]} />}
        >

          {/* ─── Header Row ──────────────────────── */}
          <Animated.View style={[styles.headerRow, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
          }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity activeOpacity={0.8} style={styles.iconBtn} onPress={() => router.push('/(tabs)/notifications')}>
                <Ionicons name="notifications-outline" size={22} color={C.textLight} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8} style={styles.avatarBtn}>
                <Ionicons name="person" size={24} color={C.bgTop} />
              </TouchableOpacity>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => router.push('/chat_list')} activeOpacity={0.8} style={styles.iconBtn}>
                <Ionicons name="chatbubbles-outline" size={22} color={C.textLight} />
                {totalUnread > 0 && (
                  <View style={styles.topBadgeContainer}>
                    <Text style={styles.topBadgeText}>{totalUnread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ─── Hero Card ────────────────────────── */}
          <Animated.View style={{
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}>
            <TouchableOpacity activeOpacity={0.9} style={styles.heroCard}>
              <HeroDecorations />
              <View style={styles.heroContent}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>مُستمر</Text>
                    <PulsingDot />
                  </View>
                </View>
                <Text style={styles.heroTitle}>المعرفة اكاديمي</Text>
                <Text style={styles.heroSub}>أكمل من حيث توقفت في دروسك الأخيرة</Text>
                <View style={styles.progressSection}>
                  <AnimatedProgressBar progress={overallProgress} />
                  <Text style={styles.progressPercent}>%{overallProgress} مكتمل</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* ─── Quick Stats ──────────────────────── */}
          <View style={styles.statsContainer}>
            {[
              { id: 1, label: 'محاضرة', value: `${watchedLectures}/${totalLectures}`, icon: 'videocam-outline' as const, color: '#56756F', bg: '#F2F6F5' },
              { id: 2, label: 'اختبار مُسلّم', value: `${submittedQuizzes}/${totalQuizzes}`, icon: 'checkmark-done' as const, color: '#56756F', bg: '#F2F6F5' },
              { id: 3, label: 'إنجاز', value: `${overallProgress}%`, icon: 'trophy-outline' as const, color: '#56756F', bg: '#F2F6F5' },
            ].map((stat, i) => (
              <AnimatedStatCard key={stat.id} stat={stat} index={i} />
            ))}
          </View>

          {/* ─── Section Header ───────────────────── */}
          <Animated.View style={[styles.sectionHeader, {
            opacity: sectionAnim,
            transform: [{ translateY: sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }]}>
            <Text style={styles.sectionTitle}>محطات الطالب</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ─── Stations Grid ─────────────────────── */}
          <View style={styles.stationsGrid}>
            {STATIONS.map((station, i) => {
              const displayStation = { ...station };
              if (displayStation.id === 'chat' && totalUnread > 0) {
                displayStation.badgeCount = totalUnread;
              }
              if (displayStation.id === 'notifications' && unreadNotifications > 0) {
                displayStation.badgeCount = unreadNotifications;
              }
              return (
              <AnimatedStationCard
                key={displayStation.id}
                station={displayStation}
                index={i}
                onPress={() => router.push(displayStation.route as any)}
              />
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },

  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    backgroundColor: C.bgTop,
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  decorCircle: { position: 'absolute' },

  scrollContent: { paddingTop: 10, paddingHorizontal: 16 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, direction: 'ltr', paddingHorizontal: 4 },
  headerRight: { alignItems: 'flex-end', justifyContent: 'center' },
  greetingTitle: { fontSize: 34, fontWeight: '900', color: C.textLight, marginBottom: 2, letterSpacing: -0.5 },
  greetingSub: { fontSize: 13, color: '#97AEA9', fontWeight: '600' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.textLight, justifyContent: 'center', alignItems: 'center' },
  
  topBadgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: C.redBadge,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.bgTop,
  },
  topBadgeText: { color: C.textLight, fontSize: 10, fontWeight: 'bold' },

  // Hero Card
  heroCard: {
    backgroundColor: C.heroCard, borderRadius: 32, overflow: 'hidden', marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  heroContent: { padding: 26 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 20, direction: 'rtl' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A3F37', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2FD67C' },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: C.textLight },
  heroTitle: { fontSize: 30, fontWeight: '900', color: C.textLight, marginBottom: 6, textAlign: 'right' },
  heroSub: { fontSize: 13, color: C.textGrayLight, fontWeight: '600', marginBottom: 28, textAlign: 'right', lineHeight: 20 },

  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 12, direction: 'rtl' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: C.gold, width: 80 },
  progressTrack: { flex: 1, height: 10, backgroundColor: C.goldTrack, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: C.gold, borderRadius: 5 },

  // Quick Stats
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, direction: 'rtl', paddingHorizontal: 2 },
  statCard: {
    flex: 1, backgroundColor: C.textLight, borderRadius: 14, paddingVertical: 10, alignItems: 'center', marginHorizontal: 5,
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.04)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18 },
      android: { elevation: 3 },
    }),
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '900', color: C.textDark, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#9AA7A4' },

  // Section Header — on light bg below the green curve
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingHorizontal: 6, backgroundColor: C.bgMain, borderRadius: 12, paddingVertical: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: C.textDark },
  seeAllText: { fontSize: 13, fontWeight: '700', color: '#5A7A74' },

  // Stations Grid
  stationsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', direction: 'rtl', paddingHorizontal: 2 },
  stationCard: {
    width: '100%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 18,
    alignItems: 'center', position: 'relative',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 22 },
      android: { elevation: 4 },
    }),
  },
  stationCardDark: { backgroundColor: C.stationDark },
  stationCardWhite: { backgroundColor: C.stationWhite },

  stationIconCircle: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  stationIconCircleDark: { backgroundColor: C.stationIconBg },

  stationTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  stationSub: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  redBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: C.redBadge, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, zIndex: 10 },
  redCircleBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: C.redBadge, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  redBadgeText: { color: C.textLight, fontSize: 10, fontWeight: '800' },
});
