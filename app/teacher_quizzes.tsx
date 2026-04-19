import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const DUMMY_API_BASE = 'https://marpha-uploader.marpha.workers.dev';
const { width } = Dimensions.get('window');

// ─── Design System (matching teacher_home & teacher_lectures) ───
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
  danger: '#FF3B30',
  dangerSoft: '#FFF0F0',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
};

// ─── Animated Floating Circles (header) ───
const HeaderDecorations = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [float1, float2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.decorCircle, {
        width: 300, height: 300, borderRadius: 150, top: -60, right: -100,
        backgroundColor: 'rgba(255,255,255,0.03)',
        transform: [{ translateY: float1.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }],
      }]} />
      <Animated.View style={[styles.decorCircle, {
        width: 200, height: 200, borderRadius: 100, top: 100, left: -80,
        backgroundColor: 'rgba(255,255,255,0.04)',
        transform: [{ translateY: float2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
      }]} />
    </View>
  );
};

// ─── Card Theme Palette ───
const CARD_THEMES = [
  { banner: '#12453D', bannerSoft: '#1A5C52', badgeBg: C.accent, badgeText: '#FFF', icon: 'document-text' as const },
  { banner: '#1E3A5F', bannerSoft: '#274B77', badgeBg: '#60A5FA', badgeText: '#FFF', icon: 'clipboard' as const },
  { banner: '#4A1942', bannerSoft: '#5E2256', badgeBg: '#E84393', badgeText: '#FFF', icon: 'create' as const },
  { banner: '#3D1A0A', bannerSoft: '#5C2E16', badgeBg: '#F97316', badgeText: '#FFF', icon: 'reader' as const },
  { banner: '#0C2D48', bannerSoft: '#144163', badgeBg: '#0EA5E9', badgeText: '#FFF', icon: 'newspaper' as const },
];

// ─── Animated Quiz Card ───
const AnimatedQuizCard = ({ item, index, onPress, onDelete }: {
  item: any;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1, duration: 550, delay: 100 + index * 100,
      easing: Easing.out(Easing.back(1.15)),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, index]);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.965, friction: 8, tension: 150, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  };

  const questionCount = item.questions?.length || 0;
  const dateStr = item.createdAt?.toDate
    ? item.createdAt.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'بدون تاريخ';

  const theme = CARD_THEMES[index % CARD_THEMES.length];

  return (
    <Animated.View style={{
      opacity: enterAnim,
      transform: [
        { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
        { scale: pressScale },
      ],
      marginBottom: 18,
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.quizCard}
      >
        {/* ── Colored Banner Top ── */}
        <View style={[styles.cardBanner, { backgroundColor: theme.banner }]}>
          {/* Decorative circles */}
          <View style={[styles.bannerCircle1, { backgroundColor: theme.bannerSoft }]} />
          <View style={[styles.bannerCircle2, { backgroundColor: theme.bannerSoft }]} />

          {/* Banner content: title on right, question count badge on left */}
          <View style={styles.bannerContent}>
            {/* Question count badge */}
            <View style={[styles.questionBadge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.questionBadgeNum, { color: theme.badgeText }]}>{questionCount}</Text>
              <Text style={[styles.questionBadgeLabel, { color: theme.badgeText }]}>أسئلة</Text>
            </View>

            {/* Title + icon */}
            <View style={styles.bannerTitleRow}>
              <View style={styles.bannerTitleCol}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>نشط</Text>
                </View>
              </View>
              <View style={styles.bannerIconCircle}>
                <Ionicons name={theme.icon} size={22} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        </View>

        {/* ── White Body Bottom ── */}
        <View style={styles.cardBody}>
          <View style={styles.cardBodyRow}>
            {/* Delete button */}
            <TouchableOpacity
              onPress={onDelete}
              style={styles.deleteBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={C.danger} />
            </TouchableOpacity>

            {/* View answers chip */}
            <View style={styles.viewChip}>
              <Ionicons name="chevron-back" size={12} color={C.primary} />
              <Text style={styles.viewChipText}>عرض الإجابات</Text>
              <Ionicons name="eye-outline" size={14} color={C.primary} />
            </View>

            {/* Meta items */}
            <View style={styles.cardMetaRight}>
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>{dateStr}</Text>
                <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Hero Stats Card ───
const HeroStatsCard = ({ totalQuizzes, totalQuestions }: { totalQuizzes: number; totalQuestions: number }) => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale1, { toValue: 1.08, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale1, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale2, { toValue: 1.06, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale2, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [scale1, scale2]);

  return (
    <View style={styles.heroCard}>
      {/* Decorative circles */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 28 }]} pointerEvents="none">
        <Animated.View style={[styles.decorCircle, {
          width: 160, height: 160, borderRadius: 80, top: -30, left: -30,
          backgroundColor: C.heroDecor, opacity: 0.8,
          transform: [{ scale: scale1 }],
        }]} />
        <Animated.View style={[styles.decorCircle, {
          width: 200, height: 200, borderRadius: 100, bottom: -60, right: -50,
          backgroundColor: C.heroDecor, opacity: 0.6,
          transform: [{ scale: scale2 }],
        }]} />
      </View>

      <View style={styles.heroContent}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ملخص الاختبارات</Text>
            <Ionicons name="stats-chart" size={14} color="#2FD67C" style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{totalQuizzes}</Text>
            <Text style={styles.heroStatLabel}>إجمالي الاختبارات</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{totalQuestions}</Text>
            <Text style={styles.heroStatLabel}>إجمالي الأسئلة</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
export default function TeacherQuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<{ id: string, qUri: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'quizzes'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedQuizzes.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQuizzes(fetchedQuizzes);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalQuestions = quizzes.reduce((sum, q: any) => sum + (q.questions?.length || 0), 0);

  const uploadImage = async (uri: string, prefix: string, userUid: string) => {
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const uploadUrl = `${DUMMY_API_BASE}/api/r2/upload?bucketType=QUIZZES&folder=quizzes_${userUid}&fileName=${encodeURIComponent(fileName)}`;
    let payload;
    if (Platform.OS === 'web') {
      const responseFile = await fetch(uri);
      const blob = await responseFile.blob();
      const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      payload = await response.json();
    } else {
      const { uploadAsync, FileSystemUploadType } = await import('expo-file-system/legacy');
      const uploadTask = await uploadAsync(uploadUrl, uri, {
        httpMethod: 'PUT', uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 1, headers: { 'Content-Type': 'image/jpeg' }
      });
      if (uploadTask.status !== 200) throw new Error(`Upload failed: ${uploadTask.status}`);
      payload = JSON.parse(uploadTask.body);
    }
    if (!payload?.publicUrl) throw new Error("Upload URL not returned from server");
    return payload.publicUrl;
  };

  const handleAddQuiz = async () => {
    if (!quizTitle.trim()) return Alert.alert('تنبيه', 'الرجاء إدخال عنوان الاختبار على الأقل');
    if (questions.length === 0) return Alert.alert('تنبيه', 'الرجاء إضافة سؤال واحد على الأقل');
    const user = auth.currentUser;
    if (!user) return;

    for (const q of questions) {
      if (!q.qUri) return Alert.alert('تنبيه', 'الرجاء التأكد من إضافة صورة السؤال لجميع الأسئلة');
    }

    setIsSubmitting(true);
    try {
      const uploadedQuestions = [];
      let i = 1;
      for (const q of questions) {
        const qUrl = await uploadImage(q.qUri, `q${i}`, user.uid);
        uploadedQuestions.push({ questionImage: qUrl });     
        i++;
      }
      await addDoc(collection(db, 'quizzes'), {
        title: quizTitle.trim(), questions: uploadedQuestions,
        teacherId: user.uid, status: 'active', createdAt: serverTimestamp(),
      });

      // Send Push Notifications to all students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const targetTokens = studentsSnap.docs.map(doc => doc.data().expoPushToken).filter(Boolean);

      if (targetTokens.length > 0) {
        const messages = targetTokens.map(token => ({
          to: token,
          sound: 'default',
          title: 'اختبار جديد',
          body: `تمت إضافة اختبار جديد بعنوان "${quizTitle.trim()}"`,
          data: { route: 'quizzes' },
        }));

        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        }).catch(err => console.error('Push notification error:', err));
      }

      setIsModalVisible(false);
      setQuizTitle(''); setQuestions([]);
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async (id: string, type: 'qUri') => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setQuestions(prev => prev.map(q => q.id === id ? { ...q, [type]: result.assets[0].uri } : q));
  };

  const addQuestion = () => setQuestions(prev => [...prev, { id: Math.random().toString(), qUri: '', }]);
  const removeQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));

  const alertDelete = (id: string) => Alert.alert('حذف', 'هل أنت متأكد من حذف هذا الاختبار؟', [{text:'إلغاء',style:'cancel'},{text:'حذف', style:'destructive', onPress:()=>deleteDoc(doc(db,'quizzes',id))}]);

  return (
    <View style={styles.wrapper}>
      {/* Dark curved top background */}
      <View style={styles.topBgLayer}>
        <HeaderDecorations />
      </View>
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>إدارة الاختبارات</Text>
            <Text style={styles.headerTitle}>اختباراتي</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* Stats pills */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="document-text" size={14} color={C.accent} />
            <Text style={styles.statPillText}>{quizzes.length} اختبار</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="help-circle" size={14} color="#2FD67C" />
            <Text style={styles.statPillText}>{totalQuestions} سؤال</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={styles.statPillText}>{quizzes.length} نشط</Text>
          </View>
        </View>

        {/* Main content area */}
        <View style={styles.contentArea}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>جاري التحميل...</Text>
            </View>
          ) : quizzes.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={48} color={C.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد اختبارات</Text>
              <Text style={styles.emptyText}>اضغط على + لإنشاء اختبار جديد</Text>
            </View>
          ) : (
            <FlatList
              data={quizzes}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <HeroStatsCard totalQuizzes={quizzes.length} totalQuestions={totalQuestions} />
              }
              renderItem={({ item, index }) => (
                <AnimatedQuizCard
                  item={item}
                  index={index}
                  onPress={() => router.push({ pathname: "/submissions/[quizId]", params: { quizId: item.id, quizTitle: item.title } } as any)}
                  onDelete={() => alertDelete(item.id)}
                />
              )}
              ListFooterComponent={<View style={{ height: 30 }} />}
            />
          )}
        </View>
      </SafeAreaView>

      {/* ─── Add Quiz Modal ─── */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn} disabled={isSubmitting}>
                <Ionicons name="close" size={20} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة اختبار بالصور</Text>
              <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Quiz Title Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="text" size={14} color={C.primary} />
                    <Text style={styles.inputLabel}>عنوان الاختبار</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: اختبار الفصل الأول"
                    placeholderTextColor={C.textSecondary}
                    value={quizTitle}
                    onChangeText={setQuizTitle}
                    textAlign="right"
                    editable={!isSubmitting}
                  />
                </View>

                {/* Questions */}
                {questions.map((q, idx) => (
                  <View key={q.id} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.questionDeleteBtn} disabled={isSubmitting}>
                        <Ionicons name="trash" size={16} color={C.danger} />
                      </TouchableOpacity>
                      <View style={styles.questionTitleRow}>
                        <View style={styles.questionNumberBadge}>
                          <Text style={styles.questionNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.questionTitleText}>السؤال {idx + 1}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.imagePickerBtn}
                      onPress={() => pickImage(q.id, 'qUri')}
                      activeOpacity={0.7}
                      disabled={isSubmitting}
                    >
                      {q.qUri ? (
                        <Image source={{ uri: q.qUri }} style={styles.pickedImg} />
                      ) : (
                        <View style={styles.imgPlaceholder}>
                          <View style={styles.imgPlaceholderIcon}>
                            <Ionicons name="cloud-upload-outline" size={28} color={C.primary} />
                          </View>
                          <Text style={styles.imgPlaceholderTitle}>صورة السؤال (مطلوب)</Text>
                          <Text style={styles.imgPlaceholderHint}>اضغط هنا لاختيار أو التقاط صورة للسؤال</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add Question Button */}
                <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion} activeOpacity={0.7} disabled={isSubmitting}>
                  <Ionicons name="add" size={20} color={C.primary} />
                  <Text style={styles.addQuestionText}>إضافة سؤال بالصور</Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleAddQuiz}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <View style={styles.submitLoadingRow}>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.submitBtnText}>جاري رفع الاختبار والصور...</Text>
                    </View>
                  ) : (
                    <View style={styles.submitLoadingRow}>
                      <Ionicons name="paper-plane" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>نشر الاختبار فوراً</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES — split into two sheets to avoid TS inference limit
// ═══════════════════════════════════════════════════════
const baseStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  decorCircle: { position: 'absolute' },

  // ─── Top Background ───
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

  // ─── Header ───
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleContainer: { alignItems: 'center', flex: 1 },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: C.white },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  // ─── Stats Row ───
  statsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 24, gap: 8, marginBottom: 16, flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statPillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  // ─── Content Area ───
  contentArea: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 10 },
  loadingText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textSecondary },
  listContainer: { padding: 20, paddingBottom: 40 },

  // ─── Hero Stats Card ───
  heroCard: {
    backgroundColor: C.heroCard,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  heroContent: { padding: 24 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 18, direction: 'rtl' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A3F37',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: C.white },
  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, padding: 18, direction: 'rtl',
  },
  heroStatItem: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: 30, fontWeight: '900', color: C.accent, marginBottom: 4 },
  heroStatLabel: { fontSize: 12, color: '#9FB5AF', fontWeight: '600' },
  heroStatDivider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.1)' },
});

const cardStyles = StyleSheet.create({
  // ─── Quiz Card (Two-Tone) ───
  quizCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  cardBanner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerCircle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    top: -30, left: -30, opacity: 0.6,
  },
  bannerCircle2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    bottom: -25, right: -15, opacity: 0.5,
  },
  bannerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bannerIconCircle: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitleCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 17, fontWeight: '900', color: C.white,
    marginBottom: 8, textAlign: 'right', lineHeight: 24,
  },
  statusPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#2FD67C',
  },
  statusText: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)',
  },
  questionBadge: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 14,
  },
  questionBadgeNum: {
    fontSize: 24, fontWeight: '900', lineHeight: 28,
  },
  questionBadgeLabel: {
    fontSize: 9, fontWeight: '700', opacity: 0.85, marginTop: -2,
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cardBodyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.dangerSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  viewChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: C.softGreen,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
  },
  viewChipText: {
    fontSize: 12, fontWeight: '700', color: C.primary,
  },
  cardMetaRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12, color: C.textSecondary, fontWeight: '600',
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    flex: 0.9,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  modalHandle: {
    width: 40, height: 5, backgroundColor: C.borderLight, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },

  // ─── Form Elements ───
  inputGroup: { marginBottom: 20 },
  inputLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  input: {
    backgroundColor: C.softGreen,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.borderLight,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.textPrimary,
  },

  // ─── Question Card (Modal) ───
  questionCard: {
    backgroundColor: C.bgMain,
    borderRadius: 20, padding: 16,
    marginBottom: 16,
    borderWidth: 1, borderColor: C.borderLight,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  questionDeleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.dangerSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  questionTitleRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  questionNumberBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  questionNumberText: { fontSize: 12, fontWeight: '900', color: C.white },
  questionTitleText: { fontSize: 14, fontWeight: '800', color: C.textPrimary },

  imagePickerBtn: {
    width: '100%', height: 160, borderRadius: 16,
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.borderLight,
    overflow: 'hidden', backgroundColor: C.white,
  },
  pickedImg: { width: '100%', height: '100%', borderRadius: 14 },
  imgPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  imgPlaceholderIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  imgPlaceholderTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  imgPlaceholderHint: { fontSize: 11, color: C.textSecondary },

  addQuestionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center', justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: C.softGreen,
    borderRadius: 16,
    marginVertical: 4,
    borderWidth: 1.5, borderColor: C.borderLight, borderStyle: 'dashed',
  },
  addQuestionText: { color: C.primary, fontWeight: '700', fontSize: 14 },

  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  submitLoadingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});

// Merge both sheets for single access
const styles = { ...baseStyles, ...cardStyles };