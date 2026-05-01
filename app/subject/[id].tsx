import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, I18nManager, Image, ImageBackground, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DynamicThumbnail, PlaylistCard, PlaylistModal, plStyles } from '../../components/PlaylistUI';
import { BackButton } from '../../components/BackButton';
import { auth, db } from '../../firebase';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design System ───
const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  topOverlaySoft: '#123B34',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  softGold: '#FFF8E8',
  success: '#10B981',
  successSoft: '#ECFDF5',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
};

// ─── Animated header decorations ───
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

// ─── Fade-Slide entrance ───
const FadeSlideIn = ({ children, delay = 0, style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 550, delay, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
};

// ─── Lecture Card Themes ───
const LECTURE_THEMES = [
  { bg: C.primary, soft: C.primarySoft, iconBg: 'rgba(255,255,255,0.15)' },
  { bg: '#1E3A5F', soft: '#274B77', iconBg: 'rgba(255,255,255,0.15)' },
  { bg: '#3D1A0A', soft: '#5C2E16', iconBg: 'rgba(255,255,255,0.15)' },
  { bg: '#0C2D48', soft: '#144163', iconBg: 'rgba(255,255,255,0.15)' },
  { bg: '#4A1942', soft: '#5E2256', iconBg: 'rgba(255,255,255,0.15)' },
];

// ─── Animated Lecture Card ───
function AnimatedLectureCard({ item, index }: { item: any; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const theme = LECTURE_THEMES[index % LECTURE_THEMES.length];

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay: 150 + index * 90, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [index, anim]);

  return (
    <Animated.View style={{ marginBottom: 16, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start()}
        onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } } as any)}
        style={styles.lectureCard}
      >
        {/* Thumbnail banner */}
        <DynamicThumbnail 
          videoUrl={item.videoUrl} 
          source={item.thumbnailUrl || item.videoThumbnailUrl ? { uri: item.thumbnailUrl || item.videoThumbnailUrl } : undefined}
          fallbackBg={theme.bg} 
          style={[styles.lectureBanner]}
        >
          {/* We only show decorative circles if there runs a risk of having neither thumbnail nor generated thumb */}
          {(!item.videoUrl && !item.thumbnailUrl) && (
            <>
              <View style={[styles.lectureBannerCircle1, { backgroundColor: theme.soft }]} />
              <View style={[styles.lectureBannerCircle2, { backgroundColor: theme.soft }]} />
            </>
          )}
          
          <View style={styles.lectureBannerContent}>
            <View style={styles.lectureTitleCol}>
              <Text style={styles.lectureTitle} numberOfLines={2}>{item.title || 'محاضرة بدون عنوان'}</Text>
              <View style={styles.lectureDurationPill}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.lectureDurationText}>{item.duration || 'غير محدد'}</Text>
              </View>
            </View>
            <View style={[styles.lectureIconCircle, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="play" size={24} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </DynamicThumbnail>

        {/* White footer */}
        <View style={styles.lectureFooter}>
          <View style={styles.lectureFooterRow}>
            <View style={styles.lecturePlayChip}>
              <Ionicons name="chevron-back" size={12} color={C.primary} />
              <Text style={styles.lecturePlayText}>مشاهدة</Text>
              <Ionicons name="play-circle-outline" size={15} color={C.primary} />
            </View>

            {item.playlistName && item.playlistName !== 'محاضرات أخرى' && (
              <View style={styles.playlistBadge}>
                <Text style={styles.playlistBadgeText}>{item.playlistName}</Text>
                <Ionicons name="folder-outline" size={12} color={C.accent} />
              </View>
            )}

            {item.status === 'مكتمل' && (
              <View style={styles.completedChip}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={styles.completedText}>مكتمل</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Quiz Card Themes ───
const QUIZ_THEMES = [
  { bg: C.softGold, iconColor: C.accent, borderColor: '#F5E6C4' },
  { bg: '#EEF1FF', iconColor: '#6B8CFF', borderColor: '#D8DEFF' },
  { bg: '#FFF0F5', iconColor: '#E84393', borderColor: '#F5D0E0' },
  { bg: C.softGreen, iconColor: C.primary, borderColor: '#D0E8E0' },
  { bg: '#F0F9FF', iconColor: '#0EA5E9', borderColor: '#C8E8F8' },
];

// ─── Animated Quiz Card ───
function AnimatedQuizCard({ item, index }: { item: any; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const theme = QUIZ_THEMES[index % QUIZ_THEMES.length];

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay: 150 + index * 90, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [index, anim]);

  const scoreDisplay = item.score || 'لم يتم الحل';
  const isGraded = typeof item.score === 'number' || (typeof item.score === 'string' && !isNaN(Number(item.score)));
  const isPending = item.score === 'بانتظار التصحيح';

  return (
    <Animated.View style={{ marginBottom: 16, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }, { scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start()}
        onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: item.id } } as any)}
        style={[styles.quizCard, { borderColor: theme.borderColor }]}
      >
        <View style={styles.quizCardBody}>
          {/* Score badge */}
          <View style={[styles.scoreBadge, {
            backgroundColor: isGraded ? C.successSoft : isPending ? C.softGold : '#F3F4F6'
          }]}>
            <Text style={[styles.scoreBadgeText, {
              color: isGraded ? C.success : isPending ? C.accent : C.textSecondary
            }]}>
              {scoreDisplay}
            </Text>
          </View>

          {/* Title + meta */}
          <View style={styles.quizTitleCol}>
            <Text style={styles.quizTitle} numberOfLines={2}>{item.title || 'اختبار بدون عنوان'}</Text>
            <View style={styles.quizMetaRow}>
              <View style={styles.quizMetaItem}>
                <Text style={styles.quizMetaText}>{item.questions?.length || '?'} أسئلة</Text>
                <Ionicons name="help-circle-outline" size={13} color={C.textSecondary} />
              </View>
            </View>
          </View>

          {/* Icon */}
          <View style={[styles.quizIconBox, { backgroundColor: theme.bg }]}>
            <Ionicons name="document-text" size={24} color={theme.iconColor} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}



// ═══════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════
export default function TeacherProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'videos' | 'quizzes'>('videos');
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [playlistMetadataList, setPlaylistMetadataList] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ name: string; lectures: any[]; themeIndex: number; overrideThumbnail?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadTeacher = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', id as string));
        if (teacherDoc.exists()) {
          const data = teacherDoc.data();
          const teacherImg = data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'م')}&background=0f4236&color=fff`;
          setTeacherData({ name: data.name || 'معلم غير محدد', subject: data.subject || 'مادة', image: teacherImg });
        }

        const lecturesRef = collection(db, 'lectures');
        const qLectures = query(lecturesRef, where('teacherId', '==', id));
        const lecturesSnap = await getDocs(qLectures);
        const fetchedLectures = lecturesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((l: any) => l.status === 'accepted' || l.status === 'active');
        
        // Sort in memory by creation time (Oldest first, newest at the bottom)
        fetchedLectures.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeA - timeB;
        });
        
        const quizzesRef = collection(db, 'quizzes');
        const qQuizzes = query(quizzesRef, where('teacherId', '==', id));
        const quizzesSnap = await getDocs(qQuizzes);
        let fetchedQuizzes: any[] = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (auth.currentUser) {
          const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', auth.currentUser.uid)));
          const userSubs = subSnap.docs.map(d => d.data());
          
          fetchedQuizzes = fetchedQuizzes.map(q => {
            const sub = userSubs.find(s => s.quizId === q.id);
            if (sub) {
              q.score = sub.graded ? sub.score : 'بانتظار التصحيح';
            } else {
               q.score = 'لم يتم الحل';
            }
            return q;
          });
        }

        const metaRef = collection(db, 'playlist_metadata');
        const qMeta = query(metaRef, where('teacherId', '==', id));
        const metaSnap = await getDocs(qMeta);
        const fetchedMetas = metaSnap.docs.map(d => d.data());

        setLectures(fetchedLectures);
        setQuizzes(fetchedQuizzes);
        setPlaylistMetadataList(fetchedMetas);
      } catch (err) { } finally { setLoading(false); }
    };
    loadTeacher();
  }, [id]);

  // Group lectures into playlists
  const { playlistGroups, ungroupedLectures } = React.useMemo(() => {
    const groupMap: Record<string, any[]> = {};
    const ungrouped: any[] = [];
    lectures.forEach(l => {
      const plName = (l as any).playlistName;
      if (plName && plName !== 'محاضرات أخرى') {
        if (!groupMap[plName]) groupMap[plName] = [];
        groupMap[plName].push(l);
      } else {
        ungrouped.push(l);
      }
    });
    
    const groups = Object.entries(groupMap).map(([name, items]) => {
      const meta = playlistMetadataList.find(m => m.name === name);
      let sortedItems = items;
      let overrideThumbnail = undefined;
      
      if (meta) {
        if (meta.lectureOrder && Array.isArray(meta.lectureOrder)) {
          sortedItems = [...items].sort((a, b) => {
             const idxA = meta.lectureOrder.indexOf(a.id);
             const idxB = meta.lectureOrder.indexOf(b.id);
             if (idxA === -1 && idxB === -1) return 0;
             if (idxA === -1) return 1;
             if (idxB === -1) return -1;
             return idxA - idxB;
          });
        }
        if (meta.thumbnailUrl) {
          overrideThumbnail = meta.thumbnailUrl;
        }
      }
      return { name, lectures: sortedItems, overrideThumbnail };
    });
    return { playlistGroups: groups, ungroupedLectures: ungrouped };
  }, [lectures, playlistMetadataList]);

  if (loading) return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle='light-content' backgroundColor={C.topOverlay} />
      <ActivityIndicator size='large' color={C.accent} />
    </View>
  );

  if (!teacherData) return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle='light-content' backgroundColor={C.topOverlay} />
      <Text style={{ color: C.white, fontSize: 16 }}>لم يتم العثور على المعلم.</Text>
      <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
        <Text style={{ color: C.accent, fontWeight: '700' }}>عودة</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle='light-content' backgroundColor={C.topOverlay} />

        {/* Dark curved background */}
        <View style={styles.topBgLayer}>
          <HeaderDecorations />
        </View>
        <View style={styles.topBgGlow} />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ─── Header ─── */}
            <FadeSlideIn delay={50} style={styles.headerRow}>
              <BackButton />
              <Text style={styles.headerTitle}>ملف المعلم</Text>
              <View style={{ width: 44 }} />
            </FadeSlideIn>

            {/* ─── Profile Hero Card ─── */}
            <FadeSlideIn delay={150} style={styles.profileCardOuter}>
              <View style={styles.profileCard}>
                {/* Decorative background */}
                <View style={styles.profileCardDecor1} />
                <View style={styles.profileCardDecor2} />

                <View style={styles.profileContent}>
                  {/* Avatar + Name */}
                  <View style={styles.profileTopRow}>
                    <View style={styles.profileInfoCol}>
                      <Text style={styles.profileName}>{teacherData.name}</Text>
                      <View style={styles.subjectBadge}>
                        <Ionicons name="book" size={13} color={C.accent} />
                        <Text style={styles.subjectText}>{teacherData.subject}</Text>
                      </View>
                    </View>
                    <View style={styles.avatarRing}>
                      <Image source={{ uri: teacherData.image }} style={styles.avatarImg} />
                    </View>
                  </View>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{lectures.length}</Text>
                      <Text style={styles.statLabel}>محاضرة</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{quizzes.length}</Text>
                      <Text style={styles.statLabel}>اختبار</Text>
                    </View>
                  </View>
                </View>
              </View>
            </FadeSlideIn>

            {/* ─── Tab Switch ─── */}
            <FadeSlideIn delay={250} style={styles.tabsOuter}>
              <View style={styles.tabsWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.tabBtn, activeTab === 'videos' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('videos')}
                >
                  <Ionicons name='videocam' size={18} color={activeTab === 'videos' ? C.white : C.textSecondary} />
                  <Text 
                    style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    المحاضرات
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.tabBtn, activeTab === 'quizzes' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('quizzes')}
                >
                  <Ionicons name='document-text' size={18} color={activeTab === 'quizzes' ? C.white : C.textSecondary} />
                  <Text 
                    style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    الاختبارات
                  </Text>
                </TouchableOpacity>
              </View>
            </FadeSlideIn>

            {/* ─── Content ─── */}
            <View style={styles.listContainer}>
              {activeTab === 'videos' ? (
                lectures.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name='film-outline' size={42} color={C.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>لا توجد محاضرات حالياً</Text>
                    <Text style={styles.emptySubtitle}>سيتم عرض المحاضرات هنا عند إضافتها</Text>
                  </View>
                ) : (
                  <>
                    {/* Playlist Cards */}
                    {playlistGroups.map((group, gIdx) => (
                      <PlaylistCard
                        key={group.name}
                        name={group.name}
                        lectures={group.lectures}
                        index={gIdx}
                        teacherName={teacherData.name}
                        overrideThumbnail={group.overrideThumbnail}
                        onPress={() => setSelectedPlaylist({ name: group.name, lectures: group.lectures, themeIndex: gIdx, overrideThumbnail: group.overrideThumbnail })}
                      />
                    ))}
                    
                    {/* Ungrouped lectures as individual cards */}
                    {ungroupedLectures.length > 0 && playlistGroups.length > 0 && (
                      <View style={plStyles.ungroupedHeader}>
                        <View style={plStyles.ungroupedIcon}>
                          <Ionicons name="videocam-outline" size={16} color={C.accent} />
                        </View>
                        <Text style={plStyles.ungroupedTitle}>محاضرات أخرى</Text>
                      </View>
                    )}
                    {ungroupedLectures.map((item, index) => (
                      <AnimatedLectureCard key={item.id || index.toString()} item={item} index={playlistGroups.length + index} />
                    ))}
                  </>
                )
              ) : (
                quizzes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name='document-outline' size={42} color={C.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>لا توجد اختبارات حالياً</Text>
                    <Text style={styles.emptySubtitle}>سيتم عرض الاختبارات هنا عند إضافتها</Text>
                  </View>
                ) : quizzes.map((item, index) => (
                  <AnimatedQuizCard key={item.id || index.toString()} item={item} index={index} />
                ))
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>

        {/* Playlist Expanded Modal */}
        {selectedPlaylist && (
          <PlaylistModal
            visible={!!selectedPlaylist}
            onClose={() => setSelectedPlaylist(null)}
            name={selectedPlaylist.name}
            lectures={selectedPlaylist.lectures}
            teacherName={teacherData.name}
            themeIndex={selectedPlaylist.themeIndex}
            overrideThumbnail={selectedPlaylist.overrideThumbnail}
          />
        )}
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const pageStyles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: C.topOverlay, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: C.bgMain },

  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 380,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  topBgGlow: {
    position: 'absolute', top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft, opacity: 0.55,
  },

  scrollContent: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 60 },

  // ─── Header ───
  headerRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.white },

  // ─── Profile Hero Card ───
  profileCardOuter: { marginBottom: 24 },
  profileCard: {
    backgroundColor: C.heroCard,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 28 },
      android: { elevation: 10 },
    }),
  },
  profileCardDecor1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    top: -40, left: -40, backgroundColor: C.heroDecor, opacity: 0.7,
  },
  profileCardDecor2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    bottom: -30, right: -20, backgroundColor: C.heroDecor, opacity: 0.5,
  },
  profileContent: { padding: 24, zIndex: 2 },
  profileTopRow: {
    flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 22, gap: 16,
  },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarImg: { width: '100%', height: '100%' },
  profileInfoCol: { flex: 1, alignItems: 'flex-end' },
  profileName: {
    fontSize: 24, fontWeight: '900', color: C.white,
    marginBottom: 8, textAlign: 'right',
  },
  subjectBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
  },
  subjectText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, padding: 16, direction: 'rtl',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', color: C.accent, marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#9FB5AF' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },

  // ─── Tabs ───
  tabsOuter: { 
    marginBottom: 20, 
    paddingHorizontal: 2, // Gives space for shadows on the sides
    paddingBottom: 10,    // Gives space for shadow at the bottom
  },
  tabsWrap: {
    flexDirection: 'row-reverse',
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  tabBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
  },
  tabBtnActive: {
    backgroundColor: C.primary,
  },
  tabText: { fontSize: 15, fontWeight: '800', color: C.textSecondary },
  tabTextActive: { color: C.white },

  // ─── List ───
  listContainer: { paddingBottom: 20 },
  emptyState: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
});

const itemStyles = StyleSheet.create({
  // ─── Lecture Card ───
  lectureCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 22 },
      android: { elevation: 5 },
    }),
  },
  lectureBanner: {
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16,
    overflow: 'hidden', position: 'relative',
  },
  lectureBannerCircle1: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    top: -25, left: -25, opacity: 0.6,
  },
  lectureBannerCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    bottom: -20, right: -10, opacity: 0.5,
  },
  lectureBannerContent: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14, zIndex: 2,
  },
  lectureIconCircle: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  lectureTitleCol: { flex: 1, alignItems: 'flex-end' },
  lectureTitle: {
    fontSize: 16, fontWeight: '800', color: C.white,
    marginBottom: 8, textAlign: 'right', lineHeight: 22,
  },
  lectureDurationPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  lectureDurationText: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
  },
  lectureFooter: { paddingHorizontal: 16, paddingVertical: 12 },
  lectureFooterRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  lecturePlayChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.softGreen,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  lecturePlayText: { fontSize: 12, fontWeight: '700', color: C.primary },
  playlistBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  playlistBadgeText: { fontSize: 11, fontWeight: '700', color: C.accent },
  completedChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.successSoft,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  completedText: { fontSize: 11, fontWeight: '700', color: C.success },

  // ─── Quiz Card ───
  quizCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18, paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },
  quizCardBody: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14,
  },
  quizIconBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  quizTitleCol: { flex: 1, alignItems: 'flex-end' },
  quizTitle: {
    fontSize: 16, fontWeight: '800', color: C.textPrimary,
    marginBottom: 6, textAlign: 'right', lineHeight: 22,
  },
  quizMetaRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
  },
  quizMetaItem: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
  },
  quizMetaText: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  scoreBadge: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    minWidth: 60, alignItems: 'center',
  },
  scoreBadgeText: { fontWeight: '900', fontSize: 13 },
});

// Merge for single access
const styles = { ...pageStyles, ...itemStyles };
