import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeacherHomeData();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    }
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
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={C.white} />
          </TouchableOpacity>
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

          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.teacherBadge}>
                <Ionicons name="school-outline" size={16} color={C.primary} />
                <Text style={styles.teacherBadgeText}>{teacherData?.subject || 'مادة عامة'}</Text>
              </View>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={26} color={C.white} />
              </View>
            </View>
            <Text style={styles.profileName}>{teacherData?.name || 'مرحباً أستاذ'}</Text>
            <Text style={styles.profileEmail}>{teacherData?.email || 'teacher@marpha.app'}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: C.softGreen }]}>
                <Ionicons name="videocam" size={20} color={C.primary} />
              </View>
              <Text style={styles.statValue}>{stats.lectures}</Text>
              <Text style={styles.statLabel}>إجمالي المحاضرات</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: C.softGold }]}>
                <Ionicons name="document-text" size={20} color={C.accent} />
              </View>
              <Text style={styles.statValue}>{stats.quizzes}</Text>
              <Text style={styles.statLabel}>إجمالي الاختبارات</Text>
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
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  profileCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  teacherBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: C.softGreen,
    borderRadius: 12,
  },
  teacherBadgeText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 3,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111A18',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9AA7A4',
    fontWeight: '600',
    textAlign: 'center',
  },
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
