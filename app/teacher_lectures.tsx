import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';
const C = {
  bgMain: '#F4F7F6',
  topOverlay: '#0B2923',
  primary: '#12453D',
  accent: '#E3A736',
  white: '#FFFFFF',
  textSecondary: '#8A9E99',
  borderLight: '#E8EDEC',
};

const SIXTH_GRADE_SUBJECTS = [
  "الرياضيات",
  "العلوم",
  "لغتي",
  "اللغة الإنجليزية",
  "الدراسات الإسلامية",
  "الدراسات الاجتماعية",
  "المهارات الحياتية والأسرية",
  "التربية الفنية",
  "التربية البدنية"
];

export default function TeacherLecturesScreen() {
  const router = useRouter();
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(SIXTH_GRADE_SUBJECTS[0]);
  const [lectureFile, setLectureFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [computedDuration, setComputedDuration] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch Teacher's Subject First
    getDoc(doc(db, 'teachers', user.uid)).then((d) => {
      if (d.exists() && d.data().subject) {
        setSelectedSubject(d.data().subject);
      }
    }).catch(console.error);

    const q = query(collection(db, 'lectures'), where('teacherId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLectures = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by creation time
      fetchedLectures.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setLectures(fetchedLectures);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching lectures:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteLecture = (lectureId: string) => {
    Alert.alert(
      'حذف المحاضرة',
      'هل أنت متأكد أنك تريد حذف هذه المحاضرة بشكل نهائي؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteDoc, doc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'lectures', lectureId));
            } catch (error: any) {
              Alert.alert('خطأ', 'حدث خطأ أثناء الحذف: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLectureFile(asset);
        
        if (asset.duration) {
          // duration is in milliseconds
          const totalSeconds = Math.floor(asset.duration / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          setComputedDuration(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        } else {
          setComputedDuration('غير محدد');
        }
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل إحصائيات الفيديو.');
    }
  };

  const handleAddLecture = async () => {
    if (!lectureTitle.trim() || !lectureFile) {
      Alert.alert('تنبيه', 'الرجاء إدخال العنوان واختيار ملف الفيديو');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Get the local IP address for physical device to connect. 
      // Ensure Dashboard Vite dev server is running on port 5173 on this IP
      // OR on web use window.location.hostname logic
      const DUMMY_API_BASE = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:5173` 
        : "http://192.168.68.110:5173"; 
      
      const fileName = lectureFile.fileName || lectureFile.uri.split('/').pop() || `video_${Date.now()}.mp4`;
      const uploadUrl = `${DUMMY_API_BASE}/api/r2/upload?bucketType=LECTURES&folder=requests_${user.uid}&fileName=${encodeURIComponent(fileName)}`;

      // Prepare file body using FileSystem to avoid memory crash
      let payload;
      if (Platform.OS === 'web') {
        const responseFile = await fetch(lectureFile.uri);
        const blob = await responseFile.blob();
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": lectureFile.mimeType || "video/mp4" },
          body: blob,
        });
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
        payload = await response.json();
      } else {
        const uploadTask = await uploadAsync(uploadUrl, lectureFile.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 1,
          headers: { "Content-Type": lectureFile.mimeType || "video/mp4" }
        });
        if (uploadTask.status !== 200) {
          throw new Error(`Upload failed with status ${uploadTask.status}`);
        }
        payload = JSON.parse(uploadTask.body);
      }

      if (!payload.publicUrl) {
        throw new Error("Upload succeeded but no public URL was returned");
      }

      await addDoc(collection(db, 'lectures'), {
        title: lectureTitle.trim(),
        subject: selectedSubject,
        videoUrl: payload.publicUrl,
        duration: computedDuration || 'غير محدد',
        teacherId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert('نجاح', 'تم إرسال طلب المحاضرة بنجاح.');
      setLectureTitle('');
      setComputedDuration('');
      setLectureFile(null);
    } catch (error: any) {
      console.error('Error adding lecture:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة المحاضرة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLectureItem = ({ item }: { item: any }) => (
    <View style={styles.lectureCard}>
      <View style={styles.lectureHeaderRow}>
        <View style={styles.lectureIconCircle}>
          <Ionicons name="play" size={24} color={C.primary} />
        </View>
        <View style={styles.lectureInfo}>
          <View style={styles.lectureTitleRow}>
            <TouchableOpacity onPress={() => handleDeleteLecture(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
            <Text style={styles.lectureTitle}>{item.title}</Text>
          </View>
          <View style={styles.lectureMetaRow}>
            <Text style={styles.lectureDate}>
              {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'تاريخ غير متوفر'}
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.lectureDuration}>{item.duration}</Text>
            <View style={styles.metaDot} />
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: item.status === 'accepted' || item.status === 'active' ? '#10B981' : item.status === 'declined' ? '#FF6B6B' : '#F59E0B'
            }}>
              {item.status === 'accepted' || item.status === 'active' ? 'مقبول' : item.status === 'declined' ? 'مرفوض' : 'قيد المراجعة'}
            </Text>
          </View>
        </View>
      </View>
      {item.link || item.videoUrl ? (
        <TouchableOpacity activeOpacity={0.7} style={styles.linkContainer}>     
          <Ionicons name="videocam" size={16} color={C.primary} />
          <Text style={styles.linkText} numberOfLines={1}>{item.link || 'مرفق فيديو. اضغط للمعاينة'}</Text>    
          <TouchableOpacity 
            style={styles.copyBtn}
            onPress={() => {
              Alert.alert('نسخ الرابط', 'تم نسخ الرابط');
            }}
          >
            <Ionicons name="copy-outline" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>محاضراتي</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={24} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : lectures.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="videocam-outline" size={64} color={C.borderLight} />
            <Text style={styles.emptyText}>لا توجد محاضرات مضافة حالياً.</Text>
            <Text style={styles.emptySubText}>انقر على (+) لطلب محاضرة جديدة.</Text>
          </View>
        ) : (
          <FlatList
            data={lectures}
            keyExtractor={item => item.id}
            renderItem={renderLectureItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add Lecture Modal */}
      <Modal visible={isModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>طلب رفع محاضرة</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setLectureTitle(''); setLectureFile(null); setComputedDuration(''); }} disabled={isSubmitting}>
                <Ionicons name="close-circle" size={30} color={C.topOverlay} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>عنوان المحاضرة</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: مقدمة في المعادلات"
                value={lectureTitle}
                onChangeText={setLectureTitle}
                textAlign="right"
                editable={!isSubmitting}
                placeholderTextColor={C.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>المادة</Text>
              <View style={[styles.input, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={(itemValue) => setSelectedSubject(itemValue)}
                  enabled={!isSubmitting}
                  style={Platform.OS === 'web' ? { width: '100%', border: 'none', backgroundColor: 'transparent', textAlign: 'right', padding: 14 } as any : {}}
                  dropdownIconColor={C.primary}
                >
                  {SIXTH_GRADE_SUBJECTS.includes(selectedSubject) ? null : (
                    <Picker.Item label={selectedSubject} value={selectedSubject} />
                  )}
                  {SIXTH_GRADE_SUBJECTS.map((subject, idx) => (
                    <Picker.Item key={idx} label={subject} value={subject} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ملف الفيديو</Text>
              <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center', alignItems: 'flex-end', backgroundColor: '#F8FAF9' }]} 
                onPress={handlePickVideo}
                disabled={isSubmitting}
              >
                <Text style={{ color: lectureFile ? C.primary : C.textSecondary, fontWeight: lectureFile ? '600' : '400' }}>
                  {lectureFile ? (lectureFile.fileName || `فيديو مدته ${computedDuration}`) : 'اختر فيديو من جهازك'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleAddLecture} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>إرسال الطلب</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.topOverlay, // Gives header dark bg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.white,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.textSecondary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#B0C2BE',
    marginTop: 8,
  },
  listContainer: {
    padding: 20,
  },
  lectureCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  lectureHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  lectureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF5F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  lectureInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lectureTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginLeft: 8,
  },
  lectureTitle: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: 'bold',
    color: C.topOverlay,
  },
  lectureMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  lectureDate: {
    fontSize: 12,
    color: C.textSecondary,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderLight,
    marginHorizontal: 8,
  },
  lectureDuration: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    color: C.primary,
    marginRight: 8,
    flex: 1,
    textAlign: 'right',
  },
  copyBtn: {
    padding: 4,
    marginLeft: 8,
    backgroundColor: C.bgMain,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.topOverlay,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.topOverlay,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F9FAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
