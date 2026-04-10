import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
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

// Mock data acting as the database record for whatever ID was passed
const SUBJECT_MOCK_DATA = {
  title: "الفيزياء المتقدمة",
  professor: "أ. عبدالكريم",
  lessonsCount: "18 درس",
  grade: "92 / 100",
  progress: "60%",
  icon: "flash",
  color: '#8B5CF6', // Purple matching the theme style
  videos: [
    { id: 101, title: "الفصل الأول: المتسعات (الجزء الأول)", duration: "45 دقيقة", status: "مكتمل", type: "video" },
    { id: 102, title: "الفصل الأول: المتسعات (الجزء الثاني)", duration: "50 دقيقة", status: "مكتمل", type: "video" },
    { id: 103, title: "الفصل الثاني: الحث الكهرومغناطيسي", duration: "1 ساعة و 10 دقائق", status: "مستمر", type: "video" },
    { id: 104, title: "قانون لنز والتطبيقات", duration: "35 دقيقة", status: "قادم", type: "video" },
    { id: 105, title: "التيار المتناوب والمقاومة", duration: "48 دقيقة", status: "قادم", type: "video" },
  ],
  quizzes: [
    { id: 1, title: "اختبار المتسعات الشامل", score: "9/10", date: "12 مايو" },
    { id: 2, title: "كويز سريع: الحث السلكي", score: "8.5/10", date: "5 مايو" },
    { id: 3, title: "امتحان نصف الفصل الأول", score: "95/100", date: "28 أبريل" },
  ],
};

function AnimatedVideoCard({ item, index }: { item: any; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 80 + 200,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [index, anim]);

  return (
    <Animated.View
      style={[
        styles.videoCardOuter,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard}>
        {/* Thumbnail Placeholder */}
        <View style={[styles.videoThumb, { backgroundColor: SUBJECT_MOCK_DATA.color + "1A" }]}>
          <Ionicons name="play-circle" size={40} color={SUBJECT_MOCK_DATA.color} />
          {item.status === "مكتمل" && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={14} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.videoContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.duration}</Text>
            </View>
            <View style={[
              styles.statusChip, 
              item.status === "مستمر" && styles.statusChipActive,
              item.status === "مكتمل" && styles.statusChipCompleted
            ]}>
              <Text style={[
                styles.statusChipText,
                item.status === "مستمر" && styles.statusTextActive,
                item.status === "مكتمل" && styles.statusTextCompleted
              ]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedQuizCard({ item, index }: { item: any; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 80 + 200,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [index, anim]);

  return (
    <Animated.View
      style={[
        styles.quizCardOuter,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} style={styles.videoCard}>
        <View style={[styles.videoThumb, { backgroundColor: C.surfaceWarm }]}>
          <Ionicons name="document-text" size={32} color={SUBJECT_MOCK_DATA.color} />
        </View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle}>{item.title}</Text>
          <View style={styles.videoMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={C.textGray} />
              <Text style={styles.videoMetaText}>{item.date}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Elegant White Lines Decoration using geometric shapes and borders (from Home)
const WhiteLinesDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.sweepCurve1} />
    <View style={styles.sweepCurve2} />
    <View style={styles.glowOrb1} />
    <View style={styles.glowOrb2} />
  </View>
);

export default function SubjectProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"videos" | "quizzes">("videos");
  
  const headerAnim = useRef(new Animated.Value(0)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    Animated.spring(profileAnim, { toValue: 1, delay: 100, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim, profileAnim]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
        
        {/* Sync'd Background with Home Page */}
        <View style={styles.bgGradientWrap}>
          <View style={styles.bgLayerMain} />
          <View style={styles.bgLayerTop} />
          <WhiteLinesDecor />
        </View>

        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
              <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
                <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={26} color={C.white} />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>تفاصيل المادة</Text>
              <View style={styles.placeholder} />
            </Animated.View>

            {/* Solid White Premium Profile Card */}
            <Animated.View style={[styles.profileOuter, { opacity: profileAnim, transform: [{ translateY: profileAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={styles.profileCard}>
                <View style={styles.profileRow}>
                  <View style={[styles.profileIconBox, { backgroundColor: SUBJECT_MOCK_DATA.color + "1A" }]}>
                    <Ionicons name={SUBJECT_MOCK_DATA.icon as any} size={40} color={SUBJECT_MOCK_DATA.color} />
                  </View>
                  <View style={styles.profileRight}>
                    <Text style={styles.profileTitle}>{SUBJECT_MOCK_DATA.title}</Text>
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={16} color={C.textGray} />
                      <Text style={styles.infoText}>{SUBJECT_MOCK_DATA.professor}</Text>
                    </View>
                  </View>
                </View>

                {/* Progress Summary */}
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>المعدل</Text>
                    <Text style={[styles.statValue, { color: SUBJECT_MOCK_DATA.color }]}>{SUBJECT_MOCK_DATA.grade}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>عدد الدروس</Text>
                    <Text style={[styles.statValue, { color: SUBJECT_MOCK_DATA.color }]}>{SUBJECT_MOCK_DATA.lessonsCount}</Text>
                  </View>
                </View>

                <View style={styles.progressWrap}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressText}>إنجاز المادة</Text>
                    <Text style={[styles.progressLabel, { color: SUBJECT_MOCK_DATA.color }]}>{SUBJECT_MOCK_DATA.progress}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: SUBJECT_MOCK_DATA.progress as any, backgroundColor: SUBJECT_MOCK_DATA.color }]} />
                  </View>
                </View>

              </View>
            </Animated.View>

            {/* Glassmorphic Segmented Control for Tabs over Dark Green Bg */}
            <View style={styles.tabsContainer}>
              <View style={styles.tabsWrapper}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={[styles.tabBtn, activeTab === "videos" && styles.tabBtnActive]} 
                  onPress={() => setActiveTab("videos")}
                >
                  <Ionicons name="play-circle-outline" size={20} color={activeTab === "videos" ? C.textBlack : C.textGray} />
                  <Text style={[styles.tabText, activeTab === "videos" && styles.tabTextActive]}>المحاضرات</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={[styles.tabBtn, activeTab === "quizzes" && styles.tabBtnActive]} 
                  onPress={() => setActiveTab("quizzes")}
                >
                  <Ionicons name="document-text-outline" size={20} color={activeTab === "quizzes" ? C.textBlack : C.textGray} />
                  <Text style={[styles.tabText, activeTab === "quizzes" && styles.tabTextActive]}>الاختبارات</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Area - White Cards */}
            <View style={styles.listContainer}>
              {activeTab === "videos" ? (
                <View style={{ width: '100%' }}>
                  <View style={styles.sectionHeaderWrap}>
                    <Text style={styles.sectionTitle}>المحاضرات</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/lectures')}>
                      <Text style={styles.viewAllText}>عرض الكل</Text>
                    </TouchableOpacity>
                  </View>
                  {SUBJECT_MOCK_DATA.videos.map((item, idx) => (
                    <AnimatedVideoCard key={item.id} item={item} index={idx} />
                  ))}
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <View style={styles.sectionHeaderWrap}>
                    <Text style={styles.sectionTitle}>الاختبارات</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/quizzes')}>
                      <Text style={styles.viewAllText}>عرض الكل</Text>
                    </TouchableOpacity>
                  </View>
                  {SUBJECT_MOCK_DATA.quizzes.map((item, idx) => (
                    <AnimatedQuizCard key={item.id} item={item} index={idx} />
                  ))}
                </View>
              )}

              {/* Bottom Padding Spacer */}
              <View style={{ height: 60 }} />
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDeep },
  
  bgGradientWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgLayerMain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bgMid,
  },
  bgLayerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: C.bgDeep,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 80,
  },
  sweepCurve1: { position: 'absolute', top: -100, right: -50, width: 400, height: 400, borderRadius: 200, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)', transform: [{ scaleX: 1.5 }, { rotate: '30deg' }] },
  sweepCurve2: { position: 'absolute', bottom: -150, left: -100, width: 500, height: 500, borderRadius: 250, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', transform: [{ scaleY: 1.3 }, { rotate: '45deg' }] },
  glowOrb1: { position: 'absolute', top: '15%', right: '5%', width: 250, height: 250, borderRadius: 125, backgroundColor: C.bgLight, opacity: 0.8, transform: [{ scale: 1.5 }] },
  glowOrb2: { position: 'absolute', bottom: '10%', left: '-10%', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 89, 79, 0.4)', opacity: 0.6 },

  scrollContent: { paddingTop: 12, paddingBottom: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 25, direction: "rtl" },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: C.white, letterSpacing: 0.5 },
  placeholder: { width: 44 },
  
  profileOuter: { paddingHorizontal: 20, marginBottom: 24 },
  profileCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    direction: "rtl",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 15 },
      android: { elevation: 10 },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 15 },
    }),
  },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  profileIconBox: { width: 70, height: 70, borderRadius: 20, justifyContent: "center", alignItems: "center", marginLeft: 16 },
  profileRight: { flex: 1, justifyContent: "center" },
  profileTitle: { fontSize: 22, fontWeight: "900", color: C.textBlack, marginBottom: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 15, fontWeight: "600", color: C.textGray },
  
  statsContainer: { flexDirection: "row", justifyContent: "space-around", backgroundColor: C.surfaceWarm, padding: 16, borderRadius: 16, marginBottom: 20 },
  statBox: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 13, color: C.textGray, fontWeight: "600", marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: "900" },
  statDivider: { width: 2, backgroundColor: "rgba(0,0,0,0.06)", height: "70%", alignSelf: "center" },
  
  progressWrap: { width: "100%" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: "700", color: C.textBlack },
  progressLabel: { fontSize: 14, fontWeight: "800" },
  progressTrack: { height: 8, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },

  tabsContainer: { paddingHorizontal: 20, marginBottom: 24 },
  tabsWrapper: { flexDirection: "row", backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, borderRadius: 20, padding: 6, direction: "rtl" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 16 },
  tabBtnActive: { backgroundColor: C.white, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 4 }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}) },
  tabText: { fontSize: 16, fontWeight: "700", color: '#a3b5b1' },
  tabTextActive: { color: C.textBlack },

  sectionHeaderWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", direction: "rtl", marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.white },
  viewAllText: { fontSize: 13, fontWeight: "700", color: C.gold },

  listContainer: { paddingHorizontal: 20, gap: 16 },
  
  videoCardOuter: { width: "100%" },
  videoCard: {
    flexDirection: "row", backgroundColor: C.surface, borderRadius: 20, padding: 14, direction: "rtl", alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 8 },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
    }),
  },
  videoThumb: { width: 90, height: 75, borderRadius: 16, justifyContent: "center", alignItems: "center", marginLeft: 16 },
  completedBadge: { position: "absolute", bottom: -6, right: -6, backgroundColor: "#4ADE80", width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: C.surface },
  videoContent: { flex: 1, justifyContent: "center", paddingVertical: 4 },
  videoTitle: { fontSize: 15, fontWeight: "800", color: C.textBlack, marginBottom: 8, lineHeight: 22 },
  videoMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  videoMetaText: { fontSize: 13, color: C.textGray, fontWeight: "600" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.surfaceWarm },
  statusChipActive: { backgroundColor: "rgba(212,160,67,0.15)" },
  statusChipCompleted: { backgroundColor: "rgba(74,222,128,0.15)" },
  statusChipText: { fontSize: 11, fontWeight: "800", color: C.textGray },
  statusTextActive: { color: C.gold },
  statusTextCompleted: { color: "#16A34A" },

  quizCardOuter: { width: "100%" },
  scoreBadge: { backgroundColor: "rgba(139, 92, 246, 0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  scoreText: { fontSize: 16, fontWeight: "900", color: '#8B5CF6' },
});
