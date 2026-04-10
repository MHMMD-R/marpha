import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const C = {
  bgMain: '#F4F7F6', topOverlay: '#0B2923', primary: '#12453D', accent: '#E3A736',
  white: '#FFFFFF', textSecondary: '#8A9E99', borderLight: '#E8EDEC', redBadge: '#FF3B30'
};

const DUMMY_API_BASE = Platform.OS === 'web' && typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5173`
  : 'http://192.168.68.110:5173';

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Ionicons name='arrow-forward' size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اختباراتي (صور)</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
          <Ionicons name='add' size={24} color={C.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {loading ? <View style={styles.centerBox}><ActivityIndicator size='large' color={C.primary} /></View>
          : quizzes.length === 0 ? <View style={styles.centerBox}><Ionicons name='folder-open-outline' size={64} color={C.borderLight} /><Text style={styles.emptyText}>لا توجد اختبارات مضافة حالياً.</Text></View>
          : <FlatList data={quizzes} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} renderItem={({ item }) => (
              <TouchableOpacity style={styles.quizCard} onPress={() => router.push({ pathname: "/submissions/[quizId]", params: { quizId: item.id, quizTitle: item.title } } as any)}>
                <View style={styles.quizHeaderRow}>
                  <View style={styles.quizIconCircle}><Ionicons name='images' size={24} color={C.accent} /></View>
                  <View style={styles.quizInfo}>
                    <View style={styles.quizTitleRow}>
                      <TouchableOpacity onPress={() => alertDelete(item.id)} style={styles.deleteBtn}>
                        <Ionicons name='trash-outline' size={18} color={C.redBadge} />
                      </TouchableOpacity>
                      <Text style={styles.quizTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.quizDate}>{item.questions?.length || 0} أسئلة مصورة</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )} />
        }
      </View>

      <Modal visible={isModalVisible} animationType='slide'>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>إضافة اختبار بالصور</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}><Ionicons name='close-circle' size={30} color={C.topOverlay} /></TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>عنوان الاختبار</Text>
                <TextInput style={styles.input} placeholder='مثال: اختبار الفصل الأول' value={quizTitle} onChangeText={setQuizTitle} textAlign='right' editable={!isSubmitting} />
              </View>
              {questions.map((q, idx) => (
                <View key={q.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <TouchableOpacity onPress={() => removeQuestion(q.id)}><Ionicons name='trash' size={18} color={C.redBadge} /></TouchableOpacity>
                    <Text style={styles.questionTitle}>سؤال {idx + 1}</Text>
                  </View>
                  <View style={styles.imagePickersRow}>
                    <TouchableOpacity style={[styles.imagePickerBtn, { flex: 1, backgroundColor: '#f0f0f0' }]} onPress={() => pickImage(q.id, 'qUri')}>
                      {q.qUri ? <Image source={{ uri: q.qUri }} style={styles.pickedImg} /> : <View style={styles.imgCenter}><Ionicons name='camera-outline' size={24} color={C.topOverlay} /><Text style={[styles.imgLabel, {color: C.topOverlay}]}>صورة السؤال (مطلوب)</Text></View>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}><Ionicons name='add-circle-outline' size={20} color={C.primary} /><Text style={styles.addQuestionText}>إضافة سؤال بالصور</Text></TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleAddQuiz} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={C.white} /> : <Text style={styles.submitBtnText}>نشر الاختبار</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.topOverlay }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }, headerTitle: { fontSize: 20, fontWeight: 'bold', color: C.white },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' }, content: { flex: 1, backgroundColor: C.bgMain, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, emptyText: { fontSize: 18, fontWeight: 'bold', color: C.textSecondary, marginTop: 16 }, listContainer: { padding: 20 },
  quizCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 16, elevation: 3 }, quizHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  quizIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF8E8', justifyContent: 'center', alignItems: 'center', marginLeft: 16 }, quizInfo: { flex: 1, alignItems: 'flex-end' },
  quizTitleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 4 }, deleteBtn: { padding: 4, backgroundColor: '#FFE5E5', borderRadius: 8, marginLeft: 8 },
  quizTitle: { flex: 1, textAlign: 'right', fontSize: 16, fontWeight: 'bold', color: C.topOverlay }, quizDate: { fontSize: 12, color: C.textSecondary },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.borderLight }, modalTitle: { fontSize: 20, fontWeight: 'bold', color: C.topOverlay },
  inputGroup: { marginBottom: 20 }, inputLabel: { fontSize: 14, fontWeight: 'bold', color: C.topOverlay, marginBottom: 8, textAlign: 'right' },
  input: { backgroundColor: '#F9FAF9', borderRadius: 12, borderWidth: 1, borderColor: C.borderLight, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, textAlign: 'right' },
  submitBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 }, submitBtnText: { color: C.white, fontSize: 16, fontWeight: 'bold' },
  addQuestionBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#E8F5F2', borderRadius: 12, marginVertical: 10 }, addQuestionText: { color: C.primary, fontWeight: 'bold', marginRight: 8 },
  questionCard: { backgroundColor: '#F9FAF9', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.borderLight }, questionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  questionTitle: { fontWeight: 'bold', color: C.topOverlay, fontSize: 16 }, imagePickersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  imagePickerBtn: { flex: 1, height: 110, backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.borderLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pickedImg: { width: '100%', height: '100%', borderRadius: 8 }, imgLabel: { fontSize: 12, marginTop: 4, color: C.textSecondary, textAlign: 'center' }, imgCenter: { alignItems: 'center', justifyContent: 'center' }
});