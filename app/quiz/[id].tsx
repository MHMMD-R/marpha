import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';

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

// Use the production Cloudflare worker URL to upload files independently of the dashboard
const DUMMY_API_BASE = 'https://marpha-uploader.marpha.workers.dev';

export default function TakeQuizScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<{ [qIdx: number]: string }>({});
  const [submission, setSubmission] = useState<any>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        if (!id) return;
        const docSnap = await getDoc(doc(db, 'quizzes', id as string));
        if (docSnap.exists()) { setQuiz({ id: docSnap.id, ...docSnap.data() });
          
          if (auth.currentUser) {
            const subQ = query(
              collection(db, 'quiz_submissions'),
              where('quizId', '==', id),
              where('studentId', '==', auth.currentUser.uid)
            );
            const subSnap = await getDocs(subQ);
            if (!subSnap.empty) {
              setSubmission({ id: subSnap.docs[0].id, ...subSnap.docs[0].data() });
            }
          }
        } else {
          Alert.alert('خطأ', 'الاختبار غير موجود');
          router.back();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const uploadImage = async (uri: string, idx: number) => {
    const userUid = auth.currentUser?.uid || 'unknown';
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `ans_${Date.now()}_${idx}.${ext}`;
    const uploadUrl = `${DUMMY_API_BASE}/api/r2/upload?bucketType=QUIZZES&folder=quiz_answers_${userUid}&fileName=${encodeURIComponent(fileName)}`;
    
    let payload;
    if (Platform.OS === 'web') {
      const responseFile = await fetch(uri);
      const blob = await responseFile.blob();
      const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
      if (!response.ok) throw new Error('Upload failed: ' + response.status);
      payload = await response.json();
    } else {
      const { uploadAsync, FileSystemUploadType } = await import('expo-file-system/legacy');
      const uploadTask = await uploadAsync(uploadUrl, uri, {
        httpMethod: 'PUT', uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 1, headers: { 'Content-Type': 'image/jpeg' }
      });
      if (uploadTask.status !== 200) throw new Error('Upload failed: ' + uploadTask.status);
      payload = JSON.parse(uploadTask.body);
    }
    if (!payload?.publicUrl) throw new Error('Upload URL not returned from server');
    return payload.publicUrl;
  };

  const pickImage = async (qIdx: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      setAnswers(prev => ({ ...prev, [qIdx]: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
    setIsSubmitting(true);
    try {
      const formattedAnswers = [];
      for (let i = 0; i < (quiz?.questions?.length || 0); i++) {
        let aUrl = '';
        if (answers[i]) {
          aUrl = await uploadImage(answers[i], i);
        }
        formattedAnswers.push({ questionIndex: i, answerImage: aUrl });
      }

      await addDoc(collection(db, 'quiz_submissions'), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentId: auth.currentUser.uid,
        studentName: auth.currentUser.displayName || 'طالب مجهول',
        answers: formattedAnswers,
        graded: false,
        score: '',
        createdAt: serverTimestamp(),
      });

      Alert.alert('نجاح', 'تم تسليم إجاباتك بنجاح', [{ text: 'حسناً', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('خطأ', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={styles.loadingText}>جاري تحميل الاختبار...</Text>
    </View>
  );
  if (!quiz) return null;

  const totalQuestions = quiz.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter((k) => answers[parseInt(k)]).length;

  // ─── Already Submitted View ───
  if (submission && !isSubmitting) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.topBgLayer} />
        <View style={styles.topBgGlow} />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-forward" size={22} color={C.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>نتيجة الاختبار</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{quiz?.title || 'الاختبار'}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
              <View style={styles.resultCard}>
                {/* Success icon */}
                <View style={styles.resultIconCircle}>
                  <Ionicons name="checkmark-circle" size={56} color={C.success} />
                </View>

                <Text style={styles.resultTitle}>تم التسليم مسبقاً</Text>
                <Text style={styles.resultSubtext}>
                  لقد قمت بتسليم هذا الاختبار بالفعل. شكراً لك!
                </Text>

                {/* Score display */}
                <View style={styles.resultScoreBox}>
                  <Text style={styles.resultScoreLabel}>نتيجة الاختبار</Text>
                  {submission.graded ? (
                    <Text style={styles.resultScoreValue}>{submission.score}</Text>
                  ) : (
                    <View style={styles.resultPendingRow}>
                      <Ionicons name="time-outline" size={20} color={C.textSecondary} />
                      <Text style={styles.resultPendingText}>بانتظار تصحيح المعلم...</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.resultBackBtn}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color={C.white} />
                  <Text style={styles.resultBackBtnText}>العودة للاختبارات</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Quiz Taking View ───
  return (
    <View style={styles.wrapper}>
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>
              {answeredCount}/{totalQuestions} تمت الإجابة
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{quiz?.title || 'الاختبار'}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: totalQuestions > 0 ? `${(answeredCount / totalQuestions) * 100}%` : '0%' },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {quiz.questions?.map((q: any, i: number) => (
              <View key={i} style={styles.questionCard}>
                {/* Question number badge */}
                <View style={styles.questionNumberRow}>
                  <View style={styles.questionNumberBadge}>
                    <Text style={styles.questionNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.questionLabel}>السؤال {i + 1} من {totalQuestions}</Text>
                </View>

                {/* Question text */}
                {q.text && <Text style={styles.questionTitle}>{q.text}</Text>}

                {/* Question image */}
                {q.imageUrl || q.questionImage ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setFullScreenImage(q.imageUrl || q.questionImage)}
                    style={styles.questionImageWrap}
                  >
                    <Image
                      source={{ uri: q.imageUrl || q.questionImage }}
                      style={styles.questionImage}
                      resizeMode="contain"
                    />
                    <View style={styles.zoomBadge}>
                      <Ionicons name="expand" size={14} color={C.white} />
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Answer section */}
                <View style={styles.answerSection}>
                  <View style={styles.answerLabelRow}>
                    <Ionicons name="camera" size={16} color={C.primary} />
                    <Text style={styles.ansLabel}>إجابتك:</Text>
                  </View>

                  {answers[i] ? (
                    <View style={styles.answerImageContainer}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={{ flex: 1 }}
                        onPress={() => setFullScreenImage(answers[i])}
                      >
                        <Image source={{ uri: answers[i] }} style={styles.answerImage} resizeMode="cover" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.changeImageBtn}
                        onPress={() => pickImage(i)}
                      >
                        <Ionicons name="camera-reverse" size={20} color={C.white} />
                      </TouchableOpacity>
                      {/* Success check */}
                      <View style={styles.answerCheckBadge}>
                        <Ionicons name="checkmark-circle" size={22} color={C.success} />
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.pickImageBtn} onPress={() => pickImage(i)} activeOpacity={0.7}>
                      <View style={styles.pickImageIconCircle}>
                        <Ionicons name="cloud-upload-outline" size={28} color={C.primary} />
                      </View>
                      <Text style={styles.pickImageTitle}>أضف صورة للإجابة</Text>
                      <Text style={styles.pickImageHint}>اضغط لاختيار صورة من معرضك</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Sticky submit button */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.submitLoadingRow}>
                  <ActivityIndicator color={C.white} size="small" />
                  <Text style={styles.submitText}>جاري رفع الإجابات...</Text>
                </View>
              ) : (
                <View style={styles.submitInnerRow}>
                  <Ionicons name="paper-plane" size={20} color={C.white} />
                  <Text style={styles.submitText}>تسليم الاختبار</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgMain,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textSecondary },
  topBgLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 240,
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
    paddingTop: 10,
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

  // ─── Progress Bar ───
  progressBarContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.accent,
  },

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

  // ─── Question Card ───
  questionCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  questionNumberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  questionNumberBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14, fontWeight: '900', color: C.white,
  },
  questionLabel: {
    fontSize: 13, fontWeight: '700', color: C.textSecondary,
  },
  questionTitle: {
    fontSize: 17, fontWeight: 'bold', color: C.textPrimary,
    marginBottom: 14, textAlign: 'right', lineHeight: 26,
  },
  questionImageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: C.softGreen,
  },
  questionImage: {
    width: '100%', height: 200, borderRadius: 16,
  },
  zoomBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30, height: 30, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Answer Section ───
  answerSection: {
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 16,
  },
  answerLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  ansLabel: {
    fontSize: 15, fontWeight: 'bold', color: C.textPrimary,
  },
  answerImageContainer: {
    width: '100%', height: 180, borderRadius: 16,
    overflow: 'hidden', position: 'relative',
    borderWidth: 2, borderColor: C.success,
    backgroundColor: C.softGreen,
  },
  answerImage: { width: '100%', height: '100%' },
  changeImageBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8, borderRadius: 12,
  },
  answerCheckBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: C.white,
    borderRadius: 12, padding: 2,
  },
  pickImageBtn: {
    width: '100%', height: 150, borderRadius: 16,
    borderWidth: 2, borderColor: C.borderLight, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FAFBFA',
  },
  pickImageIconCircle: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  pickImageTitle: {
    fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3,
  },
  pickImageHint: {
    fontSize: 11, color: C.textSecondary,
  },

  // ─── Submit ───
  submitContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  submitBtn: {
    backgroundColor: C.accent,
    padding: 16, borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  submitInnerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  submitLoadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  submitText: { fontSize: 17, fontWeight: 'bold', color: C.white },

  // ─── Already Submitted Result ───
  resultCard: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 5 },
    }),
  },
  resultIconCircle: {
    width: 100, height: 100, borderRadius: 34,
    backgroundColor: C.successSoft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 15, color: C.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 24,
  },
  resultScoreBox: {
    width: '100%',
    backgroundColor: C.softGreen,
    borderRadius: 18, padding: 22,
    alignItems: 'center',
    borderWidth: 1, borderColor: C.borderLight,
    marginBottom: 28,
  },
  resultScoreLabel: {
    fontSize: 14, color: C.textSecondary, marginBottom: 8, fontWeight: '700',
  },
  resultScoreValue: {
    fontSize: 36, color: C.accent, fontWeight: '900',
  },
  resultPendingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4,
  },
  resultPendingText: {
    fontSize: 15, color: C.textSecondary, fontWeight: '600',
  },
  resultBackBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  resultBackBtnText: {
    fontSize: 16, fontWeight: 'bold', color: C.white,
  },

  // ─── Fullscreen Modal ───
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
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
