import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
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
  surface: '#FFFFFF',
  danger: '#FF3B30',
};

type LectureItem = {
  id: string;
  title: string;
  subject: string;
  duration: string;
  progress: number;
  watched: boolean;
  createdAt: string;
  status?: string;
  playlistName?: string;
};

type LectureDoc = {
  title?: string;
  subject?: string;
  duration?: string;
  createdAt?: string;
  watched?: boolean;
  progress?: number;
  status?: string;
  playlistName?: string;
};

type PlaylistGroup = {
  name: string;
  lectures: LectureItem[];
  isExpanded: boolean;
};

// ─── Animated Lecture Card ───
function AnimatedVideoCard({
  item,
  index,
}: {
  item: LectureItem;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index * 60, 300) + 100,
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
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
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
        {/* Status strip */}
        <View style={[styles.cardStrip, { backgroundColor: isCompleted ? C.success : C.accent }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            {/* Play icon */}
            <View style={[styles.cardThumb, isCompleted && styles.cardThumbCompleted]}>
              <Ionicons
                name={isCompleted ? "checkmark-done" : "play"}
                size={isCompleted ? 20 : 22}
                color={C.white}
              />
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.cardMetaPill}>
                  <Ionicons name="book-outline" size={11} color={C.primary} />
                  <Text style={styles.cardMetaPillText}>{item.subject}</Text>
                </View>
                <View style={styles.cardMetaItem}>
                  <Ionicons name="time-outline" size={12} color={C.textSecondary} />
                  <Text style={styles.cardMetaText}>{item.duration}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.cardProgressRow}>
            <View style={styles.cardProgressTrack}>
              <View style={[
                styles.cardProgressFill,
                {
                  width: `${item.progress}%`,
                  backgroundColor: isCompleted ? C.success : C.accent,
                }
              ]} />
            </View>
            <Text style={[styles.cardProgressText, isCompleted && { color: C.success }]}>
              {item.progress}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Playlist Section ───
function PlaylistSection({
  playlist,
  onToggle,
  globalIndex,
}: {
  playlist: PlaylistGroup;
  onToggle: () => void;
  globalIndex: number;
}) {
  const completedCount = playlist.lectures.filter(l => l.watched || l.progress === 100).length;
  const totalCount = playlist.lectures.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.playlistContainer}>
      {/* Playlist header */}
      <TouchableOpacity style={styles.playlistHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.playlistHeaderLeft}>
          <Ionicons
            name={playlist.isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.textSecondary}
          />
        </View>

        <View style={styles.playlistHeaderContent}>
          <View style={styles.playlistTitleRow}>
            <View style={[styles.playlistIcon, allCompleted && { backgroundColor: C.successSoft }]}>
              <Ionicons
                name={allCompleted ? "checkmark-done-circle" : "list"}
                size={18}
                color={allCompleted ? C.success : C.accent}
              />
            </View>
            <View style={styles.playlistTitleWrap}>
              <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.name}</Text>
              <Text style={styles.playlistSubtitle}>
                {completedCount}/{totalCount} محاضرة مكتملة
              </Text>
            </View>
          </View>

          {/* Mini progress bar */}
          <View style={styles.playlistProgressRow}>
            <View style={styles.playlistProgressTrack}>
              <View style={[
                styles.playlistProgressFill,
                { width: `${progressPercent}%`, backgroundColor: allCompleted ? C.success : C.accent },
              ]} />
            </View>
            <Text style={[styles.playlistProgressText, allCompleted && { color: C.success }]}>
              {progressPercent}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded lectures */}
      {playlist.isExpanded && (
        <View style={styles.playlistLectures}>
          {playlist.lectures.map((item, idx) => (
            <AnimatedVideoCard key={item.id} item={item} index={globalIndex + idx} />
          ))}
        </View>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function LecturesScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [videos, setVideos] = useState<LectureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("الكل");
  const [viewMode, setViewMode] = useState<"playlists" | "all">("playlists");
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

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

        // Auto-expand first playlist
        const firstPlaylist = nextLectures.find(l => l.playlistName);
        if (firstPlaylist && firstPlaylist.playlistName) {
          setExpandedPlaylists(prev => {
            if (Object.keys(prev).length === 0) {
              return { [firstPlaylist.playlistName!]: true };
            }
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

    return () => {
      unsubscribe();
    };
  }, []);

  const subjects = [
    "الكل",
    ...Array.from(new Set(videos.map((video) => video.subject))).filter((subject) => subject && subject !== "الكل"),
  ];

  const filteredVideos = videos.filter(v => {
    if (subjectFilter !== "الكل" && v.subject !== subjectFilter) return false;
    return true;
  });

  // Group into playlists
  const playlists: PlaylistGroup[] = (() => {
    const groupMap: Record<string, LectureItem[]> = {};
    const ungrouped: LectureItem[] = [];

    filteredVideos.forEach(v => {
      if (v.playlistName && v.playlistName !== 'محاضرات أخرى') {
        if (!groupMap[v.playlistName]) groupMap[v.playlistName] = [];
        groupMap[v.playlistName].push(v);
      } else {
        ungrouped.push(v);
      }
    });

    const result: PlaylistGroup[] = Object.entries(groupMap).map(([name, lectures]) => ({
      name,
      lectures,
      isExpanded: !!expandedPlaylists[name],
    }));

    if (ungrouped.length > 0) {
      result.push({
        name: 'محاضرات أخرى',
        lectures: ungrouped,
        isExpanded: !!expandedPlaylists['محاضرات أخرى'],
      });
    }

    return result;
  })();

  const togglePlaylist = (name: string) => {
    setExpandedPlaylists(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const totalCount = videos.length;
  const completedCount = videos.filter(v => v.progress === 100).length;
  const inProgressCount = videos.filter(v => v.progress > 0 && v.progress < 100).length;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      {/* Background */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* ─── Header ─── */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }],
        }]}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>جميع الفيديوهات والتسجيلات</Text>
            <Text style={styles.headerTitle}>محاضراتي</Text>
          </View>
        </Animated.View>

        {/* ─── Stats Bar ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>مكتمل</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.accent }]}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>قيد المشاهدة</Text>
          </View>
        </View>

        {/* ─── Content ─── */}
        <View style={styles.content}>
          {/* Subject filter */}
          <View style={{ height: 60, marginBottom: 5 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={[styles.filterScrollOuter, { flex: 1 }]}
            >
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  activeOpacity={0.7}
                  style={[styles.filterPill, subjectFilter === sub && styles.filterPillActive]}
                  onPress={() => setSubjectFilter(sub)}
                >
                  <Text style={[styles.filterPillText, subjectFilter === sub && styles.filterPillTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* View mode toggle */}
          <View style={styles.viewModeRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name={viewMode === 'playlists' ? 'folder-open' : 'list'} size={16} color={C.textPrimary} />
              <Text style={styles.sectionTitle}>
                {viewMode === 'playlists' ? 'قوائم التشغيل' : 'كل المحاضرات'}
              </Text>
            </View>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'playlists' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('playlists')}
                activeOpacity={0.7}
              >
                <Ionicons name="folder" size={14} color={viewMode === 'playlists' ? C.white : C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'all' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('all')}
                activeOpacity={0.7}
              >
                <Ionicons name="list" size={14} color={viewMode === 'all' ? C.white : C.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Content Body ─── */}
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.emptyText}>جاري تحميل المحاضرات...</Text>
              </View>
            ) : loadError ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="alert-circle-outline" size={44} color={C.danger} />
                </View>
                <Text style={styles.emptyTitle}>حدث خطأ</Text>
                <Text style={styles.emptyText}>{loadError}</Text>
              </View>
            ) : filteredVideos.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="film-outline" size={44} color={C.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
                <Text style={styles.emptyText}>لا توجد محاضرات تطابق الفلاتر المحددة</Text>
              </View>
            ) : viewMode === 'playlists' ? (
              // Playlist view
              playlists.map((playlist, pIdx) => {
                const globalIdx = playlists.slice(0, pIdx).reduce((sum, p) => sum + p.lectures.length, 0);
                return (
                  <PlaylistSection
                    key={playlist.name}
                    playlist={playlist}
                    onToggle={() => togglePlaylist(playlist.name)}
                    globalIndex={globalIdx}
                  />
                );
              })
            ) : (
              // Flat list view
              filteredVideos.map((item, idx) => (
                <AnimatedVideoCard key={item.id} item={item} index={idx} />
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: 'absolute', top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft, opacity: 0.55,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleContainer: { alignItems: 'flex-end' },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: C.white },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },

  // ─── Content ───
  content: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },

  // ─── Filter ───
  filterScrollOuter: { marginTop: 18 },
  filterScroll: { paddingHorizontal: 20, gap: 8, flexDirection: 'row-reverse', alignItems: 'center' },
  filterPill: {
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderLight, height: 40, justifyContent: 'center'
  },
  filterPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterPillText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  filterPillTextActive: { color: C.white },

  // ─── View Mode Toggle ───
  viewModeRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 16, marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  viewToggle: {
    flexDirection: 'row-reverse',
    backgroundColor: C.softGreen,
    borderRadius: 10, padding: 3,
  },
  viewToggleBtn: {
    width: 32, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  viewToggleBtnActive: { backgroundColor: C.primary },

  // ─── Playlist Section ───
  playlistContainer: {
    marginBottom: 14,
  },
  playlistHeader: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 18,
    padding: 14,
    borderWidth: 1, borderColor: C.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  playlistHeaderLeft: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  playlistHeaderContent: { flex: 1 },
  playlistTitleRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  playlistIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: C.softGold,
    justifyContent: 'center', alignItems: 'center',
  },
  playlistTitleWrap: { flex: 1, alignItems: 'flex-end' },
  playlistTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  playlistSubtitle: { fontSize: 11, color: C.textSecondary, fontWeight: '600', marginTop: 2 },
  playlistProgressRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  playlistProgressTrack: { flex: 1, height: 4, backgroundColor: C.softGreen, borderRadius: 2, overflow: 'hidden' },
  playlistProgressFill: { height: 4, borderRadius: 2 },
  playlistProgressText: { fontSize: 11, fontWeight: '800', color: C.accent, width: 30 },
  playlistLectures: {
    marginTop: 8, marginRight: 12,
    borderRightWidth: 2, borderRightColor: C.borderLight,
    paddingRight: 12,
  },

  // ─── List ───
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },

  // ─── Cards ───
  cardOuter: { width: '100%', marginBottom: 10 },
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  cardThumb: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  cardThumbCompleted: { backgroundColor: C.success },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, lineHeight: 20, marginBottom: 4, textAlign: 'right' },
  cardMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardMetaPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGreen, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  cardMetaPillText: { fontSize: 10, fontWeight: '700', color: C.primary },
  cardMetaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  cardProgressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardProgressTrack: { flex: 1, height: 4, backgroundColor: C.softGreen, borderRadius: 2, overflow: 'hidden' },
  cardProgressFill: { height: 4, borderRadius: 2 },
  cardProgressText: { fontSize: 11, fontWeight: '900', color: C.textPrimary, width: 30 },

  // ─── Empty ───
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
});
