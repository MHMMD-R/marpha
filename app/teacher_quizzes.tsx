import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

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
  danger: '#FF3B30',
};

// Use the production Cloudflare worker URL to upload files independently of the dashboard
const DUMMY_API_BASE = 'https://marpha-uploader.marpha.workers.dev';

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
            <Text style={styles.headerSubtitle}>إدارة الاختبارات</Text>
            <Text style={styles.headerTitle}>اختباراتي</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
            <Ionicons name='add' size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="document-text" size={14} color={C.accent} />
            <Text style={styles.statPillText}>{quizzes.length} اختبار</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="images" size={14} color="#2FD67C" />
            <Text style={styles.statPillText}>اختبارات بالصور</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size='large' color={C.primary} />
              <Text style={styles.loadingText}>جاري تحميل الاختبارات...</Text>
            </View>
          ) : quizzes.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name='folder-open-outline' size={48} color={C.textSecondary} />
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quizCard}
                  onPress={() => router.push({ pathname: "/submissions/[quizId]", params: { quizId: item.id, quizTitle: item.title } } as any)}
                  activeOpacity={0.7}
                >
                  {/* Color strip */}
                  <View style={styles.cardStrip} />
                  
                  <View style={styles.cardBody}>
                    <View style={styles.quizHeaderRow}>
                      <View style={styles.quizIconCircle}>
                        <Ionicons name='images' size={24} color={C.accent} />
                      </View>
                      <View style={styles.quizInfo}>
                        <Text style={styles.quizTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={styles.quizMetaRow}>
                          <View style={styles.quizMetaPill}>
                            <Ionicons name="help-circle-outline" size={12} color={C.textSecondary} />
                            <Text style={styles.quizMetaText}>{item.questions?.length || 0} أسئلة</Text>
                          </View>
                          {item.createdAt && (
                            <View style={styles.quizMetaPill}>
                              <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
                              <Text style={styles.quizMetaText}>
                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG') : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.quizFooter}>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); alertDelete(item.id); }}
                        style={styles.deleteBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name='trash-outline' size={16} color={C.danger} />
                        <Text style={styles.deleteBtnText}>حذف</Text>
                      </TouchableOpacity>
                      <View style={styles.viewSubmissionsBadge}>
                        <Text style={styles.viewSubmissionsText}>عرض الإجابات</Text>
                        <Ionicons name='chevron-back' size={14} color={C.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>

      {/* ─── Create Quiz Modal ─── */}
      <Modal visible={isModalVisible} animationType='slide'>
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name='close' size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>إضافة اختبار بالصور</Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Quiz Title Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="text" size={16} color={C.primary} />
                  <Text style={styles.inputLabel}>عنوان الاختبار</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder='مثال: اختبار الفصل الأول'
                  placeholderTextColor={C.textSecondary}
                  value={quizTitle}
                  onChangeText={setQuizTitle}
                  textAlign='right'
                  editable={!isSubmitting}
                />
              </View>

              {/* Questions */}
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.questionDeleteBtn}>
                      <Ionicons name='trash' size={16} color={C.danger} />
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
                  >
                    {q.qUri ? (
                      <Image source={{ uri: q.qUri }} style={styles.pickedImg} />
                    ) : (
                      <View style={styles.imgPlaceholder}>
                        <View style={styles.imgPlaceholderIcon}>
                          <Ionicons name='cloud-upload-outline' size={28} color={C.primary} />
                        </View>
                        <Text style={styles.imgPlaceholderTitle}>صورة السؤال (مطلوب)</Text>
                        <Text style={styles.imgPlaceholderHint}>اضغط لإضافة صورة</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Question Button */}
              <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion} activeOpacity={0.7}>
                <Ionicons name='add-circle-outline' size={20} color={C.primary} />
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
                    <ActivityIndicator color={C.white} size="small" />
                    <Text style={styles.submitBtnText}>جاري نشر الاختبار...</Text>
                  </View>
                ) : (
                  <View style={styles.submitLoadingRow}>
                    <Ionicons name="paper-plane" size={18} color={C.white} />
                    <Text style={styles.submitBtnText}>نشر الاختبار</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
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
    height: 280,
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
  headerTitleContainer: { alignItems: 'center', flex: 1 },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: C.white },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 12, fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: { fontSize: 14, color: C.textSecondary },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textSecondary },
  listContainer: { padding: 20, paddingBottom: 40 },

  // ─── Quiz Card ───
  quizCard: {
    flexDirection: 'row-reverse',
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardStrip: { width: 5, backgroundColor: C.accent },
  cardBody: { flex: 1, padding: 16 },
  quizHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, marginBottom: 12 },
  quizIconCircle: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.softGold,
    justifyContent: 'center', alignItems: 'center',
  },
  quizInfo: { flex: 1, alignItems: 'flex-end' },
  quizTitle: {
    fontSize: 16, fontWeight: '800', color: C.textPrimary,
    textAlign: 'right', marginBottom: 6, lineHeight: 22,
  },
  quizMetaRow: { flexDirection: 'row-reverse', gap: 8 },
  quizMetaPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: C.softGreen,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  quizMetaText: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  quizFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 12,
  },
  deleteBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: C.danger },
  viewSubmissionsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.softGreen,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  viewSubmissionsText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // ─── Modal ───
  modalContainer: { flex: 1, backgroundColor: C.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  modalCloseBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.textPrimary },

  // ─── Form ───
  inputGroup: { marginBottom: 24 },
  inputLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  inputLabel: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  input: {
    backgroundColor: C.softGreen,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.borderLight,
    paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 15, color: C.textPrimary,
  },

  // ─── Question Card in modal ───
  questionCard: {
    backgroundColor: C.bgMain,
    borderRadius: 18, padding: 16,
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
    backgroundColor: '#FFF0F0',
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
  questionNumberText: { fontSize: 13, fontWeight: '900', color: C.white },
  questionTitleText: { fontSize: 15, fontWeight: '700', color: C.textPrimary },

  imagePickerBtn: {
    width: '100%', height: 140, borderRadius: 14,
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.borderLight,
    overflow: 'hidden', backgroundColor: C.white,
  },
  pickedImg: { width: '100%', height: '100%', borderRadius: 12 },
  imgPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  imgPlaceholderIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  imgPlaceholderTitle: { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  imgPlaceholderHint: { fontSize: 11, color: C.textSecondary },

  addQuestionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center', justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: C.softGreen,
    borderRadius: 14,
    marginVertical: 12,
    borderWidth: 1, borderColor: C.borderLight,
  },
  addQuestionText: { color: C.primary, fontWeight: '700', fontSize: 14 },

  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  submitLoadingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: 'bold' },
});