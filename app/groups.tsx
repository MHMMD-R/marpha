import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { auth, db } from '../firebase';
import { filterTeachersForStudent } from '../utils/chatAccess';

const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  topOverlaySoft: '#123B34',
  primary: '#12453D',
  primarySoft: '#2E5E55',
  accent: '#E3A736',
  accentSoft: '#FFF8E8',
  white: '#FFFFFF',
  textPrimary: '#10241F',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
  softGreen: '#EEF5F3',
  surface: '#FFFFFF',
};

// ─── Animated Group Card ───
function AnimatedGroupCard({
  item,
  index,
  onPress,
}: {
  item: any;
  index: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index * 80, 400) + 100,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.96, friction: 8, tension: 150, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  };

  const initials = (item.name || 'م').charAt(0);

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: pressScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Color strip */}
        <View style={styles.cardStrip} />

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            {/* Avatar */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>مجموعة {item.name}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.cardMetaPill}>
                  <Ionicons name="book-outline" size={11} color={C.primary} />
                  <Text style={styles.cardMetaPillText}>{item.subject || 'عام'}</Text>
                </View>
                <View style={styles.cardMetaItem}>
                  <Ionicons name="people-outline" size={12} color={C.textSecondary} />
                  <Text style={styles.cardMetaText}>مجموعة نقاش</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.cardChevron}>
          <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function GroupsListScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.spring(headerAnim, {
      toValue: 1, friction: 8, tension: 50, useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (!user) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      let studentProfile: any = null;
      let allTeachers: any[] = [];

      const updateVisibleTeachers = () => {
        setTeachers(studentProfile ? filterTeachersForStudent(allTeachers, studentProfile) : []);
      };

      unsubs.push(onSnapshot(doc(db, 'students', user.uid), snap => {
        studentProfile = snap.exists() ? { id: snap.id, uid: snap.id, ...snap.data() } : null;
        updateVisibleTeachers();
      }));

      unsubs.push(onSnapshot(collection(db, 'teachers'), snap => {
        allTeachers = snap.docs.map(docSnap => ({ id: docSnap.id, uid: docSnap.id, ...docSnap.data() }));
        updateVisibleTeachers();
        setLoading(false);
      }));
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

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
          <BackButton />

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>تواصل مع المعلمين والطلاب</Text>
            <Text style={styles.headerTitle}>مجموعات النقاش</Text>
          </View>
        </Animated.View>

        {/* ─── Stats Bar ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{teachers.length}</Text>
            <Text style={styles.statLabel}>مجموعة</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.accent }]}>{teachers.length}</Text>
            <Text style={styles.statLabel}>معلم</Text>
          </View>
        </View>

        {/* ─── Content ─── */}
        <View style={styles.content}>
          {/* Section Title */}
          <View style={styles.sectionRow}>
            <Ionicons name="chatbubbles" size={16} color={C.textPrimary} />
            <Text style={styles.sectionTitle}>جميع المجموعات</Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.emptyText}>جاري تحميل المجموعات...</Text>
            </View>
          ) : teachers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={44} color={C.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد مجموعات</Text>
              <Text style={styles.emptyText}>لم يتم إنشاء أي مجموعات نقاش بعد</Text>
            </View>
          ) : (
            <FlatList
              data={teachers}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <AnimatedGroupCard
                  item={item}
                  index={index}
                  onPress={() => router.push({ pathname: `/group/${item.id}` as any, params: { name: `مجموعة ${item.name}` } })}
                />
              )}
              ListFooterComponent={<View style={{ height: 40 }} />}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 280,
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

  // ─── Section ───
  sectionRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, marginTop: 22, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },

  // ─── List ───
  listContainer: { paddingHorizontal: 20 },

  // ─── Card ───
  cardOuter: { width: '100%', marginBottom: 10 },
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardStrip: { width: 4, backgroundColor: C.accent },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: C.white },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 6, textAlign: 'right' },
  cardMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardMetaPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGreen, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  cardMetaPillText: { fontSize: 10, fontWeight: '700', color: C.primary },
  cardMetaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  cardChevron: {
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
  },

  // ─── Empty ───
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
});
