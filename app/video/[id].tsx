import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  I18nManager,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_W * (9 / 16);

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

// Elegant White Lines Decoration
const WhiteLinesDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.sweepCurve1} />
    <View style={styles.sweepCurve2} />
    <View style={styles.glowOrb1} />
    <View style={styles.glowOrb2} />
  </View>
);

export default function VideoPlayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isWatched, setIsWatched] = useState(false);

  // Floating Watermark Animation values
  const floatX = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const watermarkOpacity = useRef(new Animated.Value(0.5)).current;

  // Ghost Watermark
  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;

  // Simulate App-like educational video data
  const lessonData = {
    title: "الفصل الأول: المتسعات - الجزء الأول",
    subject: "الفيزياء المتقدمة",
    chapter: "الفصل الأول",
    duration: "45 دقيقة",
    professor: "د. عبدالكريم خليل",
    attachments: [
      { id: 1, name: "ملزمة الملخص الشامل.pdf", size: "2.4 MB" },
      { id: 2, name: "واجبات الدرس الأول.pdf", size: "1.1 MB" },
    ],
    nextLessons: [
      { id: 102, title: "الفصل الأول: المتسعات (الجزء الثاني)", duration: "50 دقيقة" },
    ]
  };

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    
    // Floating logic
    const WATERMARK_W = 50;
    const WATERMARK_H = 50;
    const maxX = SCREEN_W - WATERMARK_W;
    const maxY = VIDEO_HEIGHT - WATERMARK_H;

    let isUnmounted = false;

    const animateWatermark = () => {
      if (isUnmounted) return;
      const nextX = Math.random() * maxX;
      const nextY = Math.random() * maxY;
      
      // 20% chance to teleport instantly
      if (Math.random() > 0.8) {
        floatX.setValue(nextX);
        floatY.setValue(nextY);
        setTimeout(animateWatermark, 100);
        return;
      }

      Animated.parallel([
        Animated.timing(floatX, {
          toValue: nextX,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: nextY,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ]).start(({ finished }) => {
        if (finished && !isUnmounted) animateWatermark();
      });
    };

    // Ghost Interval Logic
    const ghostInterval = setInterval(() => {
      if (isUnmounted) return;
      ghostX.setValue(Math.random() * maxX);
      ghostY.setValue(Math.random() * maxY);
      ghostOpacity.setValue(0.25);
      
      setTimeout(() => {
        if (!isUnmounted) ghostOpacity.setValue(0);
      }, 1000); // hide after 1 second
    }, 4000 + Math.random() * 3000);

    // start floating
    animateWatermark();

    return () => {
      isUnmounted = true;
      floatX.stopAnimation();
      floatY.stopAnimation();
      clearInterval(ghostInterval);
    };
  }, []);

  const handleVideoPress = () => {
    setControlsVisible(!controlsVisible);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      <View style={styles.bgGradientWrap}>
        <View style={styles.bgLayerMain} />
        <View style={styles.bgLayerTop} />
        <WhiteLinesDecor />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        
        {/* Header (Consistent with rest of the app) */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>مشغل المحاضرة</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        {/* Scrollable Page Content */}
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Video Player Card */}
            <View style={styles.videoCard}>
               <TouchableOpacity activeOpacity={1} style={styles.videoBox} onPress={handleVideoPress}>
                  {/* Fake Video rendering */}
                  <View style={styles.fakeVideoBg}>
                    <Ionicons name="play" size={60} color="rgba(255,255,255,0.03)" />
                  </View>

                  {/* Floating ID / QR Watermarks Wrapper - Forced LTR to prevent RTL physics bugs */}
                  <View style={[StyleSheet.absoluteFillObject, { direction: "ltr", zIndex: 5 }]} pointerEvents="none">
                    <Animated.View style={[styles.watermark, { transform: [{ translateX: floatX }, { translateY: floatY }], opacity: watermarkOpacity }]}>
                       <Ionicons name="qr-code" size={24} color="rgba(255,255,255,0.7)" style={{ marginBottom: -2 }} />
                       <Text style={styles.watermarkText}>11111</Text>
                    </Animated.View>

                    {/* Ghost Watermark */}
                    <Animated.View style={[styles.watermark, { transform: [{ translateX: ghostX }, { translateY: ghostY }], opacity: ghostOpacity }]}>
                       <Ionicons name="qr-code" size={24} color="rgba(255,255,255,0.7)" style={{ marginBottom: -2 }} />
                       <Text style={styles.watermarkText}>11111</Text>
                    </Animated.View>
                  </View>

                  {/* Video Controls Overlay */}
                  {controlsVisible && (
                      <View style={styles.controlsOverlay}>
                         {/* Top Controls */}
                         <View style={styles.topControls}>
                            <View />
                            <View style={styles.topRightControls}>
                              <TouchableOpacity style={styles.controlIconWrap}><Ionicons name="settings-outline" size={24} color="#FFF" /></TouchableOpacity>
                            </View>
                         </View>

                         {/* Center Play/Pause */}
                         <View style={styles.centerControls}>
                            <TouchableOpacity style={styles.playIconBox} onPress={() => setIsPlaying(!isPlaying)}>
                                <Ionicons name={isPlaying ? "pause" : "play"} size={44} color="#FFF" />
                            </TouchableOpacity>
                         </View>

                         {/* Bottom Controls / Timeline */}
                         <View style={styles.bottomControls}>
                            <View style={styles.timelineRow}>
                               <Text style={styles.timeText}>12:34</Text>
                               <View style={styles.timelineTrack}>
                                  <View style={styles.timelineFill} />
                                  <View style={styles.timelineDot} />
                               </View>
                               <Text style={styles.timeText}>45:00</Text>
                            </View>
                         </View>
                      </View>
                  )}
               </TouchableOpacity>
            </View>
            
            {/* Main Lesson Info Card */}
            <View style={styles.infoCard}>
               <View style={styles.metaPillRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="book-outline" size={14} color={C.bgMid} />
                    <Text style={styles.metaPillText}>{lessonData.subject}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="bookmark-outline" size={14} color={C.bgMid} />
                    <Text style={styles.metaPillText}>{lessonData.chapter}</Text>
                  </View>
               </View>

               <Text style={styles.lessonTitle}>{lessonData.title}</Text>
               
               <View style={styles.durationRow}>
                 <Ionicons name="time-outline" size={16} color={C.textGray} />
                 <Text style={styles.durationText}>{lessonData.duration}</Text>
               </View>
            </View>

            {/* Professor Card */}
            <View style={styles.profCard}>
              <View style={styles.profAvatar}>
                 <Ionicons name="person" size={20} color="#FFF" />
              </View>
              <View style={styles.profInfo}>
                 <Text style={styles.profLabel}>أستاذ المادة</Text>
                 <Text style={styles.profName}>{lessonData.professor}</Text>
              </View>
            </View>

            {/* Attachments Section */}
            <View style={styles.sectionContainer}>
               <Text style={styles.sectionTitle}>المرفقات الخاصة بالدرس</Text>
               {lessonData.attachments.map((file) => (
                  <TouchableOpacity key={file.id} style={styles.fileCard} activeOpacity={0.8}>
                     <View style={styles.fileIconWrap}>
                        <Ionicons name="document-text" size={24} color={C.bgLight} />
                     </View>
                     <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{file.name}</Text>
                        <Text style={styles.fileSize}>{file.size}</Text>
                     </View>
                     <Ionicons name="download-outline" size={22} color={C.textGray} />
                  </TouchableOpacity>
               ))}
            </View>

            {/* Next Lesson Section */}
            <View style={styles.sectionContainer}>
               <Text style={styles.sectionTitle}>الدرس التالي</Text>
               {lessonData.nextLessons.map((lesson) => (
                  <TouchableOpacity key={lesson.id} style={styles.nextLessonCard} activeOpacity={0.8}>
                     <View style={styles.nextIconBox}>
                        <Ionicons name="play-circle" size={26} color={C.gold} />
                     </View>
                     <View style={styles.fileInfo}>
                        <Text style={styles.nextLessonTitle}>{lesson.title}</Text>
                        <Text style={styles.nextLessonDuration}>{lesson.duration}</Text>
                     </View>
                     <Ionicons name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"} size={20} color={C.textGray} />
                  </TouchableOpacity>
               ))}
            </View>

            {/* Mark as Watched Huge Action Button */}
            <TouchableOpacity 
              style={[styles.primaryActionBtn, isWatched && styles.primaryActionBtnWatched]} 
              activeOpacity={0.8}
              onPress={() => setIsWatched(!isWatched)}
            >
               <Ionicons name={isWatched ? "checkmark-circle" : "ellipse-outline"} size={24} color={isWatched ? C.white : "#FFF"} />
               <Text style={[styles.primaryActionBtnText, isWatched && { color: C.white }]}>
                 {isWatched ? "تم إكمال الدرس" : "تحديد كمُكتمل"}
               </Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
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
  
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16, direction: "rtl", paddingTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.glass, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.glassBorder },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  placeholder: { width: 44 },

  contentScroll: { flex: 1, direction: "rtl" },
  scrollContent: { paddingBottom: 50 },
  
  videoCard: { 
    width: SCREEN_W - 32, 
    height: (SCREEN_W - 32) * (9 / 16), 
    backgroundColor: "#000", 
    alignSelf: "center", 
    borderRadius: 24, 
    marginBottom: 16,
    ...Platform.select({ 
      ios: { shadowColor: "rgba(12,59,53,0.15)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20 }, 
      android: { elevation: 8 }, 
      default: { shadowColor: "rgba(12,59,53,0.15)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20 }
    }) 
  },
  videoBox: { flex: 1, overflow: "hidden", position: "relative", borderRadius: 24 },
  fakeVideoBg: { flex: 1, backgroundColor: "#1c1c1c", justifyContent: "center", alignItems: "center" },
  
  watermark: { position: "absolute", top: 0, left: 0, justifyContent: "center", alignItems: "center", width: 50, height: 50, pointerEvents: "none" },
  watermarkText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "space-between", zIndex: 10 },
  topControls: { flexDirection: "row", justifyContent: "space-between", padding: 12 },
  topRightControls: { flexDirection: "row", gap: 16 },
  controlIconWrap: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  
  centerControls: { alignSelf: "center", justifyContent: "center", alignItems: "center" },
  playIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  
  bottomControls: { padding: 12 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  timeText: { color: "#FFF", fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  timelineTrack: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.3)" },
  timelineFill: { width: "30%", height: "100%", backgroundColor: C.bgMid },
  timelineDot: { position: "absolute", left: "30%", top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: C.surface, marginLeft: -6 },

  // Scroll Content below video
  headerPad: { height: 16 },
  
  infoCard: { backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 24, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: "rgba(12,59,53,0.06)", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 15 }, android: { elevation: 4 }, default: { shadowColor: "rgba(12,59,53,0.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 15 }}) },
  metaPillRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(12,59,53,0.06)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  metaPillText: { fontSize: 12, fontWeight: "700", color: C.bgMid },
  lessonTitle: { fontSize: 20, fontWeight: "900", color: C.textBlack, lineHeight: 28, marginBottom: 12 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationText: { fontSize: 13, fontWeight: "600", color: C.textGray },

  profCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 24, ...Platform.select({ ios: { shadowColor: "rgba(12,59,53,0.04)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10 }, android: { elevation: 2 }, default: { shadowColor: "rgba(12,59,53,0.04)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10 }}) },
  profAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bgLight, justifyContent: "center", alignItems: "center", marginLeft: 12 },
  profInfo: { flex: 1, justifyContent: "center" },
  profLabel: { fontSize: 12, color: C.textGray, fontWeight: "600", marginBottom: 2 },
  profName: { fontSize: 16, fontWeight: "800", color: C.textBlack },

  sectionContainer: { marginTop: 8, marginBottom: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.textBlack, marginBottom: 12 },
  
  fileCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, padding: 14, borderRadius: 16, marginBottom: 10 },
  fileIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surfaceWarm, justifyContent: "center", alignItems: "center", marginLeft: 12 },
  fileInfo: { flex: 1, justifyContent: "center" },
  fileName: { fontSize: 14, fontWeight: "700", color: C.textBlack, marginBottom: 4 },
  fileSize: { fontSize: 12, color: C.textGray, fontWeight: "500" },

  nextLessonCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, padding: 14, borderRadius: 16 },
  nextIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surfaceWarm, justifyContent: "center", alignItems: "center", marginLeft: 12 },
  nextLessonTitle: { fontSize: 14, fontWeight: "800", color: C.textBlack, marginBottom: 4 },
  nextLessonDuration: { fontSize: 12, color: C.textGray, fontWeight: "500" },

  primaryActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.bgMid, marginHorizontal: 16, marginTop: 10, paddingVertical: 18, borderRadius: 20, ...Platform.select({ ios: { shadowColor: C.bgMid, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 }, android: { elevation: 6 }, default: { shadowColor: C.bgMid, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 }}) },
  primaryActionBtnWatched: { backgroundColor: "#10B981", ...Platform.select({ ios: { shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}) },
  primaryActionBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
});
