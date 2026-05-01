import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    I18nManager,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { auth, db } from "../../firebase";
import {
  filterTeachersForStudent,
  getTeacherIdentityIds,
  normalizeAccessSubject,
  studentCanAccessSubject,
} from "../../utils/chatAccess";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Design Tokens (matching app palette) ────────────────────────
const C = {
  bgTop: '#0B2923',
  bgMain: '#F4F7F6',
  heroCard: '#0A1C18',
  heroDecor: '#152C26',
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
  redBadge: '#FF3B30',
};

// ─── Notification Category Config ────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  quiz:    { icon: "document-text",        color: "#E3A736", bg: "#FFF8E8", label: "اختبار جديد" },
  grade:   { icon: "school",               color: "#34C759", bg: "#E6F9ED", label: "تم التقييم" },
  lecture: { icon: "play-circle",          color: "#007AFF", bg: "#E5F0FF", label: "محاضرة جديدة" },
  chat:    { icon: "chatbubble-ellipses",  color: "#AF52DE", bg: "#F5E6FF", label: "رسالة المعلم" },
  group:   { icon: "people",              color: "#FF6B35", bg: "#FFF0E8", label: "رسالة المجموعة" },
};

const FILTER_TABS = [
  { key: "all",     label: "الكل",       icon: "apps" },
  { key: "quiz",    label: "اختبارات",    icon: "document-text-outline" },
  { key: "grade",   label: "درجات",      icon: "school-outline" },
  { key: "lecture", label: "محاضرات",     icon: "play-circle-outline" },
  { key: "chat",    label: "رسائل",       icon: "chatbubbles-outline" },
];

type NotifCategory = "quiz" | "grade" | "lecture" | "chat" | "group";

type AppNotification = {
  id: string;
  title: string;
  subtitle: string;
  category: NotifCategory;
  status: "unread" | "read";
  date: string;
  timestamp: number;
  routeObj: any;
  teacherId?: string;
};

const getNotificationRoute = (item: AppNotification) => {
  return item.routeObj || "/(tabs)/notifications";
};

const getAdminNotificationRoute = (data: any) => {
  const route = typeof data.route === "string" ? data.route : "";
  const lectureId = typeof data.lectureId === "string" ? data.lectureId : "";
  const quizId = typeof data.quizId === "string" ? data.quizId : "";
  const chatUserId = typeof data.chatUserId === "string" ? data.chatUserId : "";
  const groupId = typeof data.groupId === "string" ? data.groupId : "";

  if (lectureId) return { pathname: "/video/[id]", params: { id: lectureId } };
  if (quizId) return { pathname: "/quiz/[id]", params: { id: quizId } };
  if (chatUserId) return { pathname: "/chat/[id]", params: { id: chatUserId, name: data.chatName || "رسائل" } };
  if (groupId) return { pathname: "/group/[id]", params: { id: groupId, name: data.groupName || "مجموعة النقاش" } };
  if (route === "lectures") return "/(tabs)/lectures";
  if (route === "quizzes") return "/(tabs)/quizzes";
  if (route === "subjects") return "/(tabs)/subjects";
  return "/(tabs)/notifications";
};

const PUSH_DIAG_PREFIX = "[PushDiag][NotificationsTab]";
const logPush = (event: string, data?: unknown) => {
  if (data === undefined) {
    console.log(`${PUSH_DIAG_PREFIX} ${event}`);
    return;
  }
  console.log(`${PUSH_DIAG_PREFIX} ${event}`, data);
};

const logPushError = (event: string, error: unknown) => {
  console.error(`${PUSH_DIAG_PREFIX} ${event}`, error);
};

function formatTime(ts: number) {
  if (!ts) return "الآن";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 7)} أسبوع`;
}

// ─── Header Decorative Circles ───────────────────────────────────
const HeaderDecorations = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [float1, float2]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -80, right: -80,
        backgroundColor: 'rgba(255,255,255,0.04)',
        transform: [{ translateY: float1.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 200, height: 200, borderRadius: 100, top: 100, left: -60,
        backgroundColor: 'rgba(255,255,255,0.03)',
        transform: [{ translateY: float2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
      }} />
    </View>
  );
};

// ─── Animated Notification Card ──────────────────────────────────
function AnimatedNotificationCard({
  item,
  index,
  onPress,
}: {
  item: AppNotification;
  index: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index * 80, 500) + 100,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.96, friction: 8, tension: 150, useNativeDriver: true }).start();
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  }, [pressScale]);

  const isUnread = item.status === "unread";
  const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.chat;

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: pressScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Color accent strip */}
        <View style={[styles.cardStrip, { backgroundColor: cfg.color }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            {/* Icon */}
            <View style={[styles.cardIconBox, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <View style={[styles.categoryPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.categoryPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {isUnread && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
              </View>
              <Text style={[styles.cardTitle, isUnread && { color: C.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.cardFooter}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time-outline" size={12} color={C.textSecondary} />
                  <Text style={styles.timeText}>{item.date}</Text>
                </View>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.cardChevron}>
          <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Filter Tab Pill ─────────────────────────────────────────────
function FilterPill({
  tab,
  isActive,
  onPress,
  count,
}: {
  tab: typeof FILTER_TABS[0];
  isActive: boolean;
  onPress: () => void;
  count: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.filterPill,
          isActive ? styles.filterPillActive : styles.filterPillInactive,
        ]}
        onPress={handlePress}
      >
        <Ionicons
          name={tab.icon as any}
          size={16}
          color={isActive ? C.white : C.textSecondary}
        />
        <Text style={[styles.filterText, isActive ? styles.filterTextActive : styles.filterTextInactive]}>
          {tab.label}
        </Text>
        {count > 0 && (
          <View style={[styles.filterBadge, isActive ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: C.borderLight }]}>
            <Text style={[styles.filterBadgeText, isActive && { color: C.white }]}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.emptyState}>
      <Animated.View style={[styles.emptyIconWrap, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="notifications-off-outline" size={44} color={C.primarySoft} />
        </View>
      </Animated.View>
      <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
      <Text style={styles.emptyText}>ستظهر الإشعارات هنا عند وصول اختبارات{'\n'}أو محاضرات أو رسائل جديدة</Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════
export default function NotificationsScreen() {
  const router = useRouter();
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
  }, [headerAnim]);

  useEffect(() => {
    const user = auth.currentUser;
    logPush("effect_started", {
      hasUser: Boolean(user),
      uid: user?.uid ?? null,
    });

    if (!user) {
      logPush("no_user_loading_false");
      setLoading(false);
      return;
    }

    let items: Record<string, AppNotification> = {};

    const updateItems = () => {
      const next = Object.values(items).sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(next);
      logPush("items_updated", { count: next.length });
    };

    let currentStudent: any = null;
    let studentCreatedAt = 0;
    let allTeachers: any[] = [];
    let visibleTeachers: any[] = [];
    let visibleTeacherIds = new Set<string>();
    let studentLoaded = false;
    let teachersLoaded = false;
    let accessReady = false;
    let chatDocs: { id: string; data: any }[] = [];
    let lectureDocs: { id: string; data: any }[] = [];
    let quizDocs: { id: string; data: any }[] = [];
    let groupMessageUnsubs: (() => void)[] = [];

    const clearItemsByPrefix = (prefix: string) => {
      Object.keys(items).forEach((key) => {
        if (key.startsWith(prefix)) delete items[key];
      });
    };

    const unsubscribeGroupMessages = () => {
      groupMessageUnsubs.forEach((unsub) => unsub());
      groupMessageUnsubs = [];
    };

    const isVisibleContentForStudent = (data: any) => {
      if (!accessReady || !currentStudent) return false;

      const teacherId = typeof data.teacherId === "string" ? data.teacherId : "";
      if (teacherId && visibleTeacherIds.has(teacherId)) return true;

      const contentSubject = data.subject || data.course || "";
      if (studentCanAccessSubject(currentStudent, contentSubject)) return true;

      const normalizedSubject = normalizeAccessSubject(contentSubject);
      return normalizedSubject.length > 0 && visibleTeachers.some((teacher) => {
        return normalizeAccessSubject(teacher.subject) === normalizedSubject;
      });
    };

    const processLectures = () => {
      clearItemsByPrefix("lec_");
      if (!accessReady) {
        updateItems();
        return;
      }

      lectureDocs.forEach(({ id: lectureId, data }) => {
        if ((data.status === "active" || data.status === "accepted") && isVisibleContentForStudent(data)) {
          const ts = data.createdAt?.toMillis?.() || Date.now();
          if (studentCreatedAt && ts < studentCreatedAt) return;
          items[`lec_${lectureId}`] = {
            id: `lec_${lectureId}`,
            title: data.title || "تمت إضافة محاضرة جديدة",
            subtitle: data.subject || "محاضرة جديدة",
            category: "lecture",
            status: "unread",
            timestamp: ts,
            date: formatTime(ts),
            routeObj: { pathname: "/video/[id]", params: { id: lectureId } }
          };
        }
      });
      updateItems();
    };

    const processQuizzes = () => {
      clearItemsByPrefix("qz_");
      if (!accessReady) {
        updateItems();
        return;
      }

      quizDocs.forEach(({ id: quizId, data }) => {
        if ((data.status === "active" || data.status === "accepted") && isVisibleContentForStudent(data)) {
          const ts = data.createdAt?.toMillis?.() || Date.now();
          if (studentCreatedAt && ts < studentCreatedAt) return;
          items[`qz_${quizId}`] = {
            id: `qz_${quizId}`,
            title: data.title || "تمت إضافة اختبار جديد لك",
            subtitle: data.subject || "اختبار متاح",
            category: "quiz",
            status: "unread",
            timestamp: ts,
            date: formatTime(ts),
            routeObj: { pathname: "/quiz/[id]", params: { id: quizId } }
          };
        }
      });
      updateItems();
    };

    const processChats = () => {
      clearItemsByPrefix("chat_");
      if (!accessReady) {
        updateItems();
        return;
      }

      chatDocs.forEach(({ id: chatId, data }) => {
        const participants = Array.isArray(data.participants)
          ? data.participants.filter((participant: unknown): participant is string => typeof participant === "string")
          : [];
        if (!participants.includes(user.uid) || participants.length !== 2) return;

        const otherParticipant = participants.find((p: string) => p !== user.uid);
        const unread = data[`unreadCount_${user.uid}`] || 0;
        const lastSenderId = typeof data.lastSenderId === "string" ? data.lastSenderId : "";
        const lastRecipientId = typeof data.lastRecipientId === "string" ? data.lastRecipientId : "";
        if (lastSenderId === user.uid) return;
        if (lastRecipientId && lastRecipientId !== user.uid) return;
        if (!otherParticipant || !visibleTeacherIds.has(otherParticipant) || unread <= 0) return;

        const ts = data.updatedAt?.toMillis?.() || data.lastMessageTime?.toMillis?.() || Date.now();
        if (studentCreatedAt && ts < studentCreatedAt) return;
        items[`chat_${chatId}`] = {
          id: `chat_${chatId}`,
          title: `لديك ${unread} رسالة غير مقروءة`,
          subtitle: "محادثة مع المعلم",
          category: "chat",
          status: "unread",
          timestamp: ts,
          date: formatTime(ts),
          routeObj: { pathname: "/chat/[id]", params: { id: otherParticipant, name: "رسائل" } },
          teacherId: otherParticipant,
        };
      });
      updateItems();
    };

    const subscribeVisibleGroups = () => {
      unsubscribeGroupMessages();
      clearItemsByPrefix("grp_");

      if (!accessReady) {
        updateItems();
        return;
      }

      visibleTeachers.forEach((teacher) => {
        const teacherId = teacher.id;
        const groupKey = `grp_${teacherId}`;
        const groupRef = collection(db, "groups", teacherId, "group_messages");
        const unsub = onSnapshot(query(groupRef, orderBy("createdAt", "desc"), limit(1)), (msgSnap) => {
          logPush("snapshot_group_latest_message", { groupId: teacherId, size: msgSnap.size });
          if (msgSnap.empty) {
            delete items[groupKey];
            updateItems();
            return;
          }

          const msgData = msgSnap.docs[0].data();
          const ts = msgData.createdAt?.toMillis?.() || Date.now();
          const isRecent = (Date.now() - ts) < 86400000;
          const isAfterAccountCreation = !studentCreatedAt || ts >= studentCreatedAt;

          if (msgData.senderId !== user.uid && isRecent && isAfterAccountCreation) {
            items[groupKey] = {
              id: groupKey,
              title: `رسالة جديدة في مجموعة ${teacher.name || 'النقاش'}`,
              subtitle: msgData.text?.substring(0, 50) || "رسالة جديدة",
              category: "group",
              status: "unread",
              timestamp: ts,
              date: formatTime(ts),
              routeObj: { pathname: "/group/[id]", params: { id: teacherId, name: `مجموعة ${teacher.name}` } },
              teacherId,
            };
          } else {
            delete items[groupKey];
          }
          updateItems();
        });
        groupMessageUnsubs.push(unsub);
      });

      updateItems();
    };

    const syncAccess = () => {
      if (!studentLoaded || !teachersLoaded) return;

      visibleTeachers = currentStudent ? filterTeachersForStudent(allTeachers, currentStudent) : [];
      visibleTeacherIds = new Set<string>();
      visibleTeachers.forEach((teacher) => {
        getTeacherIdentityIds(teacher).forEach((id) => visibleTeacherIds.add(id));
      });
      accessReady = true;
      processChats();
      processLectures();
      processQuizzes();
      subscribeVisibleGroups();
    };

    const unsubStudentAccess = onSnapshot(doc(db, "students", user.uid), (snap) => {
      studentLoaded = true;
      currentStudent = snap.exists() ? { id: snap.id, uid: snap.id, ...snap.data() } : null;
      if (currentStudent?.createdAt) {
        const ca = currentStudent.createdAt;
        studentCreatedAt = typeof ca === "string" ? new Date(ca).getTime() : (ca?.toMillis?.() || 0);
      }
      syncAccess();
    }, (error) => {
      if (error?.code === "permission-denied") return;
    });

    const unsubTeachersAccess = onSnapshot(collection(db, "teachers"), (snap) => {
      teachersLoaded = true;
      allTeachers = snap.docs.map((teacherDoc) => ({ id: teacherDoc.id, uid: teacherDoc.id, ...teacherDoc.data() }));
      logPush("snapshot_teachers_for_groups", { size: snap.size });
      syncAccess();
    });

    // 1. Teacher Chats (Direct Messages)
    const unsubChats = onSnapshot(query(collection(db, "chats"), where("participants", "array-contains", user.uid)), (snap) => {
      logPush("snapshot_chats", { size: snap.size });
      chatDocs = snap.docs.map((chatDoc) => ({ id: chatDoc.id, data: chatDoc.data() }));
      processChats();
    });

    // 2. Group Messages are subscribed through syncAccess so only visible teachers are watched.
    const unsubGroups = () => undefined;

    // 3. Lectures
    const unsubLectures = onSnapshot(query(collection(db, "lectures"), orderBy("createdAt", "desc"), limit(10)), (snap) => {
      logPush("snapshot_lectures", { size: snap.size });
      lectureDocs = snap.docs.map((lectureDoc) => ({ id: lectureDoc.id, data: lectureDoc.data() }));
      processLectures();
    });

    // 4. Quizzes
    const unsubQuizzes = onSnapshot(query(collection(db, "quizzes"), orderBy("createdAt", "desc"), limit(10)), (snap) => {
      logPush("snapshot_quizzes", { size: snap.size });
      quizDocs = snap.docs.map((quizDoc) => ({ id: quizDoc.id, data: quizDoc.data() }));
      processQuizzes();
    });

    // 5. Graded Submissions
    const unsubGrades = onSnapshot(query(collection(db, "quiz_submissions"), where("studentId", "==", user.uid)), (snap) => {
      logPush("snapshot_graded_submissions", { size: snap.size });
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.graded) {
          const ts = data.createdAt?.toMillis() || Date.now();
          if (studentCreatedAt && ts < studentCreatedAt) return;
          items[`grd_${doc.id}`] = {
            id: `grd_${doc.id}`,
            title: `تم تقييمك بدرجة: ${data.score}`,
            subtitle: data.quizTitle || "نتيجة اختبار",
            category: "grade",
            status: "unread",
            timestamp: ts,
            date: formatTime(ts),
            routeObj: { pathname: "/quiz/[id]", params: { id: data.quizId } }
          };
        }
      });
      updateItems();
      setLoading(false);
    }, (error) => {
      if (error?.code === "permission-denied") return;
    });

    // 6. Admin broadcast notifications (sent from dashboard)
    const unsubAdmin = onSnapshot(
      query(collection(db, "admin_notifications"), orderBy("createdAt", "desc"), limit(20)),
      (snap) => {
        logPush("snapshot_admin_notifications", { size: snap.size });
        let acceptedCount = 0;
        let loggedCount = 0;

        snap.forEach((doc) => {
          const data = doc.data();
          const isTargeted = data.target === "all" || data.target === "students";
          if (!isTargeted) {
            return;
          }

          const ts = data.createdAt?.toMillis?.() || Date.now();
          if (studentCreatedAt && ts < studentCreatedAt) return;

          acceptedCount += 1;
          items[`adm_${doc.id}`] = {
            id: `adm_${doc.id}`,
            title: data.title || "Admin notification",
            subtitle: data.body || "",
            category: "chat" as NotifCategory,
            status: "unread",
            timestamp: ts,
            date: formatTime(ts),
            routeObj: getAdminNotificationRoute(data)
          };

          if (loggedCount < 5) {
            logPush("snapshot_admin_notification_item", {
              id: doc.id,
              target: data.target ?? null,
              title: data.title ?? null,
              createdAtType: data.createdAt?.constructor?.name ?? typeof data.createdAt,
              timestamp: ts,
            });
            loggedCount += 1;
          }
        });

        logPush("snapshot_admin_notifications_processed", { acceptedCount });
        updateItems();
      },
      (error) => {
        if (error?.code === "permission-denied") return;
        logPushError("snapshot_admin_notifications_error", error);
      }
    );

    return () => {
      logPush("effect_cleanup");
      unsubStudentAccess();
      unsubTeachersAccess();
      unsubscribeGroupMessages();
      unsubChats();
      unsubGroups();
      unsubLectures();
      unsubQuizzes();
      unsubGrades();
      unsubAdmin();
    };
  }, []);

  // ─── Filtering ─────────────────────────────────────────────────
  const filteredNotifications = activeFilter === "all"
    ? notifications
    : activeFilter === "chat"
      ? notifications.filter(n => n.category === "chat" || n.category === "group")
      : notifications.filter(n => n.category === activeFilter);

  // Count per filter (for badges)
  const countFor = (key: string) => {
    if (key === "all") return notifications.length;
    if (key === "chat") return notifications.filter(n => n.category === "chat" || n.category === "group").length;
    return notifications.filter(n => n.category === key).length;
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgTop} />

      {/* Background */}
      <View style={styles.topBgLayer}>
        <HeaderDecorations />
      </View>
      <View style={styles.topBgGlow} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E3A736" colors={["#E3A736"]} />}
        >

          {/* ─── Header ─── */}
          <Animated.View style={[styles.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }],
          }]}>
            <BackButton />

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerSubtitle}>ابق على اطلاع بكل جديد</Text>
              <Text style={styles.headerTitle}>إشعاراتي</Text>
            </View>
          </Animated.View>

          {/* ─── Stats Summary ─── */}
          <Animated.View style={[styles.statsRow, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }]}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{notifications.length}</Text>
              <Text style={styles.statLabel}>إجمالي</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: C.accent }]}>
                {notifications.filter(n => n.status === "unread").length}
              </Text>
              <Text style={styles.statLabel}>غير مقروء</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#34C759' }]}>
                {notifications.filter(n => n.category === "grade").length}
              </Text>
              <Text style={styles.statLabel}>درجات</Text>
            </View>
          </Animated.View>

          {/* ─── Filter Tabs ─── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {[...FILTER_TABS].reverse().map(tab => (
              <FilterPill
                key={tab.key}
                tab={tab}
                isActive={activeFilter === tab.key}
                onPress={() => setActiveFilter(tab.key)}
                count={countFor(tab.key)}
              />
            ))}
          </ScrollView>

          {/* ─── Content ─── */}
          <View style={styles.content}>
            <View style={styles.sectionRow}>
              <Ionicons name="notifications" size={16} color={C.textPrimary} />
              <Text style={styles.sectionTitle}>
                {activeFilter === "all" ? "جميع الإشعارات" :
                 FILTER_TABS.find(t => t.key === activeFilter)?.label || "الإشعارات"}
              </Text>
              <Text style={styles.sectionCount}>{filteredNotifications.length}</Text>
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>جاري تحميل الإشعارات...</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState />
            ) : (
              filteredNotifications.map((item, idx) => (
                <AnimatedNotificationCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onPress={() => router.push(getNotificationRoute(item) as any)}
                />
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgMain },
  topBgLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 310,
    backgroundColor: C.bgTop,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  topBgGlow: {
    position: 'absolute', top: -40, right: -20,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#123B34', opacity: 0.55,
  },

  scrollContent: { paddingTop: 10 },

  // ─── Header ───
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 12,
  },
  headerTitleContainer: { alignItems: 'flex-end' },
  headerSubtitle: { fontSize: 12, color: '#97AEA9', marginBottom: 3, fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.white, letterSpacing: 0.3 },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.white, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },

  // ─── Filter ───
  filterScroll: { marginBottom: 4 },
  filterRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 20, gap: 8, paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
  },
  filterPillActive: {
    backgroundColor: C.primary,
  },
  filterPillInactive: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.borderLight,
  },
  filterText: { fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: C.white },
  filterTextInactive: { color: C.textSecondary },
  filterBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: C.textSecondary },

  // ─── Content ───
  content: {
    backgroundColor: C.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 6,
    minHeight: 300,
  },

  // ─── Section ───
  sectionRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    marginTop: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, flex: 1, textAlign: 'right' },
  sectionCount: { fontSize: 13, fontWeight: '700', color: C.textSecondary },

  // ─── Card ───
  cardOuter: { width: '100%', marginBottom: 12 },
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },
  cardStrip: { width: 4 },
  cardBody: { flex: 1, padding: 14, paddingRight: 14 },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  cardContent: { flex: 1, alignItems: 'flex-end' },
  cardTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  categoryPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  categoryPillText: { fontSize: 10, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: {
    fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 8,
    lineHeight: 22, textAlign: 'right',
  },
  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, width: '100%' },
  timeBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    backgroundColor: C.softGreen, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  timeText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  cardSubtitle: { fontSize: 11, fontWeight: '600', color: C.textSecondary, flex: 1, textAlign: 'right' },
  cardChevron: {
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
  },

  // ─── Empty ───
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: C.softGreen,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyIconInner: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textSecondary, fontWeight: '600', textAlign: 'center', lineHeight: 20 },

  // ─── Loading ───
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
});
