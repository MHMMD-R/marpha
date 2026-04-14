import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase";

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
  danger: "#FF3B30",
  heroCard: "#0A1C18",
  heroDecor: "#152C26",
  softGreen: "#EEF5F3",
};

type Contact = {
  id: string;
  name: string;
  email: string;
  image?: string;
  unreadCount?: number;
};

type ChatMeta = {
  lastMessage?: string;
  updatedAt?: any;
  unreadCount: number;
};

export default function ChatList() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chatMetaMap, setChatMetaMap] = useState<Record<string, ChatMeta>>({});
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen for chat metadata (unread counts + last messages)
    const qChats = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
    );
    const unsubscribeChats = onSnapshot(
      qChats,
      (snapshot) => {
        const map: Record<string, ChatMeta> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const otherParticipant = data.participants.find(
            (p: string) => p !== user.uid,
          );
          const unread = data[`unreadCount_${user.uid}`] || 0;
          if (otherParticipant) {
            map[otherParticipant] = {
              lastMessage: data.lastMessage || "",
              updatedAt: data.updatedAt,
              unreadCount: unread,
            };
          }
        });
        setChatMetaMap(map);
      },
      (error) => {
        console.error("Error fetching chats:", error);
      },
    );

    const determineRoleAndFetchContacts = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
        const isTeacher = teacherDoc.exists();
        setRole(isTeacher ? "teacher" : "student");

        const targetCollection = isTeacher ? "students" : "teachers";
        const q = query(collection(db, targetCollection));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: Contact[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                name: data.name || data.displayName || "بدون اسم",
                email: data.email || "",
                image: data.image || "",
              });
            });
            setContacts(list);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching contacts:", error);
            setLoading(false);
          },
        );

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

  const openChat = (
    contactId: string,
    contactName: string,
    contactImage?: string,
  ) => {
    router.push({
      pathname: `/chat/[id]`,
      params: { id: contactId, name: contactName, image: contactImage },
    });
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort contacts: those with unread messages first, then by last activity
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    const aUnread = chatMetaMap[a.id]?.unreadCount || 0;
    const bUnread = chatMetaMap[b.id]?.unreadCount || 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    return 0;
  });

  const renderContact = ({ item, index }: { item: Contact; index: number }) => {
    const meta = chatMetaMap[item.id];
    const unread = meta?.unreadCount || 0;
    const lastMessage = meta?.lastMessage || "";

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => openChat(item.id, item.name, item.image)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.image ? (
            <Image style={styles.avatar} source={{ uri: item.image }} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {item.name?.charAt(0) || "؟"}
              </Text>
            </View>
          )}
          {/* Online dot decoration */}
          <View style={styles.onlineDot} />
        </View>

        {/* Info */}
        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </View>

          <Text style={styles.contactPreview} numberOfLines={1}>
            {lastMessage || item.email}
          </Text>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-back" size={18} color={C.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Background layers */}
      <View style={styles.topBgLayer} />
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={22} color={C.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>
              {role === "teacher" ? "تواصل مع طلابك" : "تواصل مع معلميك"}
            </Text>
            <Text style={styles.headerTitle}>المحادثات</Text>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statPill}>
            <Ionicons name="people" size={14} color={C.accent} />
            <Text style={styles.statPillText}>{contacts.length} جهة اتصال</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="chatbubble-ellipses" size={14} color="#2FD67C" />
            <Text style={styles.statPillText}>
              {Object.values(chatMetaMap).filter((m) => m.unreadCount > 0).length} غير مقروءة
            </Text>
          </View>
        </View>

        {/* Content area with rounded top */}
        <View style={styles.content}>
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={C.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن محادثة..."
              placeholderTextColor={C.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section label */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {role === "teacher" ? "قائمة الطلاب" : "قائمة المعلمين"}
            </Text>
            <View style={styles.sectionDivider} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>جاري تحميل المحادثات...</Text>
            </View>
          ) : (
            <FlatList
              data={sortedContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContact}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={48}
                      color={C.textSecondary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>لا توجد محادثات</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "لا توجد نتائج مطابقة لبحثك"
                      : "لا توجد جهات اتصال حتى الآن"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
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
    height: 280,
    backgroundColor: C.topOverlay,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topBgGlow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.topOverlaySoft,
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "flex-end",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#97AEA9",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.white,
  },
  statsBar: {
    flexDirection: "row-reverse",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  content: {
    flex: 1,
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  searchContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: C.white,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textPrimary,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: C.borderLight,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  contactCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.borderLight,
  },
  avatarPlaceholder: {
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    borderColor: C.primarySoft,
  },
  avatarInitial: {
    color: C.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2FD67C",
    borderWidth: 2.5,
    borderColor: C.white,
  },
  contactInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  contactRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  contactPreview: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "right",
    width: "100%",
  },
  unreadBadge: {
    backgroundColor: C.danger,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.softGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: C.softGreen,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
