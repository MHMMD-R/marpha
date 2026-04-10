import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';

const C = {
  bgDeep: '#061a15', bgMid: '#0a2e25', bgLight: '#0f4236', bgMain: '#F4F7F6',
  white: '#FFFFFF', glass: 'rgba(255, 255, 255, 0.08)', glassBorder: 'rgba(255, 255, 255, 0.2)',
  gold: '#D4A043', textGray: '#808A87', textBlack: '#1a1f1d', surface: '#FFFFFF',
  redBadge: '#FF3B30', success: '#10B981'
};



const DUMMY_API_BASE = Platform.OS === 'web' && typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5173`
  : 'http://192.168.68.110:5173';

export default function TakeQuizScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<{ [qIdx: number]: string }>({});
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const docRef = doc(db, 'quizzes', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuiz({ id: docSnap.id, ...docSnap.data() });
          
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={C.gold} /></View>;
  if (!quiz) return null;

  if (submission && !isSubmitting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}> 
            <Ionicons name="arrow-forward" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{quiz?.title || 'الاختبار'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Ionicons name="checkmark-circle" size={60} color={C.success || '#10B981'} />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: C.textBlack, marginBottom: 12 }}>تم التسليم مسبقاً</Text>
            <Text style={{ fontSize: 16, color: C.textGray, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
              لقد قمت بتسليم هذا الاختبار بالفعل. شكراً لك!
            </Text>

            <View style={{ width: '100%', backgroundColor: '#F5FAF8', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 32 }}>
              <Text style={{ fontSize: 16, color: C.textGray, marginBottom: 8, fontWeight: 'bold' }}>نتيجة الاختبار</Text>
              {submission.graded ? (
                <Text style={{ fontSize: 36, color: C.gold, fontWeight: '900' }}>
                  {submission.score}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="time-outline" size={20} color={C.textGray} />
                  <Text style={{ fontSize: 16, color: C.textGray, fontWeight: '600' }}>
                    بانتظار تصحيح المعلم...
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { width: '100%', backgroundColor: C.bgDeep, shadowColor: C.bgDeep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 }]} onPress={() => router.back()}>
              <Text style={styles.submitText}>العودة للخلف</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={C.white} />
        </TouchableOpacity>        <Text style={styles.headerTitle}>{quiz?.title || 'الاختبار'}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {quiz.questions?.map((q: any, i: number) => (
          <View key={i} style={styles.questionCard}>
            <Text style={styles.questionTitle}>{q.text}</Text>
            {q.imageUrl ? (
              <Image source={{ uri: q.imageUrl }} style={styles.qImg} contentFit="cover" />
            ) : null}
            <View style={styles.answerSection}>
              <Text style={styles.ansLabel}>إجابتك:</Text>
              <TouchableOpacity style={styles.pickImgBtn} onPress={() => pickImage(i)}>
                {answers[i] ? (
                  <Image source={{ uri: answers[i] }} style={styles.aImg} contentFit="cover" />
                ) : (
                  <View style={styles.imgPlaceholder}>
                    <Ionicons name="camera" size={32} color="#ccc" />
                    <Text style={styles.pickText}>أضف صورة للإجابة</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <TouchableOpacity style={styles.submitBtn} onPress={submitQuiz} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.submitText}>تسليم الاختبار</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: C.bgLight },
  header: {
    height: 100,
    backgroundColor: C.textBlack,
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: C.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },  questionCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
  questionTitle: { fontSize: 18, fontWeight: 'bold', color: C.textBlack, marginBottom: 12, textAlign: 'right' },
  qImg: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee', marginBottom: 16 },
  answerSection: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  ansLabel: { fontSize: 16, fontWeight: 'bold', color: C.textBlack, marginBottom: 8, textAlign: 'right' },
  pickImgBtn: { width: '100%', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', overflow: 'hidden' },
  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  pickText: { color: C.textGray, marginTop: 8 },
  aImg: { width: '100%', height: '100%' },
  submitBtn: { backgroundColor: C.gold, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitText: { fontSize: 18, fontWeight: 'bold', color: C.white }
});
