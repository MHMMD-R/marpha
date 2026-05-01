import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Keyboard } from 'react-native';
import { CustomAlert as Alert } from '@/components/CustomAlert';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { auth, db } from "../../firebase";

const C = {
  bgMain: "#F4F7F6",
  topOverlay: "#0B2923",
  topOverlaySoft: "#123B34",
  primary: "#12453D",
  primarySoft: "#2E5E55",
  accent: "#E3A736",
  white: "#FFFFFF",
  textPrimary: "#10241F",
  textSecondary: "#8A9E99",
  borderLight: "#E8EDEC",
  softGreen: "#EEF5F3",
  msgSenderBg: "#12453D",
  msgReceiverBg: "#FFFFFF",
  inputBg: "#F0F4F2",
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
};

export default function ChatScreen() {
  const router = useRouter();
  const { id, name, image } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const currentUser = auth.currentUser;
  const sendScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

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

  const getChatId = () => {
    if (!currentUser) return "";
    const ids = [currentUser.uid, id as string];
    ids.sort();
    return ids.join("_");
  };

  useEffect(() => {
    if (!currentUser) return;
    const chatId = getChatId();
    if (!chatId) return;

    const markAsRead = async () => {
      try {
        await setDoc(
          doc(db, "chats", chatId),
          {
            [`unreadCount_${currentUser.uid}`]: 0,
            participants: [currentUser.uid, id as string],
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Error resetting unread:", err);
      }
    };
    markAsRead();

    // Listen to messages
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
        });
        setMessages(msgs);
        setLoading(false);
        if (msgs.length > 0) markAsRead();
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser, id]);

  const animateSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(sendScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(3)),
      }),
    ]).start();
  };

  const sendMessage = async () => {
    if (!currentUser) return;
    const textToSend = inputText.trim();
    if (!textToSend) return;
    setInputText("");
    animateSend();

    const chatId = getChatId();
    if (!chatId) return;
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: textToSend,
      senderId: currentUser.uid,
      recipientId: id as string,
      createdAt: new Date().getTime(),
    });

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants: [currentUser.uid, id as string],
        [`unreadCount_${id}`]: increment(1),
        lastMessage: textToSend,
        lastSenderId: currentUser.uid,
        lastRecipientId: id as string,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const formatTime = (time: any) => {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (time: any) => {
    const date = new Date(time);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "اليوم";
    if (date.toDateString() === yesterday.toDateString()) return "أمس";
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
    });
  };

  const handleReportUser = () => {
    Alert.alert(
      "الإبلاغ",
      `هل أنت متأكد من أنك تريد الإبلاغ عن ${name}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ",
          style: "destructive",
          onPress: async () => {
            try {
              await addDoc(collection(db, "reports"), {
                reportedBy: currentUser?.uid,
                reportedUserId: id,
                type: "user",
                createdAt: serverTimestamp(),
              });
              Alert.alert("تم", "تم إرسال البلاغ بنجاح. سنقوم بمراجعة الأمر.");
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء إرسال البلاغ.");
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(
      "حظر المستخدم",
      `هل أنت متأكد من أنك تريد حظر ${name}؟ لن يتمكن من التواصل معك مجدداً.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حظر",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(db, `users/${currentUser?.uid}/blocked`, id as string), {
                blockedAt: serverTimestamp(),
              });
              Alert.alert("تم", "تم حظر المستخدم بنجاح.");
              router.back(); // Exit chat after blocking
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء حظر المستخدم.");
            }
          },
        },
      ]
    );
  };

  const handleOptionsPress = () => {
    Alert.alert(
      "خيارات",
      "ماذا تريد أن تفعل؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "الإبلاغ عن المستخدم", onPress: handleReportUser },
        { text: "حظر المستخدم", style: "destructive", onPress: handleBlockUser },
      ]
    );
  };

  const handleReportMessage = (message: Message) => {
    Alert.alert(
      "الإبلاغ عن رسالة",
      "هل تريد الإبلاغ عن هذه الرسالة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ",
          style: "destructive",
          onPress: async () => {
            try {
              await addDoc(collection(db, "reports"), {
                reportedBy: currentUser?.uid,
                reportedUserId: message.senderId,
                messageId: message.id,
                messageText: message.text,
                type: "message",
                createdAt: serverTimestamp(),
              });
              Alert.alert("تم", "تم الإبلاغ عن الرسالة بنجاح.");
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء إرسال البلاغ.");
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === currentUser?.uid;

    // Show date separator
    const currentDate = new Date(item.createdAt).toDateString();
    const nextItem = messages[index + 1];
    const nextDate = nextItem
      ? new Date(nextItem.createdAt).toDateString()
      : null;
    const showDateSeparator = !nextDate || currentDate !== nextDate;

    return (
      <>
        <TouchableOpacity
          style={[
            styles.msgWrapper,
            isMe ? styles.msgWrapperMe : styles.msgWrapperOther,
          ]}
          onLongPress={() => !isMe && handleReportMessage(item)}
          activeOpacity={isMe ? 1 : 0.85}
          delayLongPress={250}
        >
          {/* Avatar for other person */}
          {!isMe && (
            <View style={styles.msgAvatarContainer}>
              {image ? (
                <Image
                  source={{ uri: image as string }}
                  style={styles.msgAvatar}
                />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
                  <Text style={styles.msgAvatarText}>
                    {(name as string)?.charAt(0) || "؟"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.msgBubble,
              isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
            ]}
          >
            {!isMe && (
              <Text style={styles.msgSenderName}>{name}</Text>
            )}
            <Text
              style={[
                styles.msgText,
                isMe ? styles.msgTextMe : styles.msgTextOther,
              ]}
            >
              {item.text}
            </Text>
            <View style={styles.msgFooter}>
              {isMe && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color="rgba(255,255,255,0.5)"
                  style={{ marginLeft: 4 }}
                />
              )}
              <Text
                style={[
                  styles.msgTime,
                  isMe && { color: "rgba(255,255,255,0.55)" },
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.createdAt)}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Background layers */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <KeyboardAvoidingView
        style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          {/* ─── Header ─── */}
          <View style={styles.header}>
            <BackButton />

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.headerOnlineRow}>
                <View style={styles.headerOnlineDot} />
                <Text style={styles.headerOnlineText}>متصل الآن</Text>
              </View>
            </View>

            <View style={styles.headerAvatarWrap}>
              {image ? (
                <Image
                  source={{ uri: image as string }}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}
                >
                  <Ionicons name="person" size={22} color={C.white} />
                </View>
              )}
              <View style={styles.headerAvatarRing} />
            </View>

            <TouchableOpacity
              style={styles.optionsButton}
              onPress={handleOptionsPress}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ─── Chat Content ─── */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>جاري تحميل الرسائل...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={52}
                    color={C.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>ابدأ المحادثة</Text>
                <Text style={styles.emptyText}>
                  أرسل رسالتك الأولى إلى {name}
                </Text>
              </View>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted={true}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            )}

            {/* ─── Input Bar ─── */}
            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="اكتب رسالتك..."
                  placeholderTextColor="#9FABA7"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  textAlign="right"
                />
              </View>
              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !inputText.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={
                      inputText.trim() ? C.white : "rgba(255,255,255,0.35)"
                    }
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: C.bgMain,
  },
  topBgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: C.topOverlay,
  },
  topBgGlow: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.topOverlaySoft,
    opacity: 0.5,
  },

  // ─── Header ───
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },
  headerAvatarWrap: {
    position: "relative",
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerAvatarPlaceholder: {
    backgroundColor: C.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.accent,
    opacity: 0.4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 3,
  },
  headerOnlineRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  headerOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2FD67C",
  },
  headerOnlineText: {
    fontSize: 12,
    color: "#97AEA9",
    fontWeight: "600",
  },
  optionsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  // ─── Content ───
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 34,
    backgroundColor: C.softGreen,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.textPrimary,
  },
  emptyText: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // ─── Messages ───
  msgWrapper: {
    marginVertical: 3,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  msgWrapperMe: { justifyContent: "flex-end" },
  msgWrapperOther: { justifyContent: "flex-start" },
  msgAvatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
  },
  msgAvatarPlaceholder: {
    backgroundColor: C.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  msgAvatarText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  msgBubble: {
    maxWidth: "78%",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  msgBubbleMe: {
    backgroundColor: C.msgSenderBg,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  msgBubbleOther: {
    backgroundColor: C.msgReceiverBg,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  msgSenderName: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "800",
    marginBottom: 3,
    textAlign: "right",
  },
  msgText: {
    fontSize: 15,
    lineHeight: 23,
  },
  msgTextMe: { color: C.white, textAlign: "right" },
  msgTextOther: { color: C.textPrimary, textAlign: "right" },
  msgFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 3,
    gap: 2,
  },
  msgTime: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // ─── Date Separator ───
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.borderLight,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.softGreen,
    borderRadius: 10,
    overflow: "hidden",
  },

  // ─── Input Bar ───
  inputContainer: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: C.white,
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: -3 },
      },
      android: { elevation: 8 },
    }),
  },
  inputRow: {
    flex: 1,
    flexDirection: "row-reverse",
    backgroundColor: C.inputBg,
    borderRadius: 22,
    alignItems: "center",
    paddingHorizontal: 18,
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
    textAlign: "right",
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: "#C4B07A",
    opacity: 0.5,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
});
