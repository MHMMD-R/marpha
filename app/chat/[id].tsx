import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';

const C = {
  bgTop: '#0B2923',
  bgMain: '#F4F7F6',
  white: '#FFFFFF',
  textDark: '#111A18',
  textSecondary: '#8A9592',
  borderLight: '#E8EDEC',
  primary: '#12453D',
  accent: '#E3A736',
  msgSenderBg: '#D5ECD6',
  msgReceiverBg: '#FFFFFF',
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
};

export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  const getChatId = () => {
    if (!currentUser) return '';
    // Chat ID will be the combination of both UIDs to ensure uniqueness
    const ids = [currentUser.uid, id as string];
    ids.sort();
    return ids.join('_');
  };

  useEffect(() => {
    if (!currentUser || !id) return;

    const chatId = getChatId();
    
    // Mark as read when entering the chat
    const markAsRead = async () => {
      try {
        await setDoc(doc(db, 'chats', chatId), {
          [`unreadCount_${currentUser.uid}`]: 0,
          participants: [currentUser.uid, id as string]
        }, { merge: true });
      } catch (err) {
        console.error("Error resetting unread count:", err);
      }
    };
    markAsRead();

    // Listen to messages
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
      
      // Also reset unread count continuously while in this screen
      if (msgs.length > 0) {
        markAsRead();
      }
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, id]);

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;
    
    const textToSend = inputText.trim();
    setInputText('');
    
    const chatId = getChatId();
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: textToSend,
      senderId: currentUser.uid,
      createdAt: new Date().getTime()
    });
    
    // Update the parent chat document with unread count
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, id as string],
      [`unreadCount_${id}`]: increment(1),
      lastMessage: textToSend,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?.uid;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperOther]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{name}</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              inverted={true}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="اكتب رسالة..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlign="right"
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={!inputText.trim()}>
              <Ionicons name="send" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgTop },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  backButton: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center'
  },
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    flexDirection: 'column'
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  msgWrapper: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  msgWrapperMe: { justifyContent: 'flex-start' }, // Changed to flip direction visually depending on language setting
  msgWrapperOther: { justifyContent: 'flex-end' },
  msgBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  msgBubbleMe: {
    backgroundColor: C.primary,
    borderBottomLeftRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: C.white,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextMe: { color: C.white, textAlign: 'left' },
  msgTextOther: { color: C.textDark, textAlign: 'right' },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
    maxHeight: 100,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
  }
});
