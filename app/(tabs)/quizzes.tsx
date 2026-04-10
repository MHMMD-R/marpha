import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    I18nManager,
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

// Removed mock data

function AnimatedQuizCard({
  item,
  index,
}: {
  item: any;
  index: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: 150 + index * 100,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const router = useRouter();
  const isCompleted = item.status === "مكتمل";

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={() => router.push('/quiz/' + item.id)}>
        <View
          style={[
            styles.cardIconBox,
            isCompleted
              ? { backgroundColor: "rgba(22, 163, 74, 0.15)" } // Green tint
              : { backgroundColor: C.surfaceWarm },
          ]}
        >
          <Ionicons
            name={isCompleted ? "checkmark-done-circle" : "document-text"}
            size={32}
            color={isCompleted ? "#16A34A" : C.gold}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardCourse}>{item.course}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaBadge}>
              <Ionicons name="time-outline" size={14} color={C.textGray} />
              <Text style={styles.metaText}>{item.duration}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={14} color={C.textGray} />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
          </View>

          {/* Status or Score Bar */}
          <View style={styles.progressWrap}>
            {isCompleted ? (
              <Text style={[styles.progressLabel, { color: "#16A34A" }]}>
                الدرجة: {item.score}
              </Text>
            ) : (
              <Text style={[styles.progressLabel, { color: C.gold }]}>ابدأ الاختبار</Text>
            )}
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

export default function QuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "quizzes"), (snapshot) => {
        if (!snapshot.empty) {
          setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setQuizzes([]);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase not configured:", e);
    }
  }, []);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      {/* Background layer */}
      <View style={styles.bgGradientWrap}>
        <View style={styles.bgLayerMain} />
        <View style={styles.bgLayerTop} />
        <WhiteLinesDecor />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
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
                color={C.white}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>كوزاتي واختباراتي</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Filters/Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersScroll}
          >
            <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]}>
              <Text style={[styles.filterPillText, styles.filterPillTextActive]}>الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>مستمر</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>مكتمل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}>
              <Text style={styles.filterPillText}>تم الحفظ</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Lectures List */}
          <View style={styles.listContainer}>
            {quizzes.map((item, idx) => (
              <AnimatedQuizCard key={item.id} item={item} index={idx} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
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
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.white, letterSpacing: 0.5 },
  placeholder: { width: 44 },

  filtersScroll: { marginBottom: 20 },
  filtersContent: { paddingHorizontal: 20, gap: 12, direction: "rtl", flexDirection: "row" },
  filterPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder },
  filterPillActive: { backgroundColor: C.white },
  filterPillText: { fontSize: 14, fontWeight: "700", color: C.white },
  filterPillTextActive: { color: C.textBlack },

  listContainer: { paddingHorizontal: 20, gap: 16 },
  cardOuter: { width: "100%" },
  card: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 24, padding: 16, direction: "rtl", ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 15 }, android: { elevation: 6 }, default: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 15 }}) },
  cardIconBox: { width: 70, height: 70, borderRadius: 20, justifyContent: "center", alignItems: "center", marginLeft: 16 },
  cardContent: { flex: 1, justifyContent: "center" },
  cardCourse: { fontSize: 12, fontWeight: "800", color: C.gold, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.textBlack, marginBottom: 8 },
  cardMeta: { flexDirection: "row", gap: 12, marginBottom: 12 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: C.textGray, fontWeight: "600" },
  progressWrap: { flexDirection: "row", alignItems: "center", direction: "rtl" },
  progressLabel: { fontSize: 13, fontWeight: "800", marginRight: 12 },
});
