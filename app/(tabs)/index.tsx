import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  I18nManager,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_W = (SCREEN_W - 16 * 2 - CARD_GAP) / 2;

// Original Dark Emerald Palette (from logo)
const C = {
  bgDeep: '#061a15',
  bgMid: '#0a2e25',
  bgLight: '#0f4236',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  gold: '#D4A043',
  textGray: '#808A87',
};

const LECTURERS = [
  {
    id: 1,
    name: 'أ. أحمد الخالدي',
    subject: 'الكيمياء',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600&auto=format&fit=crop',
    accent: '#3B82F6',
  },
  {
    id: 2,
    name: 'أ. سارة حسين',
    subject: 'الفيزياء',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    accent: '#8B5CF6',
  },
  {
    id: 3,
    name: 'أ. محمود علي',
    subject: 'الرياضيات',
    imageUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=600&auto=format&fit=crop',
    accent: '#F59E0B',
  },
  {
    id: 4,
    name: 'أ. نور الخفاجي',
    subject: 'الأحياء',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=600&auto=format&fit=crop',
    accent: '#10B981',
  },
  {
    id: 5,
    name: 'أ. مصطفى عبد',
    subject: 'اللغة الانكليزية',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    accent: '#F43F5E',
  },
  {
    id: 6,
    name: 'أ. مريم حسن',
    subject: 'التربية الاسلامية',
    imageUrl: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?q=80&w=600&auto=format&fit=crop',
    accent: '#14B8A6',
  },
];

// Sparkle dots for ambient background
const SPARKLES = [
  { top: '8%', left: '10%', size: 3, opacity: 0.5 },
  { top: '15%', right: '15%', size: 2, opacity: 0.35 },
  { top: '30%', left: '85%', size: 4, opacity: 0.4 },
  { top: '45%', left: '5%', size: 2, opacity: 0.3 },
  { top: '60%', right: '8%', size: 3, opacity: 0.45 },
  { top: '75%', left: '20%', size: 2, opacity: 0.35 },
  { top: '90%', right: '30%', size: 3, opacity: 0.3 },
];

function LecturerCard({ item, index }: { item: typeof LECTURERS[0]; index: number }) {
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 90 + 80,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.cardOuter, {
      opacity: anim,
      transform: [
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
      ],
    }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => router.push(`/subject/${item.id}` as any)}
      >
        {/* Photo fills the card */}
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Dark gradient overlay at bottom for text readability */}
        <View style={styles.cardOverlay} />

        {/* Colored accent bar at top */}
        <View style={[styles.accentBar, { backgroundColor: item.accent }]} />

        {/* Text info at bottom */}
        <View style={styles.cardTextWrap}>
          <View style={[styles.subjectBadge, { backgroundColor: item.accent }]}>
            <Text style={styles.subjectText}>{item.subject}</Text>
          </View>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Background Decorations
const BackgroundDecor = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.bgCircle1} />
    <View style={styles.bgCircle2} />
    {SPARKLES.map((s, i) => (
      <View key={i} style={[styles.sparkle, {
        top: s.top as any,
        left: (s as any).left,
        right: (s as any).right,
        width: s.size,
        height: s.size,
        opacity: s.opacity,
      }]} />
    ))}
  </View>
);

export default function HomeScreen() {
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!I18nManager.isRTL) {
      try {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      } catch (error) { }
    }
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <BackgroundDecor />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }]}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="apps" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>مــعــرفــة</Text>
            <View style={styles.headerUnderline} />
          </View>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={22} color={C.white} />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeading}>نخبة التدريس</Text>
          <View style={styles.gridContainer}>
            {LECTURERS.map((item, idx) => (
              <LecturerCard key={item.id} item={item} index={idx} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDeep },

  // Background
  bgCircle1: { position: 'absolute', top: '-8%', right: '-18%', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(15, 66, 54, 0.5)' },
  bgCircle2: { position: 'absolute', bottom: '8%', left: '-12%', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(10, 46, 37, 0.6)' },
  sparkle: { position: 'absolute', backgroundColor: C.white, borderRadius: 10 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, direction: 'rtl' },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 26, color: C.white, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(212, 160, 67, 0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  headerUnderline: { width: 30, height: 3, backgroundColor: C.gold, borderRadius: 2, marginTop: 6 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 },
  sectionHeading: { fontSize: 22, color: C.white, fontWeight: '800', marginBottom: 18, textAlign: 'right' },

  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', direction: 'rtl' },

  // Lecturer Card
  cardOuter: { width: CARD_W, height: CARD_W * 1.3, marginBottom: CARD_GAP },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 12 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 16 },
    }),
  },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)',
    // Gradient-like effect: darker at bottom
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cardTextWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  subjectBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, marginBottom: 6 },
  subjectText: { fontSize: 13, fontWeight: '900', color: C.white, textAlign: 'center' },
  nameText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
