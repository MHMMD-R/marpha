import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  I18nManager,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// Sync'd Premium Dark Emerald Palette from Home Page
const C = {
  bgDeep: '#061a15',
  bgMid: '#0a2e25',
  bgLight: '#0f4236',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  gold: '#D4A043',
  textGray: '#808A87',
  textBlack: '#1a1f1d',
  surface: '#FFFFFF',
  surfaceWarm: '#F5FAF8',
};

const INITIAL_VIDEOS = [
  { id: 1, title: "مقدمة في علم الميكانيكا - الجزء الأول", subject: "الفيزياء", chapter: "الفصل الأول", duration: "45 دقيقة", watched: true, progress: 100 },
  { id: 2, title: "المتجهات والكميات الفيزيائية الأساسية", subject: "الفيزياء", chapter: "الفصل الأول", duration: "50 دقيقة", watched: true, progress: 100 },
  { id: 3, title: "قوانين نيوتن وحركة الأجسام", subject: "الفيزياء", chapter: "الفصل الثاني", duration: "1 ساعة", watched: false, progress: 45 },
  { id: 4, title: "الروابط الكيميائية والتكافؤ", subject: "الكيمياء", chapter: "الفصل الأول", duration: "35 دقيقة", watched: false, progress: 0 },
  { id: 5, title: "أنواع التفاعلات والمعادلات الشاملة", subject: "الكيمياء", chapter: "الفصل الثاني", duration: "40 دقيقة", watched: false, progress: 0 },
  { id: 6, title: "المشتقات وقواعد السلسلة", subject: "الرياضيات", chapter: "الفصل الأول", duration: "55 دقيقة", watched: false, progress: 80 },
  { id: 7, title: "تطبيقات هندسية وفيزيائية على المشتقة", subject: "الرياضيات", chapter: "الفصل الأول", duration: "1 ساعة", watched: true, progress: 100 },
];

const SUBJECTS = ["الكل", "الفيزياء", "الكيمياء", "الرياضيات"];
const STATUSES = ["الكل", "مكتمل", "قيد المشاهدة", "لم يبدأ"];

function AnimatedVideoCard({ 
  item, 
  index, 
  onToggleWatched 
}: { 
  item: typeof INITIAL_VIDEOS[0]; 
  index: number;
  onToggleWatched: (id: number, currentStatus: boolean) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      delay: Math.min(index * 40, 300),
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [item.id, anim]);

  const router = useRouter();
  const isCompleted = item.watched || item.progress === 100;
  const isStarted = item.progress > 0 && !isCompleted;

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => router.push(`/video/${item.id}` as any)}>
        {/* Top Header of Card */}
        <View style={styles.cardHeaderRow}>
           <View style={styles.metaBadgeRow}>
             <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{item.subject}</Text>
             </View>
             <Text style={styles.chapterText}>{item.chapter}</Text>
           </View>
           <TouchableOpacity 
              activeOpacity={0.7} 
              style={[styles.toggleBtn, isCompleted && styles.toggleBtnActive]}
              onPress={() => onToggleWatched(item.id, isCompleted)}
            >
              <Ionicons name={isCompleted ? "checkmark-done" : "ellipse-outline"} size={16} color={isCompleted ? "#FFF" : C.textGray} />
              <Text style={[styles.toggleBtnText, isCompleted && { color: "#FFF" }]}>
                {isCompleted ? "مكتمل" : "تحديد"}
              </Text>
           </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {/* Content Row */}
        <View style={styles.contentRow}>
          <TouchableOpacity activeOpacity={0.8} style={styles.videoPlayThumb}>
            <Ionicons name="play" size={28} color={isCompleted ? C.white : C.textBlack} />
            {isCompleted && <View style={styles.completedOverlay}><Ionicons name="checkmark" size={40} color="rgba(255,255,255,0.4)" /></View>}
          </TouchableOpacity>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.durationRow}>
               <Ionicons name="time-outline" size={14} color={C.textGray} />
               <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </View>
        </View>

        {/* Footer Progress Strip */}
        <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{isCompleted ? "مكتمل تماماً" : isStarted ? "قيد المشاهدة" : "لم يبدأ بعد"}</Text>
              <Text style={[styles.progressPercent, isCompleted && { color: "#10B981" }]}>{item.progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: isCompleted ? "#10B981" : C.gold }]} />
            </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

// Elegant White Lines Decoration
const WhiteLinesDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.sweepCurve1} />
    <View style={styles.sweepCurve2} />
    <View style={styles.glowOrb1} />
    <View style={styles.glowOrb2} />
  </View>
);

export default function LecturesScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [videos, setVideos] = useState(INITIAL_VIDEOS);
  const [subjectFilter, setSubjectFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim]);

  const toggleWatched = (id: number, currentStatus: boolean) => {
    setVideos(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          watched: !currentStatus,
          progress: !currentStatus ? 100 : 0
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
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      
      {/* Background layer */}
      <View style={styles.bgGradientWrap}>
        <View style={styles.bgLayerMain} />
        <View style={styles.bgLayerTop} />
        <WhiteLinesDecor />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Fixed Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={26} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>محاضراتي</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Integrated Filter Panel (Clean, Horizontal Pills) */}
          <View style={styles.filterPanel}>
             <View style={styles.filterRow}>
                <View style={styles.filterLabelCol}>
                   <Ionicons name="filter" size={16} color={C.white} />
                   <Text style={styles.filterLabelText}>تصفية حسب</Text>
                </View>
             </View>

             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={{ marginTop: 10 }}>
                {SUBJECTS.map((sub) => (
                  <TouchableOpacity 
                    key={sub} 
                    activeOpacity={0.8} 
                    style={[styles.pillBtn, subjectFilter === sub && styles.pillBtnActive]}
                    onPress={() => setSubjectFilter(sub)}
                  >
                     <Text style={[styles.pillBtnText, subjectFilter === sub && styles.pillBtnTextActive]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>

             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={{ marginTop: 12 }}>
                {STATUSES.map((stat) => (
                  <TouchableOpacity 
                    key={stat} 
                    activeOpacity={0.8} 
                    style={[styles.pillBtn, statusFilter === stat && styles.pillBtnActive]}
                    onPress={() => setStatusFilter(stat)}
                  >
                     <Text style={[styles.pillBtnText, statusFilter === stat && styles.pillBtnTextActive]}>{stat}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>
          </View>

          {/* List Statistics */}
          <View style={styles.statsRow}>
             <Text style={styles.statsText}>النتائج التطابقية: {filteredVideos.length}</Text>
          </View>

          {/* List */}
          <View style={styles.listContainer}>
            {filteredVideos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="film-outline" size={48} color={C.textGray} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyText}>لا توجد محاضرات تطابق الفلاتر المحددة</Text>
              </View>
            ) : (
              filteredVideos.map((item, idx) => (
                <AnimatedVideoCard key={`${item.id}`} item={item} index={idx} onToggleWatched={toggleWatched} />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surfaceWarm },
  
  // Premium Unified Background Layer
  bgGradientWrap: { position: "absolute", top: 0, left: 0, right: 0, height: 340, overflow: 'hidden' },
  bgLayerMain: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bgMid, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  bgLayerTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: C.bgDeep },
  
  // Geometric White Lines Decor
  sweepCurve1: { position: 'absolute', width: SCREEN_W * 1.5, height: SCREEN_W * 1.5, borderRadius: SCREEN_W * 0.75, borderWidth: 1.5, borderColor: C.glassBorder, top: -SCREEN_W * 0.6, right: -SCREEN_W * 0.2 },
  sweepCurve2: { position: 'absolute', width: SCREEN_W * 1.2, height: SCREEN_W * 1.2, borderRadius: SCREEN_W * 0.6, borderWidth: 1, borderColor: C.glassBorder, top: -SCREEN_W * 0.4, right: SCREEN_W * 0.1, opacity: 0.6 },
  glowOrb1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: C.glassBorder, top: 40, left: -20, opacity: 0.5, transform: [{ scale: 2 }] },
  glowOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: C.bgLight, top: -50, right: -50, opacity: 0.4, transform: [{ scale: 1.5 }] },

  // Header Layout
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10, direction: "rtl", paddingTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.glass, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.glassBorder },
  headerTitle: { fontSize: 22, fontWeight: "900", color: C.white, letterSpacing: 0.5 },
  placeholder: { width: 44 },

  scrollContent: { paddingTop: 10, paddingBottom: 50 },

  // New Integrated Filter Panel
  filterPanel: { marginHorizontal: 16, backgroundColor: C.glass, borderRadius: 24, paddingVertical: 16, borderWidth: 1, borderColor: C.glassBorder, marginBottom: 16, direction: "rtl" },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  filterLabelCol: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterLabelText: { color: C.white, fontSize: 14, fontWeight: "700" },
  
  filterScroll: { paddingHorizontal: 16, gap: 10, direction: "rtl" },
  pillBtn: { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  pillBtnActive: { backgroundColor: C.gold, borderColor: C.gold },
  pillBtnText: { color: "#E0E0E0", fontSize: 13, fontWeight: "600" },
  pillBtnTextActive: { color: C.bgDeep, fontWeight: "800" },

  statsRow: { paddingHorizontal: 24, marginBottom: 12, direction: "rtl", alignItems: "flex-start" },
  statsText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.8)" },

  listContainer: { paddingHorizontal: 16, gap: 16, paddingBottom: 40 },
  
  // Redesigned Lecture Card
  cardOuter: { width: "100%" },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, direction: "rtl", ...Platform.select({ ios: { shadowColor: "rgba(12,59,53,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10 }, android: { elevation: 3 }, default: { shadowColor: "rgba(12,59,53,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10 }}) },
  
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  metaBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectPill: { backgroundColor: C.bgMid + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  subjectPillText: { fontSize: 12, fontWeight: "800", color: C.bgMid },
  chapterText: { fontSize: 13, fontWeight: "600", color: C.textGray },
  
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surfaceWarm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  toggleBtnActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  toggleBtnText: { fontSize: 12, fontWeight: "700", color: C.textGray },

  separator: { height: 1, backgroundColor: "rgba(0,0,0,0.04)", width: "100%", marginBottom: 14 },

  contentRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  videoPlayThumb: { width: 70, height: 70, borderRadius: 16, backgroundColor: C.surfaceWarm, justifyContent: "center", alignItems: "center", marginLeft: 14, overflow: "hidden" },
  completedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#10B981", justifyContent: "center", alignItems: "center" },
  cardContent: { flex: 1, justifyContent: "center", paddingTop: 4 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.textBlack, lineHeight: 22, marginBottom: 8 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 12, fontWeight: "600", color: C.textGray },

  // Progress Section matches the unified style
  progressSection: { backgroundColor: C.surfaceWarm, padding: 12, borderRadius: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: "700", color: C.textGray },
  progressPercent: { fontSize: 13, fontWeight: "900", color: C.textBlack },
  progressTrack: { height: 6, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.bgMid },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, opacity: 0.8 },
  emptyText: { marginTop: 16, fontSize: 15, color: C.textGray, fontWeight: "600" },
});
