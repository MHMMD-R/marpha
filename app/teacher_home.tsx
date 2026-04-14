import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getCountFromServer, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  white: '#FFFFFF',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  danger: '#D9534F',
  topOverlaySoft: '#123B34',
  softGreen: '#EEF5F3',
  softGold: '#FFF8E8',
  textPrimary: '#10241F',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
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

type TeacherData = {
  name?: string;
  subject?: string;
  email?: string;
};

type TeacherStats = {
  lectures: number;
  quizzes: number;
};

export default function TeacherHome() {
  const router = useRouter();
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [stats, setStats] = useState<TeacherStats>({ lectures: 0, quizzes: 0 });
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTeacherHomeData = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const teacherRef = doc(db, 'teachers', user.uid);
      const lecturesRef = query(collection(db, 'lectures'), where('teacherId', '==', user.uid));
      const quizzesRef = query(collection(db, 'quizzes'), where('teacherId', '==', user.uid));

      const [teacherSnap, lecturesCount, quizzesCount] = await Promise.all([
        getDoc(teacherRef),
        getCountFromServer(lecturesRef),
        getCountFromServer(quizzesRef),
      ]);

      if (teacherSnap.exists()) {
        setTeacherData(teacherSnap.data() as TeacherData);
      }

      setStats({
        lectures: lecturesCount.data().count,
        quizzes: quizzesCount.data().count,
      });
    } catch (error) {
      console.error('Error fetching teacher home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeacherHomeData();

    const user = auth.currentUser;
    if (user) {
      const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const unsubscribe = onSnapshot(qChats, (snapshot) => {
        let count = 0;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const unread = data[`unreadCount_${user.uid}`] || 0;
          count += unread;
        });
        setTotalUnread(count);
      }, (error) => {
        console.error("Error fetching chats:", error);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeacherHomeData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />
      
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerLeftIcons}>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.logoutBtn}>
              <Ionicons name="person-outline" size={24} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/chat_list')} style={[styles.logoutBtn, { marginLeft: 12 }]}>
              <Ionicons name="chatbubbles-outline" size={24} color={C.white} />
              {totalUnread > 0 && (
                <View style={styles.topBadgeContainer}>
                  <Text style={styles.topBadgeText}>{totalUnread}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push({ pathname: `/group/${auth.currentUser?.uid}`, params: { name: teacherData?.name || 'المعلم' }})} 
              style={[styles.logoutBtn, { marginLeft: 12 }]}
            >
              <Ionicons name="people-outline" size={24} color={C.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>بوابة المعلم</Text>
            <Text style={styles.headerTitle}>{teacherData?.name || 'مرحباً أستاذ'}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
        >

          <View style={styles.heroCard}>
            <HeroDecorations />
            <View style={styles.heroContent}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>ملخص النشاط</Text>
                  <Ionicons name="stats-chart" size={14} color="#2FD67C" style={{ marginLeft: 4 }} />
                </View>
              </View>
              <Text style={styles.heroTitle}>إحصائياتك العامة</Text>
              
              <View style={styles.heroStatsContainer}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{stats.lectures}</Text>
                  <Text style={styles.heroStatLabel}>إجمالي المحاضرات</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{stats.quizzes}</Text>
                  <Text style={styles.heroStatLabel}>إجمالي الاختبارات</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>إدارة المحتوى</Text>
            <Text style={styles.sectionHint}>اختر القسم الذي تريد تحديثه</Text>
          </View>

          <View style={styles.stationsGrid}>
            <View style={styles.stationWrap}>
              <TouchableOpacity
                style={[styles.stationCard, styles.stationCardDark]}
                activeOpacity={0.9}
                onPress={() => router.push('/teacher_lectures')}
              >
                <View style={styles.redCircleBadge}>
                  <Text style={styles.redBadgeText}>{stats.lectures}</Text>
                </View>
                <View style={[styles.stationIconCircle, styles.stationIconCircleDark]}>
                  <Ionicons name="videocam" size={28} color={C.white} />
                </View>
                <Text style={[styles.stationTitle, styles.stationTitleDark]}>محاضراتي</Text>
                <Text style={[styles.stationSub, styles.stationSubDark]}>الفيديوهات والتسجيلات</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stationWrap}>
              <TouchableOpacity
                style={[styles.stationCard, styles.stationCardWhite]}
                activeOpacity={0.9}
                onPress={() => router.push('/teacher_quizzes')}
              >
                <View style={styles.redCircleBadge}>
                  <Text style={styles.redBadgeText}>{stats.quizzes}</Text>
                </View>
                <View style={[styles.stationIconCircle, { backgroundColor: C.softGold }]}>
                  <Ionicons name="document-text" size={28} color={C.accent} />
                </View>
                <Text style={[styles.stationTitle, styles.stationTitleLight]}>اختباراتي</Text>
                <Text style={[styles.stationSub, styles.stationSubLight]}>إنشاء الاختبارات</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgMain,
  },
  topBgLayer: {
    position: 'absolute', 
    top: 0, left: 0, right: 0, 
    height: 300,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.topOverlaySoft,
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 22,
  },
  headerLeftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: C.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.topOverlay,
  },
  topBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'flex-end',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#97AEA9',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.white,
  },
  content: {
    padding: 24,
    paddingTop: 8,
  },
  decorCircle: { position: 'absolute' },
  heroCard: {
    backgroundColor: C.heroCard,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  heroContent: { padding: 26 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 20, direction: 'rtl' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A3F37', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: C.white },
  heroTitle: { fontSize: 26, fontWeight: '900', color: C.white, marginBottom: 20, textAlign: 'right' },
  heroStatsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    direction: 'rtl'
  },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 28, fontWeight: '900', color: C.accent, marginBottom: 4 },
  heroStatLabel: { fontSize: 12, color: '#9FB5AF', fontWeight: '600' },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.topOverlay,
    textAlign: 'right',
  },
  sectionHint: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'right',
    marginTop: 3,
  },
  stationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    direction: 'rtl',
    paddingHorizontal: 2,
  },
  stationWrap: {
    width: '48%',
    marginBottom: 16,
  },
  stationCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  stationCardDark: {
    backgroundColor: C.primary,
  },
  stationCardWhite: {
    backgroundColor: C.white,
  },
  stationIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stationIconCircleDark: {
    backgroundColor: C.primarySoft,
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  stationTitleDark: {
    color: C.white,
  },
  stationTitleLight: {
    color: '#111A18',
  },
  stationSub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stationSubDark: {
    color: '#A1BCB7',
  },
  stationSubLight: {
    color: '#8A9592',
  },
  redCircleBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  redBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 22,
  },
});
