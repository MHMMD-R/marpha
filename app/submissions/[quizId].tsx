import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';

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
};

export default function QuizSubmissionsScreen() {
  const { quizId, quizTitle } = useLocalSearchParams();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    const q = query(collection(db, 'quiz_submissions'), where('quizId', '==', quizId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setSubmissions(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [quizId]);

  const handleSaveGrade = async () => {
    if (!gradeInput.trim()) return Alert.alert('تنبيه', 'الرجاء إدخال الدرجة أولاً');
    if (!selectedSubmission) return;

    setIsSubmittingGrade(true);
    try {
      await updateDoc(doc(db, 'quiz_submissions', selectedSubmission.id), {
        score: gradeInput.trim(),
        graded: true
      });

      // Send Push Notification clearly when grade is updated
      if (selectedSubmission.studentId) {
        const studentDoc = await getDoc(doc(db, 'students', selectedSubmission.studentId));
        if (studentDoc.exists()) {
          const expoPushToken = studentDoc.data().expoPushToken;
          if (expoPushToken) {
            const messages = [{
              to: expoPushToken,
              sound: 'default',
              title: 'تم تصحيح اختبارك',
              body: `تم رصد درجتك (${gradeInput.trim()}) في الاختبار: ${quizTitle || 'بدون عنوان'}.`,
              data: { route: 'quizzes' },
            }];

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
        }
      }

      setSelectedSubmission(null);
      setGradeInput('');
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const openGradeModal = (sub: any) => {
    setSelectedSubmission(sub);
    setGradeInput(sub.score || '');
  };

  const gradedCount = submissions.filter(s => s.graded).length;
  const pendingCount = submissions.filter(s => !s.graded).length;

  return (
    <View style={styles.wrapper}>
      {/* Background layers */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name='arrow-forward' size={22} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>إجابات الاختبار</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{quizTitle || 'الاختبار'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{submissions.length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.success }]}>{gradedCount}</Text>
            <Text style={styles.statLabel}>تم تقييمها</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.accent }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>بانتظار</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size='large' color={C.primary} />
              <Text style={styles.loadingText}>جاري تحميل الإجابات...</Text>
            </View>
          ) : submissions.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name='document-outline' size={48} color={C.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إجابات</Text>
              <Text style={styles.emptyText}>لم يقم أي طالب بتسليم إجاباته بعد</Text>
            </View>
          ) : (
            <FlatList
              data={submissions}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.submissionCard}
                  onPress={() => openGradeModal(item)}
                >
                  {/* Status strip */}
                  <View style={[styles.cardStrip, { backgroundColor: item.graded ? C.success : C.accent }]} />

                  <View style={styles.cardBody}>
                    <View style={styles.submissionHeader}>
                      <View style={[
                        styles.avatarBox,
                        { backgroundColor: item.graded ? C.successSoft : C.softGold }
                      ]}>
                        <Ionicons
                          name={item.graded ? 'checkmark-done' : 'person'}
                          size={22}
                          color={item.graded ? C.success : C.accent}
                        />
                      </View>

                      <View style={styles.submissionInfo}>
                        <Text style={styles.studentName}>{item.studentName || 'طالب غير معروف'}</Text>
                        <View style={styles.submissionMetaRow}>
                          {item.graded ? (
                            <View style={styles.gradedBadge}>
                              <Ionicons name="ribbon" size={12} color={C.success} />
                              <Text style={styles.gradedBadgeText}>تم التقييم: {item.score}</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingBadge}>
                              <Ionicons name="time-outline" size={12} color={C.accent} />
                              <Text style={styles.pendingBadgeText}>بانتظار التقييم</Text>
                            </View>
                          )}
                          <View style={styles.answerCountBadge}>
                            <Ionicons name="images-outline" size={12} color={C.textSecondary} />
                            <Text style={styles.answerCountText}>{item.answers?.length || 0} إجابة</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.arrowContainer}>
                        <Ionicons name='chevron-back' size={16} color={C.textSecondary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>

      {/* ─── Grade Modal ─── */}
      <Modal visible={!!selectedSubmission} animationType='slide' transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedSubmission(null)} style={styles.modalCloseBtn}>
              <Ionicons name='close' size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitle}>إجابة الطالب</Text>
              <Text style={styles.modalSubtitle}>{selectedSubmission?.studentName}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {selectedSubmission?.answers?.length > 0 ? selectedSubmission.answers.map((ans: any, i: number) => (
                <View key={i} style={styles.answerBlock}>
                  {/* Answer header */}
                  <View style={styles.answerBlockHeader}>
                    <View style={styles.answerNumberBadge}>
                      <Text style={styles.answerNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.answerBlockTitle}>إجابة السؤال {i + 1}</Text>
                  </View>

                  {ans.answerImage ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImage(ans.answerImage)} style={styles.answerImageWrap}>
                      <Image source={{ uri: ans.answerImage }} style={styles.answerImage} resizeMode='contain' />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="expand" size={14} color={C.white} />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.noAnswerBox}>
                      <Ionicons name="alert-circle-outline" size={24} color={C.textSecondary} />
                      <Text style={styles.noAnswerText}>{ans.answerText || 'لا توجد إجابة'}</Text>
                    </View>
                  )}
                </View>
              )) : (
                <View style={styles.centerBox}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="alert-circle-outline" size={48} color={C.textSecondary} />
                  </View>
                  <Text style={styles.emptyTitle}>لا توجد إجابات</Text>
                  <Text style={styles.emptyText}>لم يتم إرفاق إجابات لهذا الطالب</Text>
                </View>
              )}
            </ScrollView>
            
            {/* Grading Footer */}
            <View style={styles.gradingFooter}>
              <View style={styles.gradingLabelRow}>
                <Ionicons name="star" size={16} color={C.accent} />
                <Text style={styles.gradingLabel}>الدرجة التقييمية:</Text>
              </View>
              <View style={styles.gradeInputRow}>
                <TextInput
                  style={styles.gradeInput}
                  placeholder='مثال: 10/10'
                  placeholderTextColor={C.textSecondary}
                  value={gradeInput}
                  onChangeText={setGradeInput}
                  textAlign='center'
                  keyboardType='default'
                />
                <TouchableOpacity
                  style={[styles.submitGradeBtn, isSubmittingGrade && { opacity: 0.7 }]}
                  onPress={handleSaveGrade}
                  disabled={isSubmittingGrade}
                  activeOpacity={0.8}
                >
                  {isSubmittingGrade ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <View style={styles.submitGradeInner}>
                      <Ionicons name="checkmark" size={18} color={C.white} />
                      <Text style={styles.submitGradeText}>حفظ</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
          
          {/* Fullscreen image modal */}
          <Modal visible={!!fullScreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
            <View style={styles.fullscreenOverlay}>
              <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullScreenImage(null)}>
                <View style={styles.fullscreenCloseCircle}>
                  <Ionicons name="close" size={24} color={C.white} />
                </View>
              </TouchableOpacity>
              <Image source={{ uri: fullScreenImage || '' }} style={styles.fullscreenImage} resizeMode="contain" />
            </View>
          </Modal>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 300,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: 'absolute',
    top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.topOverlaySoft,
    opacity: 0.55,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleContainer: { alignItems: 'flex-end', flex: 1, marginRight: 16 },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: C.white },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },

  // ─── Content ───
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 20, gap: 10,
  },
  loadingText: { fontSize: 14, color: C.textSecondary },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  listContainer: { padding: 20, paddingBottom: 40 },

  // ─── Submission Card ───
  submissionCard: {
    flexDirection: 'row-reverse',
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardStrip: { width: 5 },
  cardBody: { flex: 1, padding: 16 },
  submissionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  submissionInfo: { flex: 1, alignItems: 'flex-end', gap: 6 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: C.textPrimary, textAlign: 'right' },
  submissionMetaRow: { flexDirection: 'row-reverse', gap: 8 },
  gradedBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.successSoft,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  gradedBadgeText: { fontSize: 11, fontWeight: '700', color: C.success },
  pendingBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: C.accent },
  answerCountBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGreen,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  answerCountText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  arrowContainer: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Grade Modal ───
  modalContainer: { flex: 1, backgroundColor: C.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  modalHeaderInfo: { alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },

  // ─── Answer Block ───
  answerBlock: {
    backgroundColor: C.bgMain,
    borderRadius: 20, padding: 18,
    marginBottom: 16,
    borderWidth: 1, borderColor: C.borderLight,
  },
  answerBlockHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  answerNumberBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  answerNumberText: { fontSize: 13, fontWeight: '900', color: C.white },
  answerBlockTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  answerImageWrap: {
    borderRadius: 16, overflow: 'hidden',
    position: 'relative', backgroundColor: C.white,
  },
  answerImage: { width: '100%', height: 220, borderRadius: 16 },
  zoomBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30, height: 30, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  noAnswerBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1, borderColor: C.borderLight,
  },
  noAnswerText: { fontSize: 14, color: C.textSecondary },

  // ─── Grading Footer ───
  gradingFooter: {
    padding: 20,
    borderTopWidth: 1, borderTopColor: C.borderLight,
    backgroundColor: C.bgMain,
  },
  gradingLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  gradingLabel: { fontSize: 16, fontWeight: 'bold', color: C.textPrimary },
  gradeInputRow: { flexDirection: 'row-reverse', gap: 10 },
  gradeInput: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.borderLight,
    fontSize: 18, fontWeight: 'bold', color: C.textPrimary,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  submitGradeBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  submitGradeInner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
  },
  submitGradeText: { color: C.white, fontSize: 15, fontWeight: 'bold' },

  // ─── Fullscreen ───
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    right: 20, zIndex: 10,
  },
  fullscreenCloseCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: '80%' },
});