import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

const C = {
  bgTop: '#0B2923',
  bgMain: '#F4F7F6',
  white: '#FFFFFF',
  textDark: '#111A18',
  textSecondary: '#8A9592',
  borderLight: '#E8EDEC',
  primary: '#12453D',
};

type Contact = {
  id: string;
  name: string;
  email: string;
  unreadCount?: number;
};

export default function ChatList() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen for unread messages
    const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const map: Record<string, number> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const otherParticipant = data.participants.find((p: string) => p !== user.uid);
        const unread = data[`unreadCount_${user.uid}`] || 0;
        if (otherParticipant && unread > 0) {
          map[otherParticipant] = unread;
        }
      });
      setUnreadMap(map);
    }, (error) => {
      console.error("Error fetching chats:", error);
    });

    const determineRoleAndFetchContacts = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
        const isTeacher = teacherDoc.exists();
        setRole(isTeacher ? 'teacher' : 'student');

        const targetCollection = isTeacher ? 'students' : 'teachers';
        const q = query(collection(db, targetCollection));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: Contact[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || data.displayName || 'بدون اسم',
              email: data.email || ''
            });
          });
          setContacts(list);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching contacts:", error);
          setLoading(false);
        });

        return () => {
          unsubscribe();
          unsubscribeChats();
        };
      } catch (error) {
        console.error("Error loading contacts:", error);
        setLoading(false);
      }
    };

    determineRoleAndFetchContacts();
  }, []);

  const openChat = (contactId: string, contactName: string) => {
    router.push({
      pathname: `/chat/[id]`,
      params: { id: contactId, name: contactName }
    });
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const unread = unreadMap[item.id] || 0;
    return (
    <TouchableOpacity style={styles.contactCard} onPress={() => openChat(item.id, item.name)}>
      {unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unread}</Text>
        </View>
      )}
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactEmail}>{item.email}</Text>
      </View>
      <View style={styles.avatar}>
        <Ionicons name="person" size={20} color={C.white} />
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المحادثات</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          {role === 'teacher' ? 'قائمة الطلاب' : 'قائمة المعلمين'}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContact}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>لا توجد جهات اتصال حتى الآن.</Text>
            }
          />
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.textDark,
    marginBottom: 16,
    textAlign: 'right'
  },
  listContainer: { paddingBottom: 20 },
  contactCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactInfo: {
    marginRight: 12,
    alignItems: 'flex-end',
    flex: 1
  },
  contactName: { fontSize: 16, fontWeight: 'bold', color: C.textDark, marginBottom: 4 },
  contactEmail: { fontSize: 12, color: C.textSecondary },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    left: 16,
  },
  unreadText: {
    color: C.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: C.textSecondary,
    marginTop: 40,
    fontSize: 14
  }
});
