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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  maroon: "#0c3b35",
  maroonDeep: "#08221f",
  maroonSoft: "#14594f",
  maroonGlow: "#1a7568",
  rose: "#a0d8cc",
  gold: "#D4A043",
  goldLight: "#F5DBA3",
  bg: "#F0F2F1",
  surface: "#FFFFFF",
  surfaceWarm: "#F5FAF8",
  text: "#0F1A18",
  textMuted: "#7A8A85",
  overlay: "rgba(8, 34, 31, 0.55)",
};

const GRADES_OPTIONS = [
  "الرابع الإعدادي",
  "الخامس الإعدادي",
  "السادس الإعدادي"
];

const CLASSES_DATA: Record<string, any[]> = {
  "الرابع الإعدادي": [
    { id: 1, title: "التربية الإسلامية", professor: "أ. محمد", lessonsCount: "10 دروس", icon: "book-outline", color: C.maroonSoft, progress: "100%" },
    { id: 2, title: "اللغة العربية", professor: "أ. زينب", lessonsCount: "25 درس", icon: "library", color: C.gold, progress: "45%" },
    { id: 3, title: "اللغة الإنجليزية", professor: "أ. سارة", lessonsCount: "20 درس", icon: "language", color: C.text, progress: "60%" },
    { id: 4, title: "الرياضيات", professor: "أ. علي", lessonsCount: "30 درس", icon: "calculator", color: C.maroon, progress: "20%" },
    { id: 5, title: "الفيزياء", professor: "أ. محمود", lessonsCount: "22 درس", icon: "flash", color: C.maroonSoft, progress: "35%" },
    { id: 6, title: "الكيمياء", professor: "أ. حسين", lessonsCount: "18 درس", icon: "flask", color: C.gold, progress: "10%" },
    { id: 7, title: "الأحياء", professor: "أ. فاطمة", lessonsCount: "24 درس", icon: "leaf", color: C.maroon, progress: "15%" },
    { id: 8, title: "الحاسوب", professor: "أ. عمر", lessonsCount: "14 درس", icon: "desktop-outline", color: C.text, progress: "80%" },
  ],
  "الخامس الإعدادي": [
    { id: 9, title: "التربية الإسلامية", professor: "أ. مصطفى", lessonsCount: "10 دروس", icon: "book-outline", color: C.maroonSoft, progress: "90%" },
    { id: 10, title: "اللغة العربية", professor: "أ. سعاد", lessonsCount: "25 درس", icon: "library", color: C.gold, progress: "50%" },
    { id: 11, title: "اللغة الإنجليزية", professor: "أ. نور", lessonsCount: "20 درس", icon: "language", color: C.text, progress: "40%" },
    { id: 12, title: "الرياضيات", professor: "أ. حسن", lessonsCount: "32 درس", icon: "calculator", color: C.maroon, progress: "25%" },
    { id: 13, title: "الفيزياء", professor: "أ. خالد", lessonsCount: "24 درس", icon: "flash", color: C.maroonSoft, progress: "30%" },
    { id: 14, title: "الكيمياء", professor: "أ. عباس", lessonsCount: "20 درس", icon: "flask", color: C.gold, progress: "15%" },
    { id: 15, title: "الأحياء", professor: "أ. هدى", lessonsCount: "26 درس", icon: "leaf", color: C.maroon, progress: "20%" },
    { id: 16, title: "علم الأرض", professor: "أ. رائد", lessonsCount: "12 درس", icon: "earth", color: C.maroonGlow, progress: "0%" },
    { id: 17, title: "الحاسوب", professor: "أ. ليث", lessonsCount: "15 درس", icon: "desktop-outline", color: C.textMuted, progress: "5%" },
  ],
  "السادس الإعدادي": [
    { id: 18, title: "التربية الإسلامية", professor: "أ. أحمد", lessonsCount: "12 درس", icon: "book-outline", color: C.maroonSoft, progress: "70%" },
    { id: 19, title: "اللغة العربية", professor: "أ. ياسر", lessonsCount: "30 درس", icon: "library", color: C.gold, progress: "80%" },
    { id: 20, title: "اللغة الإنجليزية", professor: "أ. دينا", lessonsCount: "25 درس", icon: "language", color: C.text, progress: "65%" },
    { id: 21, title: "الرياضيات", professor: "أ. حيدر", lessonsCount: "40 درس", icon: "calculator", color: C.maroon, progress: "90%" },
    { id: 22, title: "الفيزياء", professor: "أ. عبدالكريم", lessonsCount: "35 درس", icon: "flash", color: C.maroonSoft, progress: "55%" },
    { id: 23, title: "الكيمياء", professor: "أ. سعد", lessonsCount: "33 درس", icon: "flask", color: C.gold, progress: "45%" },
    { id: 24, title: "الأحياء", professor: "أ. مريم", lessonsCount: "38 درس", icon: "leaf", color: C.maroon, progress: "85%" },
  ]
};

function AnimatedSubjectCard({ item, index }: { item: any; index: number }) {
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      delay: 50 + index * 60,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [item.id]);

  const progressValue = parseInt(item.progress.replace("%", ""), 10);
  const isCompleted = progressValue === 100;

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => router.push(`/subject/${item.id}` as any)}
      >
        {/* Card Header: Icon & Badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: item.color + "1A" }]}>
            <Ionicons name={item.icon as any} size={28} color={item.color} />
          </View>
          <View style={[styles.metaBadge, { backgroundColor: item.color + "0D" }]}>
            <Ionicons name="book" size={12} color={item.color} />
            <Text style={[styles.metaText, { color: item.color }]}>
              {item.lessonsCount.split(" ")[0]}
            </Text>
          </View>
        </View>

        {/* Content: Title & Professor */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardProfessor}>{item.professor}</Text>
        </View>

        {/* Footer: Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>التقدم</Text>
            <Text style={[styles.progressLabel, { color: item.color }]}>
              {item.progress}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: item.progress as any, backgroundColor: item.color },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SubjectsScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [selectedGrade, setSelectedGrade] = useState(GRADES_OPTIONS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const subjectsToList = CLASSES_DATA[selectedGrade] || [];

  return (
    <View style={styles.container}>
      <View style={styles.bgLayer}>
        <View style={styles.bgPrimary} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Ionicons
                name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
                size={26}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>المواد الدراسية</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Custom Dropdown / Grade Selector */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.dropdownHeader}
              onPress={() => setDropdownOpen(!dropdownOpen)}
            >
              <View style={styles.dropdownHeaderLeft}>
                  <Ionicons name="school" size={20} color={C.maroon} />
                  <Text style={styles.dropdownSelectedText}>{selectedGrade}</Text>
              </View>
              <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={C.textMuted} />
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdownList}>
                {GRADES_OPTIONS.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedGrade(grade);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedGrade === grade && { color: C.maroonDeep, fontWeight: "800" }
                    ]}>
                      {grade}
                    </Text>
                    {selectedGrade === grade && (
                      <Ionicons name="checkmark-circle" size={20} color={C.maroonDeep} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Subjects Grid */}
          <View style={styles.gridContainer}>
            {subjectsToList.map((item, idx) => (
              <AnimatedSubjectCard key={item.id} item={item} index={idx} />
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  bgPrimary: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.maroon,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    direction: "rtl",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 44,
  },
  dropdownContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    direction: "rtl",
    zIndex: 10,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
    }),
  },
  dropdownHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dropdownSelectedText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(12,59,53,0.05)",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(12,59,53,0.15)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: "rgba(12,59,53,0.15)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
    }),
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textMuted,
  },
  gridContainer: {
    paddingHorizontal: 20,
    flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardOuter: {
    width: "48%", // Two columns
    marginBottom: 16,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 16,
    height: 190, // Fixed height for uniform grid
    direction: "rtl",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(12,59,53,0.03)",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: "rgba(12,59,53,0.08)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
    }),
  },
  cardCompleted: {
    borderColor: C.gold + "40",
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardContent: {
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.text,
    marginBottom: 4,
    lineHeight: 24,
  },
  cardProfessor: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
  },
  progressWrap: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
