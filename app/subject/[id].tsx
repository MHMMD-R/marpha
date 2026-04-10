import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, I18nManager, Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bgDeep: '#061a15', bgMid: '#0a2e25', bgLight: '#0f4236', bgMain: '#F4F7F6',
  white: '#FFFFFF', glass: 'rgba(255, 255, 255, 0.08)', glassBorder: 'rgba(255, 255, 255, 0.2)',
  gold: '#D4A043', textGray: '#808A87', textBlack: '#1a1f1d', surface: '#FFFFFF', surfaceWarm: '#F5FAF8',
};

function AnimatedVideoCard({ item, index, color }: { item: any; index: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: index * 80 + 200, friction: 8, tension: 40, useNativeDriver: true }).start();
  }, [index, anim]);

  return (
    <Animated.View style={[styles.videoCardOuter, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard} onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } } as any)}>
        <View style={[styles.videoThumb, { backgroundColor: color + '1A' }]}>
          <Ionicons name='play-circle' size={40} color={color} />
          {item.status === 'مكتمل' && (
            <View style={styles.completedBadge}><Ionicons name='checkmark' size={14} color='#FFF' /></View>
          )}
        </View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title || 'محاضرة بدون عنوان'}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name='time-outline' size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.duration || 'غير محدد'}</Text>
            </View>
            <View style={[styles.statusChip, item.status === 'مستمر' && styles.statusChipActive, item.status === 'مكتمل' && styles.statusChipCompleted]}>
              <Text style={[styles.statusChipText, item.status === 'مستمر' && styles.statusTextActive, item.status === 'مكتمل' && styles.statusTextCompleted]}>
                {item.status || 'نشط'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedQuizCard({ item, index, color }: { item: any; index: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(anim, { toValue: 1, delay: index * 80 + 200, friction: 8, tension: 40, useNativeDriver: true }).start(); }, [index, anim]);
  return (
    <Animated.View style={[styles.quizCardOuter, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard}>
        <View style={[styles.videoThumb, { backgroundColor: C.surfaceWarm }]}><Ionicons name='document-text' size={32} color={color} /></View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle}>{item.title || 'اختبار بدون عنوان'}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name='calendar-outline' size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.date || 'غير محدد'}</Text>
            </View>
            <View style={styles.scoreBadge}><Text style={styles.scoreText}>{item.score || '-'}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const WhiteLinesDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.sweepCurve1} />
    <View style={styles.sweepCurve2} />
    <View style={styles.glowOrb1} />
    <View style={styles.glowOrb2} />
  </View>
);

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'videos' | 'quizzes'>('videos');
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const loadTeacher = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', id as string));
        if (teacherDoc.exists()) {
          const data = teacherDoc.data();
          const teacherImg = data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'م')}&background=0f4236&color=fff`;
          setTeacherData({ name: data.name || 'معلم غير محدد', subject: data.subject || 'مادة', image: teacherImg, color: '#12453D' });
        }

        const lecturesRef = collection(db, 'lectures');
        const qLectures = query(lecturesRef, where('teacherId', '==', id));
        const lecturesSnap = await getDocs(qLectures);
        const fetchedLectures = lecturesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((l: any) => l.status === 'accepted' || l.status === 'active');
        
        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        const fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setLectures(fetchedLectures);
        setQuizzes(fetchedQuizzes);
      } catch (err) { } finally { setLoading(false); }
    };
    loadTeacher();
  }, [id]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    Animated.spring(profileAnim, { toValue: 1, delay: 100, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim, profileAnim]);

  if (loading) return <View style={styles.loadingContainer}><StatusBar barStyle='light-content' backgroundColor={C.bgDeep} /><ActivityIndicator size='large' color={C.gold} /></View>;
  if (!teacherData) return <View style={styles.loadingContainer}><StatusBar barStyle='light-content' backgroundColor={C.bgDeep} /><Text style={{ color: C.white }}>لم يتم العثور على المعلم.</Text><TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}><Text style={{ color: C.gold }}>عودة</Text></TouchableOpacity></View>;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle='light-content' backgroundColor={C.bgDeep} />
        <View style={styles.bgGradientWrap}><View style={styles.bgLayerMain} /><View style={styles.bgLayerTop} /><WhiteLinesDecor /></View>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
              <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
                <Ionicons name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={C.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ملف المعلم</Text>
              <View style={styles.placeholder} />
            </Animated.View>

            <Animated.View style={[styles.profileOuter, { opacity: profileAnim, transform: [{ translateY: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={styles.profileCard}>
                <View style={styles.profileRow}>
                  <View style={styles.avatarWrap}><Image source={{ uri: teacherData.image }} style={styles.avatarImg} /></View>
                  <View style={styles.profileRight}>
                    <Text style={styles.profileTitle}>{teacherData.name}</Text>
                    <View style={styles.infoRow}>
                      <Ionicons name='book-outline' size={16} color={C.textGray} />
                      <Text style={styles.infoText}>{teacherData.subject}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}><Text style={styles.statLabel}>المحاضرات</Text><Text style={[styles.statValue, { color: teacherData.color }]}>{lectures.length}</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}><Text style={styles.statLabel}>الاختبارات</Text><Text style={[styles.statValue, { color: teacherData.color }]}>{quizzes.length}</Text></View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.tabsContainer}>
              <View style={styles.tabsWrapper}>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]} onPress={() => setActiveTab('videos')}>
                  <Ionicons name='videocam' size={18} color={activeTab === 'videos' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>المحاضرات</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'quizzes' && styles.tabBtnActive]} onPress={() => setActiveTab('quizzes')}>
                  <Ionicons name='document-text' size={18} color={activeTab === 'quizzes' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>الاختبارات</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.listContainer}>
              {activeTab === 'videos' ? (
                lectures.length === 0 ? <View style={styles.emptyState}><Ionicons name='film-outline' size={48} color={C.glassBorder} /><Text style={styles.emptyText}>لا توجد محاضرات حالياً.</Text></View>
                : lectures.map((item, index) => <AnimatedVideoCard key={item.id || index.toString()} item={item} index={index} color={teacherData.color} />)
              ) : (
                quizzes.length === 0 ? <View style={styles.emptyState}><Ionicons name='document-outline' size={48} color={C.glassBorder} /><Text style={styles.emptyText}>لا توجد اختبارات حالياً.</Text></View>
                : quizzes.map((item, index) => <AnimatedQuizCard key={item.id || index.toString()} item={item} index={index} color={teacherData.color} />)
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: C.bgDeep, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: C.bgMain },
  bgGradientWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, borderBottomLeftRadius: 50, borderBottomRightRadius: 50, overflow: 'hidden' },
  bgLayerMain: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bgMid },
  bgLayerTop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bgDeep, opacity: 0.7 },
  sweepCurve1: { position: 'absolute', width: 600, height: 600, borderRadius: 300, borderWidth: 1, borderColor: C.glassBorder, top: -300, left: -100, transform: [{ scaleX: 1.5 }] },
  sweepCurve2: { position: 'absolute', width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: C.glassBorder, bottom: -100, right: -150, transform: [{ scaleX: 1.2 }] },
  glowOrb1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: C.bgLight, opacity: 0.4, top: 40, right: -80 },
  glowOrb2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: C.gold, opacity: 0.15, top: 120, left: 20 },
  scrollContent: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1 },
  placeholder: { width: 46 },
  profileOuter: { marginBottom: 20, direction: 'rtl', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 30 }, android: { elevation: 12 } }) },
  profileCard: { backgroundColor: C.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  profileRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginLeft: 16, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  profileRight: { flex: 1, justifyContent: 'center' },
  profileTitle: { fontSize: 22, fontWeight: '900', color: C.textBlack, marginBottom: 6, textAlign: 'right' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  statsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#eaefec' },
  statLabel: { fontSize: 13, fontWeight: '700', color: C.textGray, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '900' },
  tabsContainer: { marginBottom: 20, alignItems: 'center', direction: 'rtl' },
  tabsWrapper: { flexDirection: 'row-reverse', backgroundColor: C.glass, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: C.glassBorder },
  tabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 20 },
  tabBtnActive: { backgroundColor: C.surface, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }) },
  tabText: { fontSize: 14, fontWeight: '800', color: C.white },
  tabTextActive: { color: C.textBlack },
  listContainer: { paddingBottom: 40 },
  emptyState: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.textBlack, opacity: 0.6, fontSize: 16, marginTop: 12, fontWeight: '700' },
  videoCardOuter: { marginBottom: 16 },
  quizCardOuter: { marginBottom: 16 },
  videoCard: { backgroundColor: C.surface, borderRadius: 24, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', ...Platform.select({ ios: { shadowColor: 'rgba(0,0,0,0.04)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 16 }, android: { elevation: 3 } }) },
  videoThumb: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 16, position: 'relative' },
  completedBadge: { position: 'absolute', bottom: -6, right: -6, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.surface },
  videoContent: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  videoTitle: { fontSize: 16, fontWeight: '800', color: C.textBlack, marginBottom: 8, textAlign: 'right' },
  videoMeta: { flexDirection: 'row-reverse', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  videoMetaText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  statusChipActive: { backgroundColor: '#EEF2FF' },
  statusChipCompleted: { backgroundColor: '#ECFDF5' },
  statusChipText: { fontSize: 12, fontWeight: '900', color: '#6B7280' },
  statusTextActive: { color: '#6366F1' },
  statusTextCompleted: { color: '#10B981' },
  scoreBadge: { backgroundColor: '#Fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  scoreText: { color: '#D97706', fontWeight: '900', fontSize: 13 },
});import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, I18nManager, Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  bgDeep: '#061a15', bgMid: '#0a2e25', bgLight: '#0f4236', bgMain: '#F4F7F6',
  white: '#FFFFFF', glass: 'rgba(255, 255, 255, 0.08)', glassBorder: 'rgba(255, 255, 255, 0.2)',
  gold: '#D4A043', textGray: '#808A87', textBlack: '#1a1f1d', surface: '#FFFFFF', surfaceWarm: '#F5FAF8',
};

function AnimatedVideoCard({ item, index, color }: { item: any; index: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: index * 80 + 200, friction: 8, tension: 40, useNativeDriver: true }).start();
  }, [index, anim]);

  return (
    <Animated.View style={[styles.videoCardOuter, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard} onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } } as any)}>
        <View style={[styles.videoThumb, { backgroundColor: color + '1A' }]}>
          <Ionicons name='play-circle' size={40} color={color} />
          {item.status === 'مكتمل' && (
            <View style={styles.completedBadge}><Ionicons name='checkmark' size={14} color='#FFF' /></View>
          )}
        </View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title || 'محاضرة بدون عنوان'}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name='time-outline' size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.duration || 'غير محدد'}</Text>
            </View>
            <View style={[styles.statusChip, item.status === 'مستمر' && styles.statusChipActive, item.status === 'مكتمل' && styles.statusChipCompleted]}>
              <Text style={[styles.statusChipText, item.status === 'مستمر' && styles.statusTextActive, item.status === 'مكتمل' && styles.statusTextCompleted]}>
                {item.status || 'نشط'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedQuizCard({ item, index, color }: { item: any; index: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(anim, { toValue: 1, delay: index * 80 + 200, friction: 8, tension: 40, useNativeDriver: true }).start(); }, [index, anim]);
  return (
    <Animated.View style={[styles.quizCardOuter, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard}>
        <View style={[styles.videoThumb, { backgroundColor: C.surfaceWarm }]}><Ionicons name='document-text' size={32} color={color} /></View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle}>{item.title || 'اختبار بدون عنوان'}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name='calendar-outline' size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.date || 'غير محدد'}</Text>
            </View>
            <View style={styles.scoreBadge}><Text style={styles.scoreText}>{item.score || '-'}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const WhiteLinesDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.sweepCurve1} />
    <View style={styles.sweepCurve2} />
    <View style={styles.glowOrb1} />
    <View style={styles.glowOrb2} />
  </View>
);

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'videos' | 'quizzes'>('videos');
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', id as string));
        if (teacherDoc.exists()) {
          const data = teacherDoc.data();
          const teacherImg = data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'م')}&background=0f4236&color=fff`;
          setTeacherData({ name: data.name || 'معلم غير محدد', subject: data.subject || 'مادة', image: teacherImg, color: '#12453D' });
        }

        const lecturesRef = collection(db, 'lectures');
        const qLectures = query(lecturesRef, where('teacherId', '==', id));
        const lecturesSnap = await getDocs(qLectures);
        const fetchedLectures = lecturesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((l: any) => l.status === 'accepted' || l.status === 'active');
        
        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        const fetchedQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setLectures(fetchedLectures);
        setQuizzes(fetchedQuizzes);
      } catch (err) { } finally { setLoading(false); }
    };
    loadTeacher();
  }, [id]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    Animated.spring(profileAnim, { toValue: 1, delay: 100, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim, profileAnim]);

  if (loading) return <View style={styles.loadingContainer}><StatusBar barStyle='light-content' backgroundColor={C.bgDeep} /><ActivityIndicator size='large' color={C.gold} /></View>;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle='light-content' backgroundColor={C.bgDeep} />
        <View style={styles.bgGradientWrap}><View style={styles.bgLayerMain} /><View style={styles.bgLayerTop} /><WhiteLinesDecor /></View>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
              <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
                <Ionicons name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={C.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ملف المعلم</Text>
              <View style={styles.placeholder} />
            </Animated.View>

            <Animated.View style={[styles.profileOuter, { opacity: profileAnim, transform: [{ translateY: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={styles.profileCard}>
                <View style={styles.profileRow}>
                  <View style={styles.avatarWrap}><Image source={{ uri: teacherData.image }} style={styles.avatarImg} /></View>
                  <View style={styles.profileRight}>
                    <Text style={styles.profileTitle}>{teacherData.name}</Text>
                    <View style={styles.infoRow}>
                      <Ionicons name='book-outline' size={16} color={C.textGray} />
                      <Text style={styles.infoText}>{teacherData.subject}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}><Text style={styles.statLabel}>المحاضرات</Text><Text style={[styles.statValue, { color: teacherData.color }]}>{lectures.length}</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}><Text style={styles.statLabel}>الاختبارات</Text><Text style={[styles.statValue, { color: teacherData.color }]}>{quizzes.length}</Text></View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.tabsContainer}>
              <View style={styles.tabsWrapper}>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]} onPress={() => setActiveTab('videos')}>
                  <Ionicons name='videocam' size={18} color={activeTab === 'videos' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>المحاضرات</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={[styles.tabBtn, activeTab === 'quizzes' && styles.tabBtnActive]} onPress={() => setActiveTab('quizzes')}>
                  <Ionicons name='document-text' size={18} color={activeTab === 'quizzes' ? C.textBlack : C.white} />
                  <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>الاختبارات</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.listContainer}>
              {activeTab === 'videos' ? (
                lectures.length === 0 ? <View style={styles.emptyState}><Ionicons name='film-outline' size={48} color={C.glassBorder} /><Text style={styles.emptyText}>لا توجد محاضرات حالياً.</Text></View>
                : lectures.map((item, index) => <AnimatedVideoCard key={item.id || index.toString()} item={item} index={index} color={teacherData.color} />)
              ) : (
                quizzes.length === 0 ? <View style={styles.emptyState}><Ionicons name='document-outline' size={48} color={C.glassBorder} /><Text style={styles.emptyText}>لا توجد اختبارات حالياً.</Text></View>
                : quizzes.map((item, index) => <AnimatedQuizCard key={item.id || index.toString()} item={item} index={index} color={teacherData.color} />)
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: C.bgDeep, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: C.bgMain },
  bgGradientWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, borderBottomLeftRadius: 50, borderBottomRightRadius: 50, overflow: 'hidden' },
  bgLayerMain: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bgMid },
  bgLayerTop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bgDeep, opacity: 0.7 },
  sweepCurve1: { position: 'absolute', width: 600, height: 600, borderRadius: 300, borderWidth: 1, borderColor: C.glassBorder, top: -300, left: -100, transform: [{ scaleX: 1.5 }] },
  sweepCurve2: { position: 'absolute', width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: C.glassBorder, bottom: -100, right: -150, transform: [{ scaleX: 1.2 }] },
  glowOrb1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: C.bgLight, opacity: 0.4, top: 40, right: -80 },
  glowOrb2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: C.gold, opacity: 0.15, top: 120, left: 20 },
  scrollContent: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1 },
  placeholder: { width: 46 },
  profileOuter: { marginBottom: 20, direction: 'rtl', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 30 }, android: { elevation: 12 } }) },
  profileCard: { backgroundColor: C.surface, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  profileRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginLeft: 16, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  profileRight: { flex: 1, justifyContent: 'center' },
  profileTitle: { fontSize: 22, fontWeight: '900', color: C.textBlack, marginBottom: 6, textAlign: 'right' },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  statsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#eaefec' },
  statLabel: { fontSize: 13, fontWeight: '700', color: C.textGray, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '900' },
  tabsContainer: { marginBottom: 20, alignItems: 'center', direction: 'rtl' },
  tabsWrapper: { flexDirection: 'row-reverse', backgroundColor: C.glass, borderRadius: 24, padding: 6, borderWidth: 1, borderColor: C.glassBorder },
  tabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 20 },
  tabBtnActive: { backgroundColor: C.surface, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 } }) },
  tabText: { fontSize: 14, fontWeight: '800', color: C.white },
  tabTextActive: { color: C.textBlack },
  listContainer: { paddingBottom: 40 },
  emptyState: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.textBlack, opacity: 0.6, fontSize: 16, marginTop: 12, fontWeight: '700' },
  videoCardOuter: { marginBottom: 16 },
  quizCardOuter: { marginBottom: 16 },
  videoCard: { backgroundColor: C.surface, borderRadius: 24, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', ...Platform.select({ ios: { shadowColor: 'rgba(0,0,0,0.04)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 16 }, android: { elevation: 3 } }) },
  videoThumb: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 16, position: 'relative' },
  completedBadge: { position: 'absolute', bottom: -6, right: -6, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.surface },
  videoContent: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  videoTitle: { fontSize: 16, fontWeight: '800', color: C.textBlack, marginBottom: 8, textAlign: 'right' },
  videoMeta: { flexDirection: 'row-reverse', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  videoMetaText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  statusChipActive: { backgroundColor: '#EEF2FF' },
  statusChipCompleted: { backgroundColor: '#ECFDF5' },
  statusChipText: { fontSize: 12, fontWeight: '900', color: '#6B7280' },
  statusTextActive: { color: '#6366F1' },
  statusTextCompleted: { color: '#10B981' },
  scoreBadge: { backgroundColor: '#Fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  scoreText: { color: '#D97706', fontWeight: '900', fontSize: 13 },
});