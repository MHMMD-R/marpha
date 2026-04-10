import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';

const C = {
  bgDeep: '#061a15', bgMid: '#0a2e25', bgLight: '#0f4236', bgMain: '#F4F7F6',
  white: '#FFFFFF', glass: 'rgba(255, 255, 255, 0.08)', glassBorder: 'rgba(255, 255, 255, 0.2)',
  gold: '#D4A043', textGray: '#808A87', textBlack: '#1a1f1d', surface: '#FFFFFF',
  redBadge: '#FF3B30', success: '#10B981'
};

export default function QuizSubmissionsScreen() {
  const { quizId, quizTitle } = useLocalSearchParams();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Ionicons name='arrow-forward' size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إجابات الطلاب</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.quizName}>{quizTitle || 'الاختبار'}</Text>
        <Text style={styles.subText}>{submissions.length} إجابات مسلّمة</Text>
      </View>

      <View style={styles.content}>
        {loading ? <View style={styles.centerBox}><ActivityIndicator size='large' color={C.gold} /></View>
          : submissions.length === 0 ? <View style={styles.centerBox}><Ionicons name='document-outline' size={64} color={C.textGray} /><Text style={styles.emptyText}>لم يقم أي طالب بتسليم إجاباته بعد.</Text></View>
          : <FlatList data={submissions} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.8} style={styles.submissionCard} onPress={() => openGradeModal(item)}>
                <View style={styles.submissionHeader}>
                  <View style={[styles.avatarBox, item.graded ? { backgroundColor: C.success + '20' } : { backgroundColor: C.gold + '20' }]}>
                    <Ionicons name={item.graded ? 'checkmark-done' : 'person'} size={24} color={item.graded ? C.success : C.gold} />
                  </View>
                  <View style={styles.submissionInfo}>
                    <Text style={styles.studentName}>{item.studentName || 'طالب غير معروف'}</Text>
                    <Text style={[styles.gradeStatus, item.graded && { color: C.success }]}>{item.graded ? `تم التقييم: ${item.score}` : 'بانتظار التقييم'}</Text>
                  </View>
                  <Ionicons name='chevron-back' size={20} color={C.textGray} />
                </View>
              </TouchableOpacity>
            )} />
        }
      </View>

      <Modal visible={!!selectedSubmission} animationType='slide' transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>إجابة {selectedSubmission?.studentName}</Text>
            <TouchableOpacity onPress={() => setSelectedSubmission(null)}>
              <Ionicons name='close-circle' size={30} color={C.bgDeep} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {selectedSubmission?.answers?.length > 0 ? selectedSubmission.answers.map((ans: any, i: number) => (
                <View key={i} style={styles.answerBlock}>
                  <Text style={styles.qNum}>إجابة السؤال {i + 1}</Text>
                  {ans.answerImage ? (
                    <Image source={{ uri: ans.answerImage }} style={styles.ansImg} resizeMode='contain' />
                  ) : (
                    <Text style={styles.ansText}>{ans.answerText || 'لا توجد إجابة'}</Text>
                  )}
                </View>
              )) : (
                <View style={styles.centerBox}><Text style={styles.emptyText}>لم يتم إرفاق إجابات لهذا الطالب.</Text></View>
              )}
            </ScrollView>
            
            <View style={styles.gradingFooter}>
              <Text style={styles.inputLabel}>الدرجة التقييمية:</Text>
              <View style={styles.gradeInputRow}>
                <TextInput style={styles.gradeInput} placeholder='مثال: 10/10' value={gradeInput} onChangeText={setGradeInput} textAlign='center' keyboardType='default' />
                <TouchableOpacity style={[styles.submitGradeBtn, isSubmittingGrade && { opacity: 0.7 }]} onPress={handleSaveGrade} disabled={isSubmittingGrade}>
                  {isSubmittingGrade ? <ActivityIndicator color={C.white} /> : <Text style={styles.submitBtnText}>حفظ الدرجة</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDeep },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.glass, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: C.white },
  titleWrap: { alignItems: 'center', marginBottom: 20 },
  quizName: { fontSize: 22, fontWeight: '900', color: C.gold, marginBottom: 4 },
  subText: { fontSize: 14, color: C.textGray },
  content: { flex: 1, backgroundColor: C.bgMain, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: C.textGray, marginTop: 16 },
  listContainer: { padding: 20 },
  submissionCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 } }) },
  submissionHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  submissionInfo: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  studentName: { fontSize: 16, fontWeight: 'bold', color: C.textBlack, marginBottom: 4, textAlign: 'right' },
  gradeStatus: { fontSize: 13, color: C.gold, fontWeight: '600' },
  
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8EDEC' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: C.bgDeep },
  answerBlock: { backgroundColor: '#F9FAF9', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8EDEC' },
  qNum: { fontSize: 16, fontWeight: 'bold', color: C.bgDeep, marginBottom: 12, textAlign: 'right' },
  ansImg: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E8EDEC' },
  ansText: { fontSize: 16, color: C.textBlack, textAlign: 'right', padding: 10, backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  
  gradingFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#E8EDEC', backgroundColor: '#F9FAF9' },
  inputLabel: { fontSize: 16, fontWeight: 'bold', color: C.bgDeep, textAlign: 'right', marginBottom: 10 },
  gradeInputRow: { flexDirection: 'row-reverse', gap: 10 },
  gradeInput: { flex: 1, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: '#E8EDEC', fontSize: 18, fontWeight: 'bold', color: C.textBlack },
  submitGradeBtn: { backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: 'bold' }
});