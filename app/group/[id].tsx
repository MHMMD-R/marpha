import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { auth, db } from '../../firebase';
import { filterStudentsForTeacher } from '../../utils/chatAccess';

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
  inputBg: '#F0F4F2',
  danger: '#FF3B30',
  dangerSoft: '#FFF0F0',
};

// ─── Time Formatting Helpers ───
const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp?.seconds ? timestamp.seconds * 1000 : timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp?.seconds ? timestamp.seconds * 1000 : timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'اليوم';
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
};

const getDateString = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp?.seconds ? timestamp.seconds * 1000 : timestamp);
  return date.toDateString();
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
  const sendScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    let unsubGroup: (() => void) | undefined;
    let unsubMsgs: (() => void) | undefined;
    let unsubStudents: (() => void) | undefined;
    let cancelled = false;

    const initGroup = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      setIsTeacher(user.uid === id);

      const groupRef = doc(db, 'groups', id as string);
      unsubGroup = onSnapshot(groupRef, async (docSnap) => {
        if (!docSnap.exists() && user.uid === id) {
          await setDoc(groupRef, { teacherId: id, isMuted: false, mutedStudents: {} });
        } else {
          setGroupData(docSnap.data());
          setGlobalMuted(docSnap.data()?.isMuted || false);
        }
      });

      const q = query(collection(db, 'groups', id as string, 'group_messages'), orderBy('createdAt', 'desc'));
      unsubMsgs = onSnapshot(q, (snap) => {
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(fetched);
        setLoading(false);
      });

      if (user.uid === id) {
        const teacherSnap = await getDoc(doc(db, 'teachers', user.uid));
        if (cancelled) return;
        const teacherProfile = {
          id: user.uid,
          uid: user.uid,
          ...(teacherSnap.exists() ? teacherSnap.data() : {}),
        };
        unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
          const allStudents: any[] = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
          setStudents(filterStudentsForTeacher(allStudents, teacherProfile).map(student => ({
            id: student.id,
            name: student.name,
          })));
        });
      }
    };
    initGroup();

    return () => {
      cancelled = true;
      unsubGroup?.();
      unsubMsgs?.();
      unsubStudents?.();
    };
  }, [id]);

  const animateSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(sendScale, { toValue: 1, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.back(3)) }),
    ]).start();
  };

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
      animateSend();
      await addDoc(collection(db, 'groups', id as string, 'group_messages'), {
        text, senderId: user.uid, senderName: userName, senderRole: isTeacherDoc ? 'teacher' : 'student', createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'groups', id as string), {
        lastMessage: text,
        lastMessageSender: userName,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const toggleGlobalMute = async (value: boolean) => {
    setGlobalMuted(value); await updateDoc(doc(db, 'groups', id as string), { isMuted: value });
  };

  const handleTimedMute = async (hours: number) => {
    setGlobalMuted(true);
    await updateDoc(doc(db, 'groups', id as string), { isMuted: true });
    Alert.alert("تم", "تم إيقاف المراسلة لجميع الطلاب.");
  };

  const toggleStudentMute = async (studentId: string, currentMuted: boolean) => {
    const updated = { ...(groupData?.mutedStudents || {}) };
    if (currentMuted) delete updated[studentId]; else updated[studentId] = true;
    await updateDoc(doc(db, 'groups', id as string), { mutedStudents: updated });
  };

  const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    const isAdmin = item.senderRole === 'teacher' || item.senderRole === 'admin';
    const initials = (item.senderName || 'م').charAt(0);

    // Date separator logic (inverted list so next = previous in time)
    const currentDate = getDateString(item.createdAt);
    const nextItem = messages[index + 1];
    const nextDate = nextItem ? getDateString(nextItem.createdAt) : null;
    const showDateSeparator = !nextDate || currentDate !== nextDate;

    // Check if previous message (below in inverted list) is from same sender for grouping
    const prevItem = index > 0 ? messages[index - 1] : null;
    const isFirstInGroup = !prevItem || prevItem.senderId !== item.senderId;

    return (
      <>
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther, !isFirstInGroup && { marginTop: 2 }]}>
          {/* Avatar — only show for first message in a group from others */}
          {!isMe && (
            <View style={styles.msgAvatarSlot}>
              {isFirstInGroup ? (
                <View style={[styles.msgAvatar, isAdmin && { backgroundColor: C.accentSoft }]}>
                  <Text style={[styles.msgAvatarText, isAdmin && { color: C.accent }]}>{initials}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={{ maxWidth: '78%' }}>
            <View style={[
              styles.msgBubble,
              isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
              isMe && isFirstInGroup && { borderBottomRightRadius: 6 },
              !isMe && isFirstInGroup && { borderBottomLeftRadius: 6 },
            ]}>
              {/* Sender name for first message in group */}
              {!isMe && isFirstInGroup && (
                <Text style={[styles.senderName, isAdmin && { color: C.accent }]}>
                  {item.senderName} {isAdmin ? '(المعلم)' : ''}
                </Text>
              )}
              <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>{item.text}</Text>
              {/* Timestamp */}
              <View style={styles.msgFooter}>
                {isMe && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />}
                <Text style={[styles.msgTime, isMe && { color: 'rgba(255,255,255,0.55)' }]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Date separator */}
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.createdAt)}</Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
      </>
    );
  }, [messages]);

  const inputDisabled = !isTeacher && (groupData?.isMuted || groupData?.mutedStudents?.[auth.currentUser?.uid || '']);

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.topOverlay} />

      {/* Background */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>

          {/* ─── Header ─── */}
          <View style={styles.header}>
            <BackButton />

            {/* Group avatar */}
            <View style={styles.headerAvatarWrap}>
              <View style={styles.headerAvatar}>
                <Ionicons name="people" size={22} color={C.white} />
              </View>
              <View style={styles.headerAvatarRing} />
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>{name || 'مجموعة النقاش'}</Text>
              <View style={styles.headerStatusRow}>
                <View style={[styles.headerStatusDot, globalMuted && { backgroundColor: C.danger }]} />
                <Text style={styles.headerStatusText}>
                  {globalMuted ? 'المحادثة متوقفة' : 'مجموعة نشطة'}
                </Text>
              </View>
            </View>

            {isTeacher ? (
              <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.8} onPress={() => setShowSettings(true)}>
                <Ionicons name="settings-outline" size={20} color={C.white} />
              </TouchableOpacity>
            ) : <View style={{ width: 44 }} />}
          </View>

          {/* Mute Banner */}
          {inputDisabled && (
            <View style={styles.muteBanner}>
              <Ionicons name="volume-mute" size={16} color={C.danger} />
              <Text style={styles.muteBannerText}>تم إيقاف المراسلة في هذه المجموعة</Text>
            </View>
          )}

          {/* ─── Chat Content ─── */}
          <View style={styles.chatContent}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.emptyText}>جاري تحميل الرسائل...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="chatbubbles-outline" size={48} color={C.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>ابدأ المحادثة</Text>
                <Text style={styles.emptyText}>أرسل أول رسالة في المجموعة!</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            )}

            {/* ─── Input Bar ─── */}
            <View style={[styles.inputContainer, inputDisabled && styles.inputContainerDisabled]}>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, inputDisabled && styles.inputFieldDisabled]}
                  placeholder={inputDisabled ? 'تم إيقاف المراسلة' : 'اكتب رسالتك...'}
                  placeholderTextColor={inputDisabled ? '#BBB' : '#9FABA7'}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  textAlign="right"
                  editable={!inputDisabled}
                />
              </View>
              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!inputText.trim() || inputDisabled) && styles.sendBtnDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || !!inputDisabled}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={inputText.trim() && !inputDisabled ? C.white : 'rgba(255,255,255,0.35)'}
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

        </SafeAreaView>

        {/* ─── Settings Modal ─── */}
        <Modal visible={showSettings} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Handle */}
              <View style={styles.modalHandle} />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSettings(false)}>
                  <Ionicons name="close" size={20} color={C.textPrimary} />
                </TouchableOpacity>
                <View style={styles.modalHeaderCenter}>
                  <Text style={styles.modalTitle}>إدارة المجموعة</Text>
                  <Text style={styles.modalSubtitle}>التحكم بصلاحيات المحادثة</Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Global Mute Toggle */}
                <View style={styles.settingCard}>
                  <View style={styles.settingCardRow}>
                    <View style={[styles.settingIconWrap, globalMuted && { backgroundColor: C.dangerSoft }]}>
                      <Ionicons name={globalMuted ? "volume-mute" : "volume-high"} size={20} color={globalMuted ? C.danger : C.primary} />
                    </View>
                    <View style={styles.settingCardInfo}>
                      <Text style={styles.settingCardTitle}>إيقاف المحادثة للجميع</Text>
                      <Text style={styles.settingCardSub}>منع جميع الطلاب من إرسال الرسائل</Text>
                    </View>
                  </View>
                  <Switch
                    value={globalMuted}
                    onValueChange={toggleGlobalMute}
                    trackColor={{ false: C.borderLight, true: C.danger }}
                    thumbColor={C.white}
                  />
                </View>

                {/* Timed Mute */}
                <TouchableOpacity style={styles.timedMuteBtn} onPress={() => handleTimedMute(2)} activeOpacity={0.85}>
                  <View style={styles.timedMuteIconWrap}>
                    <Ionicons name="time-outline" size={18} color={C.white} />
                  </View>
                  <Text style={styles.timedMuteText}>إيقاف مؤقت</Text>
                  <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {/* Students Section */}
                <View style={styles.studentsSectionHeader}>
                  <Ionicons name="people" size={16} color={C.textPrimary} />
                  <Text style={styles.studentsSectionTitle}>كتم طلاب محددين</Text>
                  <View style={styles.studentCount}>
                    <Text style={styles.studentCountText}>{students.length}</Text>
                  </View>
                </View>

                {students.map(student => {
                  const isMuted = !!groupData?.mutedStudents?.[student.id];
                  const initials = (student.name || 'ط').charAt(0);
                  return (
                    <View key={student.id} style={[styles.studentCard, isMuted && styles.studentCardMuted]}>
                      <TouchableOpacity
                        style={[styles.studentMuteBtn, isMuted ? styles.studentUnmuteBtn : styles.studentMuteBtnActive]}
                        onPress={() => toggleStudentMute(student.id, isMuted)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={isMuted ? "volume-high-outline" : "volume-mute-outline"} size={14} color={isMuted ? C.primary : C.white} />
                        <Text style={[styles.studentMuteBtnText, isMuted && { color: C.primary }]}>
                          {isMuted ? 'إلغاء' : 'كتم'}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        {isMuted && <Text style={styles.studentMutedLabel}>مكتوم حالياً</Text>}
                      </View>
                      <View style={[styles.studentAvatar, isMuted && { opacity: 0.5 }]}>
                        <Text style={styles.studentAvatarText}>{initials}</Text>
                      </View>
                    </View>
                  );
                })}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    backgroundColor: C.topOverlay,
  },
  topBgGlow: {
    position: 'absolute', top: -50, right: -30,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.topOverlaySoft, opacity: 0.5,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    gap: 12,
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  headerAvatarRing: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 18, borderWidth: 2, borderColor: C.accent, opacity: 0.35,
  },
  headerCenter: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 3 },
  headerStatusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  headerStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2FD67C' },
  headerStatusText: { fontSize: 11, fontWeight: '600', color: '#97AEA9' },
  settingsBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Mute Banner ───
  muteBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.dangerSoft,
    paddingVertical: 8, marginHorizontal: 20, borderRadius: 12,
    marginBottom: 4,
  },
  muteBannerText: { fontSize: 12, fontWeight: '700', color: C.danger },

  // ─── Chat Content ───
  chatContent: {
    flex: 1, backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },

  // ─── Messages ───
  msgRow: { marginVertical: 3, flexDirection: 'row', alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatarSlot: { width: 34, marginRight: 6, marginBottom: 4 },
  msgAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  msgAvatarText: { fontSize: 12, fontWeight: '800', color: C.primary },
  msgBubble: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  msgBubbleMe: {
    backgroundColor: C.primary,
    borderTopRightRadius: 20, borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  msgBubbleOther: {
    backgroundColor: C.surface,
    borderTopRightRadius: 20, borderTopLeftRadius: 20,
    borderBottomRightRadius: 20, borderBottomLeftRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  senderName: {
    fontSize: 12, color: C.primarySoft, fontWeight: '800',
    marginBottom: 3, textAlign: 'right',
  },
  msgText: { fontSize: 15, lineHeight: 23 },
  msgTextMe: { color: C.white, textAlign: 'right' },
  msgTextOther: { color: C.textPrimary, textAlign: 'right' },
  msgFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    marginTop: 3, gap: 2,
  },
  msgTime: { fontSize: 10, color: C.textSecondary, fontWeight: '500' },

  // ─── Date Separator ───
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dateSeparatorLine: { flex: 1, height: 1, backgroundColor: C.borderLight },
  dateSeparatorText: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: C.softGreen, borderRadius: 10, overflow: 'hidden',
  },

  // ─── Input Bar ───
  inputContainer: {
    flexDirection: 'row-reverse', paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 12,
    backgroundColor: C.white, alignItems: 'flex-end', gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 8 },
    }),
  },
  inputContainerDisabled: { backgroundColor: '#FAFAFA' },
  inputRow: {
    flex: 1, flexDirection: 'row-reverse',
    backgroundColor: C.inputBg, borderRadius: 22,
    alignItems: 'center', paddingHorizontal: 18, minHeight: 48,
    borderWidth: 1, borderColor: C.borderLight,
  },
  input: {
    flex: 1, fontSize: 15, color: C.textPrimary, textAlign: 'right',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    maxHeight: 120,
  },
  inputFieldDisabled: { color: '#999' },
  sendBtn: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: '#C4B07A', opacity: 0.5,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },

  // ─── Empty ───
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 34, backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },

  // ─── Modal ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '78%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.borderLight,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: C.borderLight,
  },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: C.bgMain,
    justifyContent: 'center', alignItems: 'center',
  },
  modalHeaderCenter: { flex: 1, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginTop: 2 },

  // ─── Settings Card ───
  settingCard: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bgMain, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.borderLight, marginBottom: 12,
  },
  settingCardRow: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 12 },
  settingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  settingCardInfo: { flex: 1, alignItems: 'flex-end' },
  settingCardTitle: { fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 2 },
  settingCardSub: { fontSize: 11, fontWeight: '600', color: C.textSecondary },

  // ─── Timed Mute ───
  timedMuteBtn: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
    gap: 10, marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  timedMuteIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  timedMuteText: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '700', color: C.white },

  // ─── Students ───
  studentsSectionHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 14,
  },
  studentsSectionTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, flex: 1, textAlign: 'right' },
  studentCount: {
    backgroundColor: C.softGreen, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  studentCountText: { fontSize: 12, fontWeight: '800', color: C.primary },
  studentCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: C.bgMain, borderRadius: 14,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.borderLight,
  },
  studentCardMuted: { borderColor: C.dangerSoft },
  studentAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: C.white },
  studentInfo: { flex: 1, alignItems: 'flex-end' },
  studentName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  studentMutedLabel: { fontSize: 10, fontWeight: '600', color: C.danger, marginTop: 2 },
  studentMuteBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  studentMuteBtnActive: { backgroundColor: C.danger },
  studentUnmuteBtn: { backgroundColor: C.softGreen },
  studentMuteBtnText: { fontSize: 12, fontWeight: '700', color: C.white },
});
