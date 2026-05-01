import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlaylistCard, PlaylistModal } from "../../components/PlaylistUI";
import { BackButton } from "../../components/BackButton";
import { auth, db } from "../../firebase";

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
  danger: '#FF3B30',
};

// ─── Card Themes ───
const CARD_THEMES = [
  { banner: '#12453D', bannerSoft: '#1A5C52' },
  { banner: '#1E3A5F', bannerSoft: '#274B77' },
  { banner: '#4A1942', bannerSoft: '#5E2256' },
  { banner: '#3D1A0A', bannerSoft: '#5C2E16' },
  { banner: '#0C2D48', bannerSoft: '#144163' },
];

type LectureItem = {
  id: string; title: string; subject: string; duration: string;
  progress: number; watched: boolean; createdAt: string;
  status?: string; playlistName?: string; playlistThumbnailUrl?: string;
  teacherId?: string; videoUrl?: string;
};

type PlaylistGroup = {
  name: string;
  lectures: LectureItem[];
  isExpanded: boolean;
};

type LectureDoc = {
  title?: string; subject?: string; duration?: string;
  createdAt?: string; watched?: boolean; progress?: number;
  status?: string; playlistName?: string; teacherId?: string;
};
// ─── Header Decorations ───
const HeaderDecorations = () => {
  const f1 = useRef(new Animated.Value(0)).current;
  const f2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(f1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(f1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(f2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(f2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [f1, f2]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -50, right: -90, backgroundColor: 'rgba(255,255,255,0.03)', transform: [{ translateY: f1.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }] }} />
      <Animated.View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, top: 80, left: -70, backgroundColor: 'rgba(255,255,255,0.04)', transform: [{ translateY: f2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }} />
    </View>
  );
};

// ─── Two-Tone Lecture Card ───
function AnimatedVideoCard({ item, index }: { item: LectureItem; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const isCompleted = item.watched || item.progress === 100;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1, duration: 500, delay: Math.min(index * 70, 350) + 100,
      easing: Easing.out(Easing.back(1.1)), useNativeDriver: true,
    }).start();
  }, [anim, item.id, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start();
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  }, [pressScale]);

  return (
    <Animated.View style={{
      marginBottom: 16, opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
        { scale: pressScale },
      ],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } } as any)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={s.lectureCard}
      >
        {/* Colored Banner */}
        <View style={[s.lecBanner, { backgroundColor: isCompleted ? '#0A3D2C' : theme.banner }]}>
          <View style={[s.lecBannerCircle1, { backgroundColor: isCompleted ? '#12543E' : theme.bannerSoft }]} />
          <View style={[s.lecBannerCircle2, { backgroundColor: isCompleted ? '#12543E' : theme.bannerSoft }]} />
          <View style={s.lecBannerContent}>
            <View style={s.lecTitleCol}>
              <Text style={s.lecTitle} numberOfLines={2}>{item.title}</Text>
              <View style={s.lecMetaRow}>
                <View style={s.lecMetaPill}>
                  <Text style={s.lecMetaPillText}>{item.subject}</Text>
                  <Ionicons name="book-outline" size={11} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={s.lecMetaPill}>
                  <Text style={s.lecMetaPillText}>{item.duration}</Text>
                  <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.6)" />
                </View>
              </View>
            </View>
            <View style={[s.lecIconCircle, isCompleted && { backgroundColor: 'rgba(16,185,129,0.25)' }]}>
              <Ionicons
                name={isCompleted ? "checkmark-done" : "play"}
                size={isCompleted ? 20 : 22}
                color={isCompleted ? '#2FD67C' : 'rgba(255,255,255,0.9)'}
              />
            </View>
          </View>
        </View>

        {/* White Footer */}
        <View style={s.lecFooter}>
          <View style={s.lecFooterRow}>
            {/* CTA / status */}
            {isCompleted ? (
              <View style={s.lecCompletedChip}>
                <Ionicons name="checkmark-circle" size={13} color={C.success} />
                <Text style={s.lecCompletedText}>مكتمل</Text>
              </View>
            ) : (
              <View style={s.lecWatchChip}>
                <Ionicons name="chevron-back" size={12} color={C.primary} />
                <Text style={s.lecWatchText}>مشاهدة</Text>
                <Ionicons name="play-circle-outline" size={14} color={C.primary} />
              </View>
            )}

            {/* Progress bar */}
            <View style={s.lecProgressWrap}>
              <Text style={[s.lecProgressText, isCompleted && { color: C.success }]}>
                {item.progress}%
              </Text>
              <View style={s.lecProgressTrack}>
                <View style={[s.lecProgressFill, {
                  width: `${item.progress}%`,
                  backgroundColor: isCompleted ? C.success : C.accent,
                }]} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}



// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function LecturesScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [videos, setVideos] = useState<LectureItem[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, { watched: boolean, progress: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("الكل");
  const [viewMode, setViewMode] = useState<"playlists" | "all">("playlists");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ name: string; lectures: any[]; themeIndex: number; overrideThumbnail?: string } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [freeTrial, setFreeTrial] = useState<any>(null);
  const [hideSubscriptionUI, setHideSubscriptionUI] = useState(false);
  const [playlistMeta, setPlaylistMeta] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "lecture_progress"), where("studentId", "==", user.uid));
    const unsubscribeSettings = onSnapshot(doc(db, "students", user.uid), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubscription(data.subscription || { type: 'none', allowedTeachers: [], allowedSubjects: [] });
        setFreeTrial(data.freeTrial || null);
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const progMapping: Record<string, { watched: boolean, progress: number }> = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.lectureId) {
           progMapping[d.lectureId] = { watched: !!d.watched, progress: d.progress || 0 };
        }
      });
      setUserProgress(progMapping);
    });

    const unsubscribeMeta = onSnapshot(collection(db, "playlist_metadata"), (snap) => {
      const meta: Record<string, any> = {};
      snap.forEach(doc => {
        const d = doc.data();
        meta[`${d.teacherId}|${d.name}`] = d;
      });
      setPlaylistMeta(meta);
    });

    const unsubscribeConfig = onSnapshot(doc(db, "settings", "appConfig"), (snap) => {
      if (snap.exists()) {
        setHideSubscriptionUI(snap.data().hideSubscriptionUI);
      }
    });

    return () => { unsubscribe(); unsubscribeSettings(); unsubscribeMeta(); unsubscribeConfig(); };
  }, []);

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
              playlistName: data.playlistName || "",
              playlistThumbnailUrl: (data as any).playlistThumbnailUrl || "",
              teacherId: data.teacherId || "",
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

        const firstPlaylist = nextLectures.find(l => l.playlistName);
        if (firstPlaylist && firstPlaylist.playlistName) {
          setExpandedPlaylists(prev => {
            if (Object.keys(prev).length === 0) return { [firstPlaylist.playlistName!]: true };
            return prev;
          });
        }
      },
      (error) => {
        console.error("Error loading lectures:", error);
        setLoadError("تعذر تحميل المحاضرات حالياً");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const computedVideos = React.useMemo(() => {
    return videos.map(v => {
      const p = userProgress[v.id];
      const watched = p !== undefined ? p.watched : v.watched;
      const progress = p !== undefined ? (p.watched ? 100 : p.progress) : v.progress;
      return { ...v, watched, progress: progress || (watched ? 100 : 0) };
    });
  }, [videos, userProgress]);

  const allowedVideos = computedVideos.filter(v => {
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
      return true;
    } else if (!isFull || !isSubActive) {
      let allowedSubs: string[] = isSubActive ? (subscription?.allowedSubjects || []) : [];
      let allowedTeach: string[] = isSubActive ? (subscription?.allowedTeachers || []) : [];

      if (freeTrial && freeTrial.isActive && new Date() < new Date(freeTrial.endDate)) {
          allowedSubs = [...allowedSubs, ...(freeTrial.access?.allowedSubjects || [])];
          allowedTeach = [...allowedTeach, ...(freeTrial.access?.allowedTeachers || [])];
      }

      const normalize = (str: string) => typeof str === 'string' ? str.trim().replace(/^ال/, '') : '';

      const isAllowedSub = v.subject && allowedSubs.some(sub => normalize(sub) === normalize(v.subject));
      const isAllowedTeach = (v as any).teacherId && allowedTeach.includes((v as any).teacherId);
      
      if (!isAllowedSub && !isAllowedTeach) return false;
    }

    return true;
  });

  const subjects = [
    "الكل",
    ...Array.from(new Set(allowedVideos.map(v => v.subject))).filter(sub => sub && sub !== "الكل"),
  ];

  const filteredVideos = allowedVideos.filter(v => {
    if (subjectFilter !== "الكل" && v.subject !== subjectFilter) return false;
    return true;
  });

  const playlists: PlaylistGroup[] = (() => {
    const groupMap: Record<string, LectureItem[]> = {};
    const ungrouped: LectureItem[] = [];
    filteredVideos.forEach(v => {
      if (v.playlistName && v.playlistName !== 'محاضرات أخرى') {
        const key = `${v.teacherId || 'unknown'}|${v.playlistName}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(v);
      } else {
        ungrouped.push(v);
      }
    });
    const result: PlaylistGroup[] = Object.entries(groupMap).map(([key, lectures]) => {
      const parts = key.split('|');
      const teacherId = parts[0];
      const name = parts.slice(1).join('|');
      
      const meta = playlistMeta[`${teacherId}|${name}`];
      
      let sortedLectures = [...lectures];
      if (meta && meta.lectureOrder && Array.isArray(meta.lectureOrder)) {
        sortedLectures.sort((a, b) => {
          const idxA = meta.lectureOrder.indexOf(a.id);
          const idxB = meta.lectureOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      }

      return {
        name, 
        lectures: sortedLectures, 
        isExpanded: !!expandedPlaylists[key],
        // Pass meta info if needed by PlaylistCard
        overrideThumbnail: meta?.thumbnailUrl || undefined
      };
    });

    // Sort playlists by the newest lecture in each
    result.sort((a, b) => {
      const newestA = Math.max(...a.lectures.map(l => l.createdAt ? new Date(l.createdAt).getTime() : 0));
      const newestB = Math.max(...b.lectures.map(l => l.createdAt ? new Date(l.createdAt).getTime() : 0));
      return newestB - newestA;
    });

    if (ungrouped.length > 0) {
      result.push({ name: 'محاضرات أخرى', lectures: ungrouped, isExpanded: !!expandedPlaylists['محاضرات أخرى'] });
    }
    return result;
  })();

  const togglePlaylist = (name: string) => {
    setExpandedPlaylists(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const totalCount = computedVideos.length;
  const completedCount = computedVideos.filter(v => v.progress === 100 || v.watched).length;
  const inProgressCount = computedVideos.filter(v => v.progress > 0 && v.progress < 100 && !v.watched).length;

  return (
    <View style={s.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />
      <View style={s.topBgLayer}><HeaderDecorations /></View>
      <View style={s.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <Animated.View style={[s.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }],
        }]}>
          <BackButton />
          <View style={s.headerTitleContainer}>
            <Text style={s.headerSubtitle}>جميع الفيديوهات والتسجيلات</Text>
            <Text style={s.headerTitle}>محاضراتي</Text>
          </View>
        </Animated.View>

        {/* Stats pills */}
        <View style={s.statsRow}>
          <View style={s.statPill}>
            <Ionicons name="videocam" size={14} color={C.accent} />
            <Text style={s.statPillText}>{totalCount} محاضرة</Text>
          </View>
          <View style={s.statPill}>
            <Ionicons name="checkmark-circle" size={14} color="#2FD67C" />
            <Text style={s.statPillText}>{completedCount} مكتمل</Text>
          </View>
          <View style={s.statPill}>
            <Ionicons name="play-circle" size={14} color={C.accent} />
            <Text style={s.statPillText}>{inProgressCount} قيد المشاهدة</Text>
          </View>
        </View>

        {/* Content */}
        <View style={s.content}>
          {/* Subject filter (compact inline) */}
          <View style={s.filterScrollOuter}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterScroll}
            >
              {subjects.map(sub => (
                <TouchableOpacity
                  key={sub}
                  activeOpacity={0.7}
                  style={[s.filterChip, subjectFilter === sub && s.filterChipActive]}
                  onPress={() => setSubjectFilter(sub)}
                >
                  <Text style={[s.filterChipText, subjectFilter === sub && s.filterChipTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* View mode + section title */}
          <View style={s.viewModeRow}>
            <View style={s.viewToggle}>
              <TouchableOpacity
                style={[s.viewToggleBtn, viewMode === 'playlists' && s.viewToggleBtnActive]}
                onPress={() => setViewMode('playlists')} activeOpacity={0.7}
              >
                <Ionicons name="folder" size={14} color={viewMode === 'playlists' ? C.white : C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.viewToggleBtn, viewMode === 'all' && s.viewToggleBtnActive]}
                onPress={() => setViewMode('all')} activeOpacity={0.7}
              >
                <Ionicons name="list" size={14} color={viewMode === 'all' ? C.white : C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitle}>
                {viewMode === 'playlists' ? 'قوائم التشغيل' : 'كل المحاضرات'}
              </Text>
              <Ionicons name={viewMode === 'playlists' ? 'folder-open' : 'list'} size={16} color={C.textPrimary} />
            </View>
          </View>

          {/* Content body */}
          <ScrollView
            contentContainerStyle={s.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E3A736" colors={["#E3A736"]} />}
          >
            {isLoading ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={s.emptyText}>جاري تحميل المحاضرات...</Text>
              </View>
            ) : loadError ? (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="alert-circle-outline" size={44} color={C.danger} />
                </View>
                <Text style={s.emptyTitle}>حدث خطأ</Text>
                <Text style={s.emptyText}>{loadError}</Text>
              </View>
            ) : filteredVideos.length === 0 ? (
              <View style={s.emptyState}>
                {hideSubscriptionUI ? (
                  <>
                    <View style={s.emptyIconWrap}>
                      <Ionicons name="videocam-outline" size={44} color={C.accent} />
                    </View>
                    <Text style={s.emptyTitle}>لا توجد محاضرات</Text>
                    <Text style={s.emptyText}>لم يتم إضافة أي محاضرات حتى الآن.</Text>
                  </>
                ) : (
                  <>
                    <View style={s.emptyIconWrap}>
                      <Ionicons name="lock-closed-outline" size={44} color={C.accent} />
                    </View>
                    <Text style={s.emptyTitle}>المحتوى مغلق</Text>
                    <Text style={s.emptyText}>يجب الاشتراك للوصول إلى المحاضرات</Text>
                    <TouchableOpacity 
                      style={s.subscribeBtn}
                      onPress={() => router.push('/profile')}
                    >
                      <Text style={s.subscribeBtnText}>عرض خطط الاشتراك</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : viewMode === 'playlists' ? (
              playlists.map((playlist, pIdx) => {
                const key = `${playlist.lectures[0]?.teacherId || 'unknown'}_${playlist.name}`;
                return (
                  <PlaylistCard
                    key={key}
                    name={playlist.name}
                    lectures={playlist.lectures}
                    index={pIdx}
                    teacherName={playlist.lectures[0]?.subject || 'مادة غير محددة'}
                    onPress={() => setSelectedPlaylist({ name: playlist.name, lectures: playlist.lectures, themeIndex: pIdx })}
                  />
                );
              })
            ) : (
              filteredVideos.map((item, idx) => <AnimatedVideoCard key={item.id} item={item} index={idx} />)
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Playlist Expanded Modal */}
      {selectedPlaylist && (
        <PlaylistModal
          visible={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          name={selectedPlaylist.name}
          lectures={selectedPlaylist.lectures}
          teacherName={selectedPlaylist.lectures[0]?.subject || 'مادة غير محددة'}
          themeIndex={selectedPlaylist.themeIndex}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES (split for TS)
// ═══════════════════════════════════════════════════════
const pageStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  topBgGlow: {
    position: 'absolute', top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft, opacity: 0.55,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  headerTitleContainer: { alignItems: 'flex-end' },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.white },
  statsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 24, gap: 8, marginBottom: 16, flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  content: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  filterScrollOuter: { marginTop: 10, height: 50, marginBottom: 10 },
  filterScroll: { 
    paddingHorizontal: 20, 
    gap: 10, 
    flexDirection: 'row-reverse', 
    alignItems: 'center',
    justifyContent: 'flex-start', // Ensures it stays anchored to the right in row-reverse
  },
  filterChip: {
    height: 38, // Fixed height prevents shifts
    paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
  filterChipTextActive: { color: C.white },
  viewModeRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 14, marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  viewToggle: {
    flexDirection: 'row-reverse', backgroundColor: C.softGreen,
    borderRadius: 10, padding: 3,
  },
  viewToggleBtn: { width: 32, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: C.primary },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.textPrimary },
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
  // ─── Lecture Card ───
  lectureCard: {
    backgroundColor: C.white, borderRadius: 24, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 22 },
      android: { elevation: 5 },
    }),
  },
  lecBanner: {
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    overflow: 'hidden', position: 'relative',
  },
  lecBannerCircle1: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    top: -25, left: -25, opacity: 0.6,
  },
  lecBannerCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    bottom: -20, right: -10, opacity: 0.5,
  },
  lecBannerContent: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14, zIndex: 2,
  },
  lecIconCircle: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  lecTitleCol: { flex: 1, alignItems: 'flex-end' },
  lecTitle: {
    fontSize: 15, fontWeight: '800', color: C.white,
    marginBottom: 8, textAlign: 'right', lineHeight: 21,
  },
  lecMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  lecMetaPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  lecMetaPillText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  // ─── Footer ───
  lecFooter: { paddingHorizontal: 16, paddingVertical: 12 },
  lecFooterRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  lecWatchChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.softGreen,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  lecWatchText: { fontSize: 12, fontWeight: '700', color: C.primary },
  lecCompletedChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.successSoft,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  lecCompletedText: { fontSize: 12, fontWeight: '700', color: C.success },
  lecProgressWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1, marginRight: 14 },
  lecProgressTrack: { flex: 1, height: 5, backgroundColor: C.softGreen, borderRadius: 3, overflow: 'hidden' },
  lecProgressFill: { height: 5, borderRadius: 3 },
  lecProgressText: { fontSize: 12, fontWeight: '900', color: C.textPrimary, width: 32 },


});

const s = { ...pageStyles, ...cardStyles };
