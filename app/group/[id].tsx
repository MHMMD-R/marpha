import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, orderBy, getDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';

const C = {
  bgMain: '#F4F7F6', primary: '#12453D', white: '#FFFFFF', textSecondary: '#8A9E99', borderLight: '#E8EDEC', redBadge: '#FF3B30', accent: '#E3A736'
};

export default function GroupChatScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<any>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const initGroup = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setIsTeacher(user.uid === id);

      const groupRef = doc(db, 'groups', id as string);
      const unsubGroup = onSnapshot(groupRef, async (docSnap) => {
        if (!docSnap.exists() && user.uid === id) {
          await setDoc(groupRef, { teacherId: id, isMuted: false, mutedStudents: {} });
        } else {
          setGroupData(docSnap.data());
          setGlobalMuted(docSnap.data()?.isMuted || false);
        }
      });

      const q = query(collection(db, 'groups', id as string, 'group_messages'), orderBy('createdAt', 'asc'));
      const unsubMsgs = onSnapshot(q, (snap) => {
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(fetched);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      });

      if (user.uid === id) {
        const { getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'students'));
        setStudents(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      }

      return () => { unsubGroup(); unsubMsgs(); };
    };
    initGroup();
  }, [id]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    const user = auth.currentUser;
    if (!user) return;

    if (!isTeacher && groupData?.isMuted) {
      Alert.alert("معذرة", "لقد قام المعلم بإيقاف الدردشة حالياً.");
      return;
    }
    
    if (!isTeacher && groupData?.mutedStudents?.[user.uid]) {
       Alert.alert("معذرة", "لقد تم إيقافك من المشاركة في هذه المجموعة.");
       return;
    }

    try {
      let isTeacherDoc = true;
      let userDoc = await getDoc(doc(db, 'teachers', user.uid));
      if (!userDoc.exists()) {
        isTeacherDoc = false;
        userDoc = await getDoc(doc(db, 'students', user.uid));
      }
      
      const userName = userDoc.data()?.name || 'مستخدم';
      
      setInputText('');
      await addDoc(collection(db, 'groups', id as string, 'group_messages'), {
        text, senderId: user.uid, senderName: userName, senderRole: isTeacherDoc ? 'teacher' : 'student', createdAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const toggleGlobalMute = async (value: boolean) => {
    setGlobalMuted(value); await updateDoc(doc(db, 'groups', id as string), { isMuted: value });
  };

  const handleTimedMute = async (hours: number) => {
    const { updateDoc, doc } = await import('firebase/firestore');
    setGlobalMuted(true);
    await updateDoc(doc(db, 'groups', id as string), { isMuted: true });
    Alert.alert("تم", "تم إيقاف المراسلة لجميع الطلاب.");
  };

  const toggleStudentMute = async (studentId: string, currentMuted: boolean) => {
    const updated = { ...(groupData?.mutedStudents || {}) };
    if (currentMuted) delete updated[studentId]; else updated[studentId] = true;
    await updateDoc(doc(db, 'groups', id as string), { mutedStudents: updated });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    const isAdmin = item.senderRole === 'teacher' || item.senderRole === 'admin';

    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperOther]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
          {!isMe && <Text style={[styles.senderName, isAdmin && { color: C.accent }]}>{item.senderName} {isAdmin && '(المعلم)'}</Text>}
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const inputDisabled = !isTeacher && (groupData?.isMuted || groupData?.mutedStudents?.[auth.currentUser?.uid || '']);
  const placeholderText = inputDisabled ? 'تم إيقاف المراسلة' : 'اكتب رسالة...';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name="arrow-forward" size={24} color={C.white} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{name || 'مجموعة النقاش'}</Text>
        {isTeacher ? <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}><Ionicons name="settings-outline" size={24} color={C.white} /></TouchableOpacity> : <View style={{ width: 40 }} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View> : (
          <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} renderItem={renderMessage} contentContainerStyle={styles.listContent} />
        )}
        <View style={[styles.inputContainer, inputDisabled && styles.inputContainerDisabled]}>
          <TouchableOpacity style={[styles.sendBtn, inputDisabled && { opacity: 0.5, backgroundColor: C.textSecondary }]} onPress={handleSend} disabled={inputDisabled}>
            <Ionicons name="send" size={20} color={C.white} style={{ transform: [{ scaleX: -1 }]}} />
          </TouchableOpacity>
          <TextInput style={[styles.input, inputDisabled && styles.inputDisabled]} placeholder={placeholderText} value={inputText} onChangeText={setInputText} textAlign="right" pointerEvents={inputDisabled ? 'none' : 'auto'} editable={!inputDisabled} />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close-circle" size={28} color={C.primary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>إدارة المجموعة</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 15 }}>
              <View style={styles.settingRow}>
                <Switch value={globalMuted} onValueChange={toggleGlobalMute} trackColor={{ true: C.redBadge }} />
                <Text style={styles.settingLabel}>إيقاف المحادثة للجميع</Text>
              </View>
              <TouchableOpacity style={styles.timedMuteBtn} onPress={() => handleTimedMute(2)}>
                 <Ionicons name="time-outline" size={20} color={C.white} />
                 <Text style={{ color: C.white, marginLeft: 8, fontWeight: 'bold' }}>إيقاف مؤقت</Text>
              </TouchableOpacity>
              <Text style={{ marginTop: 20, marginBottom: 10, textAlign: 'right', fontWeight: 'bold', fontSize: 16 }}>كتم طلاب محددين:</Text>
              {students.map(student => {
                 const isMuted = !!groupData?.mutedStudents?.[student.id];
                 return (
                   <View key={student.id} style={styles.studentRow}>
                     <TouchableOpacity style={[styles.muteBtn, isMuted && styles.unmuteBtn]} onPress={() => toggleStudentMute(student.id, isMuted)}>
                       <Text style={styles.muteBtnText}>{isMuted ? 'إلغاء الكتم' : 'كتم'}</Text>
                     </TouchableOpacity>
                     <Text style={styles.studentName}>{student.name}</Text>
                   </View>
                 )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgMain },
  header: { height: 60, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 20 },
  msgWrapper: { marginBottom: 15, width: '100%', flexDirection: 'row' },
  msgWrapperMe: { justifyContent: 'flex-end', flexDirection: 'row' },
  msgWrapperOther: { justifyContent: 'flex-end', flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 15, paddingHorizontal: 16 },
  msgBubbleMe: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: C.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.borderLight },
  senderName: { fontSize: 12, color: C.textSecondary, marginBottom: 4, textAlign: 'right', fontWeight: 'bold' },
  msgText: { fontSize: 15 },
  msgTextMe: { color: C.white, textAlign: 'right' },
  msgTextOther: { color: '#10241F', textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: 10, backgroundColor: C.white, borderTopWidth: 1, borderColor: C.borderLight },
  inputContainerDisabled: { backgroundColor: '#F8F8F8' },
  input: { flex: 1, backgroundColor: C.bgMain, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, marginLeft: 10 },
  inputDisabled: { backgroundColor: '#E0E0E0', color: '#888' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: C.borderLight },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.primary },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.borderLight },
  settingLabel: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  timedMuteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, padding: 12, borderRadius: 12, marginTop: 15 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.borderLight },
  studentName: { fontSize: 16, color: '#444' },
  muteBtn: { backgroundColor: C.redBadge, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20 },
  unmuteBtn: { backgroundColor: C.borderLight },
  muteBtnText: { color: C.white, fontWeight: 'bold', fontSize: 13 }
});
