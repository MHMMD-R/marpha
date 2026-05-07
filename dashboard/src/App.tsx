import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
    Bell,
    BookOpen,
    Check,
    ChevronLeft,
    Edit2,
    Edit3,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    Save,
    Search,
    Settings,
    Trash2,
    TrendingDown,
    TrendingUp,
    Users,
    Video,
    X,
    XCircle,
    Star,
    Clock,
    DollarSign,
    Smartphone,
    AlertTriangle,
} from "lucide-react";
import { GroupsPanel } from "./GroupsPanel";
import { SubscriptionsPanel } from "./SubscriptionsPanel";
import { FreeTrialsPanel } from "./FreeTrialsPanel";
import { FinancePanel } from "./FinancePanel";
import "./index.css";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { uploadToR2 } from "./r2";

const DASHBOARD_ADMIN_EMAIL = "admin@marpha.app";

// Iraqi 6th Preparatory (السادس الإعدادي) — Scientific & Literary branches
const IRAQI_SUBJECTS = [
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "اللغة الفرنسية",
  "التربية الإسلامية",
  "التاريخ",
  "الجغرافية",
  "الاقتصاد",
  "الأدب والنصوص",
  "القواعد",
  "الفلسفة وعلم النفس",
  "الحاسوب",
];

// ─── Data ───────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "لوحة التحكم", id: "dashboard" },
  { icon: Users, label: "الطلاب", id: "students" },
  { icon: Users, label: "المعلمون", id: "teachers" },
  { icon: BookOpen, label: "المواد", id: "subjects" },
  { icon: Video, label: "المحاضرات", id: "videos" },
  { icon: MessageCircle, label: "المجموعات", id: "groups" },
  { icon: Bell, label: "طلبات الرفع", id: "requests" },
  { icon: GraduationCap, label: "الاختبارات", id: "exams" },
  { icon: Star, label: "الاشتراكات", id: "subscriptions" },
  { icon: Clock, label: "الفترات التجريبية", id: "freeTrials" },
  { icon: Bell, label: "الإشعارات الذكية", id: "notifications" },
];

const NAV_ITEMS_SYSTEM = [
  { icon: Bell, label: "الإشعارات", id: "notifications" },
  { icon: DollarSign, label: "المالية", id: "finance" },
  { icon: Settings, label: "الإعدادات", id: "settings" },
];

// ─── Animation helpers ──────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

const EXPO_PUSH_PROXY_URL = "/expo-push-api/--/api/v2/push/send";
const EXPO_PUSH_DIRECT_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const PUSH_DIAG_PREFIX = "[PushDiag][Dashboard]";

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

const maskToken = (token: string) => {
  if (token.length <= 20) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
};

const ARABIC_AL_PREFIX = /^\u0627\u0644/;

const stringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
};

const normalizeAccessSubject = (value: unknown) => {
  return typeof value === "string" ? value.trim().replace(ARABIC_AL_PREFIX, "") : "";
};

const getAccessTime = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const time = new Date(value as string | number | Date).getTime();
  return Number.isNaN(time) ? null : time;
};

const isSubscriptionActive = (subscription: any) => {
  if (!subscription || subscription.type === "none") return false;
  const endTime = getAccessTime(subscription.endDate);
  return endTime === null || Date.now() < endTime;
};

const isFreeTrialActive = (freeTrial: any) => {
  if (!freeTrial?.isActive) return false;
  const endTime = getAccessTime(freeTrial.endDate);
  return endTime !== null && Date.now() < endTime;
};

const toDateValue = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDashboardDate = (value: any) => {
  const date = toDateValue(value);
  return date ? date.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "غير محدد";
};

const studentCanReceiveSubjectNotification = (student: any, subject: unknown, teachers: any[]) => {
  const subscription = student.subscription;
  const subscriptionActive = isSubscriptionActive(subscription);
  if (subscriptionActive && subscription?.type === "full") return true;

  const normalizedSubject = normalizeAccessSubject(subject);
  if (!normalizedSubject) return false;

  const allowedSubjects = new Set<string>();
  const allowedTeacherIds = new Set<string>();

  if (subscriptionActive && subscription?.type === "limited") {
    stringArray(subscription.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((item) => allowedSubjects.add(item));
    stringArray(subscription.allowedTeachers).forEach((id) => allowedTeacherIds.add(id));
  }

  if (isFreeTrialActive(student.freeTrial)) {
    stringArray(student.freeTrial?.access?.allowedSubjects).map(normalizeAccessSubject).filter(Boolean).forEach((item) => allowedSubjects.add(item));
    stringArray(student.freeTrial?.access?.allowedTeachers).forEach((id) => allowedTeacherIds.add(id));
  }

  if (allowedSubjects.has(normalizedSubject)) return true;

  return teachers.some((teacher) => {
    const teacherMatchesId = [teacher.id, teacher.uid].some((id) => typeof id === "string" && allowedTeacherIds.has(id));
    return teacherMatchesId && normalizeAccessSubject(teacher.subject) === normalizedSubject;
  });
};

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data?: Record<string, string>;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{
    message?: string;
    details?: {
      error?: string;
    };
  }>;
};

const isValidExpoPushToken = (token: unknown): token is string => {
  return typeof token === "string" && EXPO_PUSH_TOKEN_REGEX.test(token.trim());
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const postExpoPushBatch = async (url: string, messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> => {
  logPush("post_batch_start", {
    url,
    count: messages.length,
    sampleTokens: messages.slice(0, 3).map((item) => maskToken(item.to)),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  let payload: ExpoPushResponse | null = null;
  try {
    payload = (await res.json()) as ExpoPushResponse;
  } catch {
    // Keep payload null when response body is empty/non-JSON.
  }

  logPush("post_batch_response", {
    url,
    status: res.status,
    statusText: res.statusText,
    hasPayload: Boolean(payload),
    ticketsCount: payload?.data?.length ?? 0,
    errorsCount: payload?.errors?.length ?? 0,
  });

  if (!res.ok) {
    const apiMessage = payload?.data?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(apiMessage);
  }

  if (payload?.errors?.length) {
    const apiErrors = payload.errors
      .map((item) => item.details?.error || item.message || "UnknownError")
      .join(", ");
    throw new Error(apiErrors);
  }

  return payload?.data ?? [];
};

const sendExpoPushMessages = async (messages: ExpoPushMessage[]) => {
  logPush("send_start", {
    totalMessages: messages.length,
  });

  let okCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const batches = chunkArray(messages, 100);
  logPush("send_batches_prepared", { batchCount: batches.length });

  for (const [batchIndex, batch] of batches.entries()) {
    let tickets: ExpoPushTicket[] = [];
    logPush("send_batch_attempt", {
      batchIndex,
      batchSize: batch.length,
      primaryUrl: EXPO_PUSH_PROXY_URL,
    });

    try {
      tickets = await postExpoPushBatch(EXPO_PUSH_PROXY_URL, batch);
      logPush("send_batch_primary_success", { batchIndex, ticketCount: tickets.length });
    } catch (primaryError) {
      logPushError("send_batch_primary_failed", {
        batchIndex,
        error: primaryError,
      });
      // Proxy is only available in local dev; fallback keeps production sending working.
      tickets = await postExpoPushBatch(EXPO_PUSH_DIRECT_URL, batch);
      logPush("send_batch_fallback_success", { batchIndex, ticketCount: tickets.length });
    }

    if (tickets.length === 0) {
      okCount += batch.length;
      logPush("send_batch_no_tickets_assumed_ok", { batchIndex, assumedOkCount: batch.length });
      continue;
    }

    for (const ticket of tickets) {
      if (ticket.status === "ok") {
        okCount += 1;
      } else {
        errorCount += 1;
        const detail = ticket.details?.error || ticket.message || "UnknownError";
        errors.push(detail);
      }
    }

    logPush("send_batch_processed", {
      batchIndex,
      runningOkCount: okCount,
      runningErrorCount: errorCount,
    });
  }

  const summary = {
    okCount,
    errorCount,
    errors: Array.from(new Set(errors)),
  };

  logPush("send_complete", summary);
  return summary;
};


// ─── App ────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [appConfig, setAppConfig] = useState<{ hideSubscriptionUI: boolean }>({ hideSubscriptionUI: false });

  const isDashboardAdmin = () => auth.currentUser?.email?.toLowerCase() === DASHBOARD_ADMIN_EMAIL;

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const isAdminSession = user?.email?.toLowerCase() === DASHBOARD_ADMIN_EMAIL;
      setIsAuthenticated(isAdminSession);
      setAuthReady(true);

      if (isAdminSession) {
        sessionStorage.setItem("dashboard_auth", "true");
      } else {
        sessionStorage.removeItem("dashboard_auth");
      }
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, "settings", "appConfig"), (snap) => {
      if (snap.exists()) {
        setAppConfig(snap.data() as { hideSubscriptionUI: boolean });
      }
    });
  }, []);

  const handleUpdateAppConfig = async (newConfig: { hideSubscriptionUI: boolean }) => {
    try {
      await setDoc(doc(db, "settings", "appConfig"), newConfig, { merge: true });
    } catch (error) {
      console.error("Failed to update app config:", error);
    }
  };

  useEffect(() => {
    const lockoutStr = localStorage.getItem('dashboard_loginLockoutUntil');
    if (lockoutStr) {
      const lockoutTime = parseInt(lockoutStr, 10);
      if (Date.now() < lockoutTime) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('dashboard_loginLockoutUntil');
        localStorage.removeItem('dashboard_loginAttempts');
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (lockoutUntil) {
      interval = setInterval(() => {
        if (Date.now() > lockoutUntil) {
          setLockoutUntil(null);
          localStorage.removeItem('dashboard_loginLockoutUntil');
          localStorage.removeItem('dashboard_loginAttempts');
          setLoginError("");
        } else {
          setLoginError(`تم حظر الدخول لكثرة المحاولات. يرجى المحاولة بعد ${Math.ceil((lockoutUntil - Date.now()) / 60000)} دقيقة`);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [videos, setVideos] = useState<any[]>([]);
  
  // Custom Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentImage, setNewStudentImage] = useState<File | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");
  const [newTeacherImage, setNewTeacherImage] = useState<File | null>(null);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoDescription, setNewVideoDescription] = useState("");
  const [newVideoSubject, setNewVideoSubject] = useState("");
  const [newVideoTeacherId, setNewVideoTeacherId] = useState("");
  const [newVideoPlaylistName, setNewVideoPlaylistName] = useState("");
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState(false);
  const [newPlaylistInput, setNewPlaylistInput] = useState("");
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videosViewMode, setVideosViewMode] = useState<"all" | "playlists">("all");
  const [chatInitialTeacherId, setChatInitialTeacherId] = useState<string | undefined>();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [isAddQuizOpen, setIsAddQuizOpen] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizTeacherId, setNewQuizTeacherId] = useState("");
  const [newQuizSubject, setNewQuizSubject] = useState("");
  const [newQuizDeadline, setNewQuizDeadline] = useState("");
  const [newQuizFiles, setNewQuizFiles] = useState<File[]>([]);
  const [isAddingQuiz, setIsAddingQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [fullScreenQuizImage, setFullScreenQuizImage] = useState<string | null>(null);

  const [manageTarget, setManageTarget] = useState<{ type: 'student' | 'teacher', data: any } | null>(null);
  const [manageTargetTab, setManageTargetTab] = useState<'stats'|'videos'|'chat'|'settings'>('stats');
  const [showQR, setShowQR] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const handleManageClick = (type: 'student' | 'teacher', data: any) => {
    setManageTarget({ type, data });
    setManageTargetTab('stats');
    setShowQR(false);
    setIsEditingUser(false);
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    document.body.classList.toggle("mobile-sidebar-open", isMobileSidebarOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("mobile-sidebar-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const handleResetDevice = async () => {
    if (!manageTarget || manageTarget.type !== 'student') return;
    if (!window.confirm("هل أنت متأكد من إعادة تعيين ربط الجهاز لهذا الطالب؟ سيتمكن من الربط من أي جهاز جديد في المرة القادمة.")) return;
    
    setIsSavingUser(true);
    try {
      const userRef = doc(db, 'students', manageTarget.data.id || manageTarget.data.uid);
      await updateDoc(userRef, {
        boundDeviceId: null,
        boundDeviceOS: null,
        boundAt: null,
        activeSessionId: null
      });
      setManageTarget({
        ...manageTarget,
        data: {
          ...manageTarget.data,
          boundDeviceId: null,
          boundDeviceOS: null,
          boundAt: null,
          activeSessionId: null
        }
      });
      alert("تم إعادة تعيين ربط الجهاز بنجاح");
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSimulateDeviceBind = async () => {
    if (!manageTarget || manageTarget.type !== 'student') return;
    setIsSavingUser(true);
    try {
      const userRef = doc(db, 'students', manageTarget.data.id || manageTarget.data.uid);
      const dummyId = "simulated_device_" + Math.random().toString(36).substring(7);
      const dummyOS = "android";
      const now = new Date().toISOString();
      await updateDoc(userRef, {
        boundDeviceId: dummyId,
        boundDeviceOS: dummyOS,
        boundAt: now,
      });
      setManageTarget({
        ...manageTarget,
        data: {
          ...manageTarget.data,
          boundDeviceId: dummyId,
          boundDeviceOS: dummyOS,
          boundAt: now,
        }
      });
      alert("تم محاكاة ربط الجهاز بنجاح");
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const [adminUpdateMsg, setAdminUpdateMsg] = useState("");
  const [editingSubject, setEditingSubject] = useState<{id: string, name: string} | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", subject: "", canUploadLectures: false });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleEditUserToggle = () => {
    if (manageTarget) {
      setEditFormData({
        name: manageTarget.data.name || "",
        subject: manageTarget.data.subject || "",
        canUploadLectures: manageTarget.data.canUploadLectures || false
      });
      setIsEditingUser(true);
    }
  };

  const handleUpdateTargetUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageTarget) return;
    setIsSavingUser(true);
    try {
      const collectionName = manageTarget.type === 'student' ? 'students' : 'teachers';
      const userRef = doc(db, collectionName, manageTarget.data.id || manageTarget.data.uid);
      await updateDoc(userRef, {
        name: editFormData.name,
        ...(manageTarget.type === 'teacher' ? { subject: editFormData.subject, canUploadLectures: editFormData.canUploadLectures } : {})
      });
      
      setManageTarget({
        ...manageTarget,
        data: { ...manageTarget.data, name: editFormData.name, subject: editFormData.subject, canUploadLectures: editFormData.canUploadLectures }
      });
      setIsEditingUser(false);
    } catch (err: any) {
      alert("خطأ في التحديث: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteTargetUser = async () => {
    if (!manageTarget) return;
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً وجميع البيانات المرتبطة به؟ لا يمكن التراجع.")) return;
    
    setIsSavingUser(true);
    try {
      const uid = manageTarget.data.id || manageTarget.data.uid;
      // Delete chat messages
      const chatsSnap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid)));
      for (const chatDoc of chatsSnap.docs) {
        const msgSnap = await getDocs(collection(db, `chats/${chatDoc.id}/messages`));
        for (const mSnap of msgSnap.docs) {
          await deleteDoc(doc(db, `chats/${chatDoc.id}/messages`, mSnap.id));
        }
        await deleteDoc(doc(db, 'chats', chatDoc.id));
      }

      const type = manageTarget.type;

      if (type === 'student') {
        const subSnap = await getDocs(query(collection(db, 'quiz_submissions'), where('studentId', '==', uid)));
        for (const docSnap of subSnap.docs) {
          await deleteDoc(doc(db, 'quiz_submissions', docSnap.id));
        }
      } else if (type === 'teacher') {
        const quizzesSnap = await getDocs(query(collection(db, 'quizzes'), where('teacherId', '==', uid)));
        for (const docSnap of quizzesSnap.docs) {
          await deleteDoc(doc(db, 'quizzes', docSnap.id));
        }
        
        const lecturesSnap = await getDocs(query(collection(db, 'lectures'), where('teacherId', '==', uid)));
        for (const docSnap of lecturesSnap.docs) {
          await deleteDoc(doc(db, 'lectures', docSnap.id));
        }
      }

      const collectionName = type === 'student' ? 'students' : 'teachers';
      const userRef = doc(db, collectionName, uid);
      await deleteDoc(userRef);
      
      setManageTarget(null);
      setIsEditingUser(false);
      setShowQR(false);
    } catch (err: any) {
      alert("خطأ في الحذف: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationTarget, setNotificationTarget] = useState<"students" | "teachers" | "all">("all");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("");

  useEffect(() => {
    const withToken = students.filter(
      (item) => item.notificationsEnabled !== false && isValidExpoPushToken(item.expoPushToken)
    ).length;
    logPush("students_state_updated", {
      total: students.length,
      withValidExpoToken: withToken,
    });
  }, [students]);

  useEffect(() => {
    const withToken = teachers.filter(
      (item) => item.notificationsEnabled !== false && isValidExpoPushToken(item.expoPushToken)
    ).length;
    logPush("teachers_state_updated", {
      total: teachers.length,
      withValidExpoToken: withToken,
    });
  }, [teachers]);

  const handleUpdateTeacherImage = async (teacherId: string, file: File) => {
    try {
      const publicUrl = await uploadToR2(file, "PROFILES", teacherId);
      await updateDoc(doc(db, "teachers", teacherId), { image: publicUrl });
      
      // Update local state to reflect UI change immediately
      setManageTarget(prev => prev ? { ...prev, data: { ...prev.data, image: publicUrl } } : null);
      
      alert("تم تحديث صورة المعلم بنجاح");
    } catch(err: any) {
      alert("خطأ في تحديث الصورة: " + err.message);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle.trim() || !notificationBody.trim()) return;

    setIsSendingNotification(true);
    setNotificationStatus("Sending notifications...");

    try {
      logPush("manual_notification_send_requested", {
        target: notificationTarget,
        title: notificationTitle,
        bodyLength: notificationBody.length,
        studentsCount: students.length,
        teachersCount: teachers.length,
      });

      const enabledStudents = students.filter((s) => s.notificationsEnabled !== false);
      const enabledTeachers = teachers.filter((t) => t.notificationsEnabled !== false);
      const rawStudentTokens = enabledStudents.map((s) => s.expoPushToken).filter(Boolean);
      const rawTeacherTokens = enabledTeachers.map((t) => t.expoPushToken).filter(Boolean);
      let targetTokens: string[] = [];

      if (notificationTarget === "students" || notificationTarget === "all") {
        targetTokens = [...targetTokens, ...enabledStudents.map((s) => s.expoPushToken)];
      }
      if (notificationTarget === "teachers" || notificationTarget === "all") {
        targetTokens = [...targetTokens, ...enabledTeachers.map((t) => t.expoPushToken)];
      }

      targetTokens = Array.from(new Set(targetTokens.filter(isValidExpoPushToken)));
      logPush("manual_notification_tokens_collected", {
        rawStudentTokens: rawStudentTokens.length,
        rawTeacherTokens: rawTeacherTokens.length,
        validTargetTokens: targetTokens.length,
        sampleTargetTokens: targetTokens.slice(0, 5).map(maskToken),
      });

      // Always write to Firestore so it appears in the app notifications page
      await addDoc(collection(db, "admin_notifications"), {
        title: notificationTitle,
        body: notificationBody,
        target: notificationTarget,
        createdAt: new Date(),
      });
      logPush("manual_notification_written_firestore", {
        target: notificationTarget,
        title: notificationTitle,
      });

      if (targetTokens.length === 0) {
        logPush("manual_notification_no_valid_tokens");
        setNotificationStatus("Saved to in-app notifications only. No valid Expo push tokens were found.");
        setNotificationTitle("");
        setNotificationBody("");
        setTimeout(() => setNotificationStatus(""), 4000);
        setIsSendingNotification(false);
        return;
      }

      setNotificationStatus(`Sending push notifications to ${targetTokens.length} devices...`);

      const messages: ExpoPushMessage[] = targetTokens.map((token) => ({
        to: token,
        sound: "default",
        title: notificationTitle,
        body: notificationBody,
        data: { route: "notification" },
      }));

      const pushResult = await sendExpoPushMessages(messages);
      logPush("manual_notification_send_result", pushResult);
      const invalidCredentials = pushResult.errors.find((item) => item.includes("InvalidCredentials"));

      if (pushResult.errorCount > 0 && pushResult.okCount === 0) {
        throw new Error(
          invalidCredentials
            ? "All notifications failed. Android FCM credentials are missing/invalid in Expo project settings."
            : pushResult.errors.join(", ")
        );
      }

      if (pushResult.errorCount > 0) {
        setNotificationStatus(
          `Sent ${pushResult.okCount}/${messages.length}. Some failed: ${pushResult.errors.join(', ')}`
        );
      } else {
        setNotificationStatus(`Sent to ${pushResult.okCount} devices.`);
      }

      setNotificationTitle("");
      setNotificationBody("");
      setTimeout(() => setNotificationStatus(""), 5000);
    } catch (error: any) {
      logPushError("manual_notification_send_failed", error);
      setNotificationStatus(`Error: ${error.message}`);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherSubject || !newTeacherEmail || !newTeacherPassword) return;
    
    setIsAddingTeacher(true);
    try {
      if (!isDashboardAdmin()) {
        throw new Error("جلسة المشرف غير صالحة. سجّل الخروج ثم ادخل بحساب admin@marpha.app.");
      }

      let finalTeacherName = newTeacherName.trim();
      if (!finalTeacherName.startsWith("استاذ ") && !finalTeacherName.startsWith("أستاذ ")) {
        finalTeacherName = "استاذ " + finalTeacherName;
      }

      const fakeEmail = `${newTeacherEmail.trim().toLowerCase().replace(/\s+/g, '_')}@marpha.app`;

      // Use secondaryAuth so the dashboard user (admin) doesn't get logged out!
      const { secondaryAuth, secondaryDb } = await import("./firebase");
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, fakeEmail, newTeacherPassword);
        const user = userCredential.user;

        await updateProfile(user, { displayName: finalTeacherName });

        let profileImage = "https://ui-avatars.com/api/?name=" + encodeURIComponent(finalTeacherName) + "&background=10b981&color=fff";
        if (newTeacherImage) {
          try {
            const publicUrl = await uploadToR2(newTeacherImage, "PROFILES", user.uid);
            profileImage = publicUrl;
          } catch (uploadErr) {
            console.error("Failed to upload profile picture:", uploadErr);
            // Fallback to anon pic if upload fails
          }
        }

        await setDoc(doc(secondaryDb, "teachers", user.uid), {
          uid: user.uid,
          name: finalTeacherName,
          username: newTeacherEmail.trim().toLowerCase(),
          email: fakeEmail,
          password: newTeacherPassword, // saved for barcode sign-in
          subject: newTeacherSubject,
          image: profileImage,
          canUploadLectures: false,
          createdAt: new Date().toISOString()
        });
      } finally {
        // Quick logout from the secondary instance to clear its session completely
        await secondaryAuth.signOut().catch(() => {});
      }

      // Reset form and close modal
      setNewTeacherName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
      setNewTeacherSubject("");
      setNewTeacherImage(null);
      setIsAddTeacherOpen(false);
    } catch(err: any) {
      alert("خطأ في الإضافة: " + err.message);
    } finally {
      setIsAddingTeacher(false);
    }
  };

  const handleGenerateTempStudent = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewStudentName(`طالب ${randomId}`);
    setNewStudentEmail(`student_${randomId}`);
    setNewStudentPassword(randomPass);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentPassword) return;
    
    setIsAddingStudent(true);
    try {
      if (!isDashboardAdmin()) {
        throw new Error("جلسة المشرف غير صالحة. سجّل الخروج ثم ادخل بحساب admin@marpha.app.");
      }

      const generateUserId = () => Math.floor(100000 + Math.random() * 900000).toString();
      const newUserId = generateUserId();

      const fakeEmail = `${newStudentEmail.trim().toLowerCase().replace(/\s+/g, '_')}@marpha.app`;

      const { secondaryAuth } = await import("./firebase");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, fakeEmail, newStudentPassword);
      const user = userCredential.user;

      await updateProfile(user, { displayName: newStudentName });

      let profileImage = "https://ui-avatars.com/api/?name=" + encodeURIComponent(newStudentName) + "&background=10b981&color=fff";
      if (newStudentImage) {
        try {
          const publicUrl = await uploadToR2(newStudentImage, "PROFILES", user.uid);
          profileImage = publicUrl;
        } catch (uploadErr) {
          console.error("Failed to upload profile picture:", uploadErr);
        }
      }

      let freeTrialObj = { isActive: false, startDate: "", endDate: "", access: { allowedTeachers: [], allowedSubjects: [] } };
      try {
        const { getDoc } = await import("firebase/firestore");
        const freeTrialSnap = await getDoc(doc(db, "settings", "freeTrial"));
        if (freeTrialSnap.exists()) {
          const ftData = freeTrialSnap.data();
          const lengthDays = ftData.defaultLengthDays || 7;
          const now = new Date();
          const endDate = new Date();
          endDate.setDate(now.getDate() + lengthDays);
          freeTrialObj = {
            isActive: true,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            access: ftData.defaultAccess || { allowedTeachers: [], allowedSubjects: [] }
          };
        }
      } catch (err) {
        console.error("Error fetching freeTrial settings:", err);
      }

      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        name: newStudentName,
        username: newStudentEmail.trim().toLowerCase(),
        email: fakeEmail,
        password: newStudentPassword,
        subject: "عام",
        progress: 0,
        status: "active",
        image: profileImage,
        isSetupComplete: false,
        userId: newUserId,
        subscription: {
          type: "none",
          allowedTeachers: [],
          allowedSubjects: []
        },
        freeTrial: freeTrialObj,
        deviceChangeCount: 0,
        createdAt: new Date().toISOString()
      });

      await secondaryAuth.signOut();

      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
      setNewStudentImage(null);
      setIsAddStudentOpen(false);
    } catch(err: any) {
      alert("خطأ في الإضافة: " + err.message);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle || !newVideoSubject || !newVideoFile || !newVideoTeacherId) return;
    
    setIsAddingVideo(true);
    try {
      // 1. Upload video to Cloudflare R2
      // Using subject name for the folder keeps things organized
      const folderPath = newVideoSubject.replace(/[^a-zA-Z0-9]/g, "_"); 
      const publicUrl = await uploadToR2(newVideoFile, "LECTURES", folderPath);
      
      // 2. Save metadata to Firestore
      const lectureRef = await addDoc(collection(db, "lectures"), {
        title: newVideoTitle,
        description: newVideoDescription,
        subject: newVideoSubject,
        videoUrl: publicUrl,
        createdAt: new Date().toISOString()
      });

      // 3. Send Push Notification to all students
      const targetTokens = Array.from(
        new Set(
          students
            .filter((s) => s.notificationsEnabled !== false)
            .filter((s) => studentCanReceiveSubjectNotification(s, newVideoSubject, teachers))
            .map((s) => s.expoPushToken)
            .filter(isValidExpoPushToken)
        )
      );
      logPush("lecture_notification_tokens_collected", {
        lectureTitle: newVideoTitle,
        lectureSubject: newVideoSubject,
        authorizedStudents: students.filter((s) => studentCanReceiveSubjectNotification(s, newVideoSubject, teachers)).length,
        validTargetTokens: targetTokens.length,
        sampleTargetTokens: targetTokens.slice(0, 5).map(maskToken),
      });

      if (targetTokens.length > 0) {
        const messages: ExpoPushMessage[] = targetTokens.map((token) => ({
          to: token,
          sound: "default",
          title: `New lecture: ${newVideoSubject}`,
          body: `A new lecture was added: "${newVideoTitle}"`,
          data: { route: "lecture", lectureId: lectureRef.id },
        }));

        void sendExpoPushMessages(messages)
          .then((result) => {
            logPush("lecture_notification_send_result", result);
            if (result.errorCount > 0) {
              console.warn("[Push] Video notification partial failure:", result);
            }
          })
          .catch((err) => {
            logPushError("lecture_notification_send_failed", err);
            console.error("Push notification error:", err);
          });
      }

      // Reset form
      setNewVideoTitle("");
      setNewVideoDescription("");
      setNewVideoSubject("");
      setNewVideoTeacherId("");
      setNewVideoPlaylistName("");
      setIsCreatingNewPlaylist(false);
      setNewPlaylistInput("");
      setNewVideoFile(null);
      setIsAddVideoOpen(false);
    } catch (err: any) {
      alert("Error while adding lecture: " + err.message);
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "lectures", id), { status: "accepted" });
    } catch(err: any) {
      alert("خطأ في القبول: " + err.message);
    }
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "lectures", id), { status: "declined" });
    } catch(err: any) {
      alert("خطأ في الرفض: " + err.message);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !newQuizTeacherId || newQuizFiles.length === 0) return;

    const teacher = teachers.find((item: any) => item.id === newQuizTeacherId || item.uid === newQuizTeacherId);
    const teacherId = teacher?.uid || teacher?.id || newQuizTeacherId;
    const subject = newQuizSubject || teacher?.subject || "";

    setIsAddingQuiz(true);
    try {
      const folder = `quizzes_${teacherId}`;
      const uploadedQuestions = [];

      for (const [index, file] of newQuizFiles.entries()) {
        const renamedFile = new File([file], `q${index + 1}_${Date.now()}_${file.name}`, { type: file.type || "image/jpeg" });
        const questionImage = await uploadToR2(renamedFile, "QUIZZES", folder);
        uploadedQuestions.push({ questionImage });
      }

      const quizRef = await addDoc(collection(db, "quizzes"), {
        title: newQuizTitle.trim(),
        teacherId,
        teacherName: teacher?.name || "",
        subject,
        course: subject,
        questions: uploadedQuestions,
        status: "active",
        deadline: newQuizDeadline ? new Date(newQuizDeadline) : null,
        createdAt: new Date(),
      });

      const targetTokens = Array.from(
        new Set(
          students
            .filter((student) => student.notificationsEnabled !== false)
            .filter((student) => {
              if (subject && studentCanReceiveSubjectNotification(student, subject, teachers)) return true;
              const subscription = student.subscription;
              const freeTrial = student.freeTrial;
              const teacherAllowed =
                isSubscriptionActive(subscription) && stringArray(subscription?.allowedTeachers).includes(teacherId);
              const trialAllowed =
                isFreeTrialActive(freeTrial) && stringArray(freeTrial?.access?.allowedTeachers).includes(teacherId);
              return teacherAllowed || trialAllowed;
            })
            .map((student) => student.expoPushToken)
            .filter(isValidExpoPushToken)
        )
      );

      if (targetTokens.length > 0) {
        const messages: ExpoPushMessage[] = targetTokens.map((token) => ({
          to: token,
          sound: "default",
          title: "اختبار جديد",
          body: `تمت إضافة اختبار جديد بعنوان "${newQuizTitle.trim()}"`,
          data: { route: "quiz", quizId: quizRef.id },
        }));

        void sendExpoPushMessages(messages).catch((err) => {
          logPushError("quiz_notification_send_failed", err);
        });
      }

      setNewQuizTitle("");
      setNewQuizTeacherId("");
      setNewQuizSubject("");
      setNewQuizDeadline("");
      setNewQuizFiles([]);
      setIsAddQuizOpen(false);
    } catch (err: any) {
      alert("خطأ في إضافة الاختبار: " + err.message);
    } finally {
      setIsAddingQuiz(false);
    }
  };

  const handleToggleQuizStatus = async (quiz: any) => {
    const nextStatus = quiz.status === "finished" ? "active" : "finished";
    try {
      await updateDoc(doc(db, "quizzes", quiz.id), { status: nextStatus });
    } catch (err: any) {
      alert("خطأ في تحديث حالة الاختبار: " + err.message);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف الاختبار من التطبيق أيضاً.")) return;
    try {
      const relatedSubmissions = quizSubmissions.filter((submission: any) => submission.quizId === quizId);
      for (const submission of relatedSubmissions) {
        await deleteDoc(doc(db, "quiz_submissions", submission.id));
      }
      await deleteDoc(doc(db, "quizzes", quizId));
      if (selectedQuiz?.id === quizId) setSelectedQuiz(null);
    } catch (err: any) {
      alert("خطأ في حذف الاختبار: " + err.message);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !gradeInput.trim()) return;

    try {
      await updateDoc(doc(db, "quiz_submissions", selectedSubmission.id), {
        score: gradeInput.trim(),
        graded: true,
      });

      const student = students.find((item: any) => item.id === selectedSubmission.studentId || item.uid === selectedSubmission.studentId);
      if (isValidExpoPushToken(student?.expoPushToken) && student.notificationsEnabled !== false) {
        void sendExpoPushMessages([{
          to: student.expoPushToken,
          sound: "default",
          title: "تم تصحيح اختبارك",
          body: `تم رصد درجتك (${gradeInput.trim()}) في الاختبار: ${selectedSubmission.quizTitle || selectedQuiz?.title || "بدون عنوان"}.`,
          data: { route: "quiz", quizId: selectedSubmission.quizId },
        }]).catch((err) => logPushError("grade_notification_send_failed", err));
      }

      setSelectedSubmission(null);
      setGradeInput("");
    } catch (err: any) {
      alert("خطأ في حفظ الدرجة: " + err.message);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا الفيديو نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "lectures", id));
      alert("تم حذف الفيديو بنجاح");
    } catch(err: any) {
      alert("خطأ في الحذف: " + err.message);
    }
  };

  const handleDeletePlaylist = async (teacherId: string, playlistName: string) => {
    if (!window.confirm("هل أنت متأكد من مسح القائمة بالكامل وجميع الفيديوهات التي بداخلها؟")) return;
    try {
      const vidsToDelete = videos.filter((v: any) => v.teacherId === teacherId && v.playlistName === playlistName);
      for (const v of vidsToDelete) {
        await deleteDoc(doc(db, "lectures", v.id));
      }
      const docId = `${teacherId}_${playlistName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}`;
      await deleteDoc(doc(db, "playlist_metadata", docId));
      alert("تم مسح القائمة بنجاح");
    } catch(err: any) {
      alert("خطأ في الحذف: " + err.message);
    }
  };


  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newSubjectName.trim()) return;
    try {
      await addDoc(collection(db, "subjects"), { name: newSubjectName.trim(), createdAt: new Date().toISOString() });
      setNewSubjectName("");
      alert("تمت الإضافة بنجاح");
    } catch(err: any) { alert(err.message); }
  };

  const handleDeleteSubject = async (id: string) => {
    if(!confirm("تأكيد الحذف؟")) return;
    try {
      await deleteDoc(doc(db, "subjects", id));
      alert("تم الحذف بنجاح");
    } catch(err: any) { alert(err.message); }
  };


  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newAdminEmail && !newAdminPassword) return;
    try {
      const { updateEmail, updatePassword } = await import("firebase/auth");
      if(!auth.currentUser) throw new Error("الرجاء تسجيل الدخول أولاً. قد تحتاج لتسجيل الخروج والدخول مجدداً لتحديث البيانات.");
      if(newAdminEmail) await updateEmail(auth.currentUser, newAdminEmail);
      if(newAdminPassword) await updatePassword(auth.currentUser, newAdminPassword);
      setAdminUpdateMsg("تم تحديث البيانات بنجاح");
      setNewAdminPassword("");
    } catch(err: any) {
      setAdminUpdateMsg("خطأ: " + err.message);
    }
  };

  const handleUpdateSubject = async (id: string, newName: string) => {
    if(!newName.trim()) return;
    try {
      await updateDoc(doc(db, "subjects", id), { name: newName.trim() });
      alert("تم التعديل بنجاح");
    } catch(err: any) { alert(err.message); }
  };

  useEffect(() => {
    try {
      const unsubSubjects = onSnapshot(collection(db, "subjects"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedSubjects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSubjects(fetchedSubjects);
        } else {
          setSubjects([]);
        }
      });
      
      const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedStudents = snapshot.docs.map(doc => {
            const data = doc.data();
            const initials = data.name 
              ? data.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) 
              : "ط";
              
            return {
              id: doc.id,
              name: data.name,
              email: data.email,
              subject: data.subject || "عام",
              progress: data.progress || 0,
              status: data.status || "active",
              avatar: initials,
              color: "#12453D",
              ...data
            };
          });
          const sorted = fetchedStudents.sort((a: any, b: any) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setStudents(sorted);
        } else {
          setStudents([]);
        }
      });
      
      const unsubTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedTeachers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          const sorted = fetchedTeachers.sort((a: any, b: any) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setTeachers(sorted);
        } else {
          setTeachers([]);
        }
      });

      
      
      const unsubVideos = onSnapshot(collection(db, "lectures"), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedVideos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          const sorted = fetchedVideos.sort((a: any, b: any) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setVideos(sorted);
        } else {
          setVideos([]);
        }
      });

      const unsubQuizzes = onSnapshot(collection(db, "quizzes"), (snapshot) => {
        const fetchedQuizzes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const sorted = fetchedQuizzes.sort((a: any, b: any) => {
          const aTime = toDateValue(a.createdAt)?.getTime() || 0;
          const bTime = toDateValue(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        });
        setQuizzes(sorted);
      });

      const unsubQuizSubmissions = onSnapshot(collection(db, "quiz_submissions"), (snapshot) => {
        const fetchedSubmissions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const sorted = fetchedSubmissions.sort((a: any, b: any) => {
          const aTime = toDateValue(a.createdAt)?.getTime() || 0;
          const bTime = toDateValue(b.createdAt)?.getTime() || 0;
          return bTime - aTime;
        });
        setQuizSubmissions(sorted);
      });

      return () => {
        unsubSubjects();
        unsubStudents();
        unsubTeachers();
        
        unsubVideos();
        unsubQuizzes();
        unsubQuizSubmissions();
      }
    } catch (e) {
      console.warn("Firebase not configured correctly yet:", e);
    }
  }, []);

  const STATS = [
    { title: "إجمالي الطلاب", value: students.length.toString(), trend: "نشط", up: true, icon: Users, color: "#12453D", bg: "#EEF5F3" },
    { title: "المحاضرات", value: videos.length.toString(), trend: "مرفوعة", up: true, icon: Video, color: "#E3A736", bg: "#FFF8E8" },
    { title: "المواد الدراسية", value: (subjects.length > 0 ? subjects.length : Array.from(new Set(videos.map(v => v.subject).filter(Boolean))).length).toString(), trend: "مسجلة", up: true, icon: BookOpen, color: "#3B82F6", bg: "#EFF6FF" },
    { title: "المعلمون", value: teachers.length.toString(), trend: "نخبة", up: true, icon: GraduationCap, color: "#10B981", bg: "#ECFDF5" },
  ];

  const ACTIVITIES = videos
    .slice()
    .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5)
    .map(v => ({ text: `تم رفع ${v.title || 'محاضرة جديدة'} في ${v.subject || 'مادة'}`, time: (v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleDateString() : "حديثاً"), color: "#12453D" }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setLoginError(`تم حظر الدخول لكثرة المحاولات. يرجى المحاولة بعد ${Math.ceil((lockoutUntil - Date.now()) / 60000)} دقيقة`);
      return;
    }

    const email = loginUsername.includes('@') ? loginUsername : `${loginUsername}@marpha.app`;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
      if (userCredential.user.email?.toLowerCase() !== DASHBOARD_ADMIN_EMAIL) {
        await signOut(auth);
        setLoginError("هذا الحساب لا يملك صلاحية لوحة التحكم.");
        return;
      }
      setIsAuthenticated(true);
      sessionStorage.setItem('dashboard_auth', 'true');
      setLoginError("");
      localStorage.removeItem('dashboard_loginAttempts');
      localStorage.removeItem('dashboard_loginLockoutUntil');
    } catch (err: any) {
      const currentAttempts = parseInt(localStorage.getItem('dashboard_loginAttempts') || '0', 10) + 1;
      localStorage.setItem('dashboard_loginAttempts', currentAttempts.toString());
      
      if (currentAttempts >= 5) {
        const newLockoutTime = Date.now() + 5 * 60 * 1000; // 5 mins
        setLockoutUntil(newLockoutTime);
        localStorage.setItem('dashboard_loginLockoutUntil', newLockoutTime.toString());
        setLoginError("تم حظر الدخول لكثرة المحاولات. يرجى المحاولة بعد 5 دقائق");
      } else {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setLoginError(`بيانات الدخول غير صحيحة. المحاولة ${currentAttempts} من 5`);
        } else {
          setLoginError(`حدث خطأ أثناء تسجيل الدخول: ${err.message}`);
        }
      }
    }
  };

  if (!authReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F4F7F6', direction: 'rtl', fontFamily: 'Cairo, sans-serif', color: '#12453D', fontWeight: 800 }}>
        جارٍ التحقق من الجلسة...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F4F7F6', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        <form onSubmit={handleLogin} className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', background: '#fff', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #E8EDEC' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: '#EEF5F3', padding: '16px', borderRadius: '50%' }}>
              <GraduationCap size={44} color="#12453D" />
            </div>
          </div>
          <h2 style={{ marginBottom: '1.5rem', color: '#12453D', fontSize: '1.5rem', fontWeight: '800' }}>لوحة تحكم الإدارة</h2>
          
          {loginError && <p style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '14px', background: '#FEF2F2', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>{loginError}</p>}
          
          <div style={{ marginBottom: '1.2rem', textAlign: 'right' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#5A7A74', fontWeight: '800' }}>اسم المستخدم</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="admin" 
              value={loginUsername} 
              onChange={e => setLoginUsername(e.target.value)} 
              style={{ width: '100%', boxSizing: "border-box", padding: '12px 16px', borderRadius: '12px', border: '1px solid #E8EDEC', background: '#FAFBFA', transition: 'all 0.2s ease', fontFamily: 'inherit', fontSize: '15px' }} 
              required
            />
          </div>
          <div style={{ marginBottom: '2.5rem', textAlign: 'right' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#5A7A74', fontWeight: '800' }}>كلمة المرور</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="123456" 
              value={loginPassword} 
              onChange={e => setLoginPassword(e.target.value)} 
              style={{ width: '100%', boxSizing: "border-box", padding: '12px 16px', borderRadius: '12px', border: '1px solid #E8EDEC', background: '#FAFBFA', transition: 'all 0.2s ease', fontFamily: 'inherit', fontSize: '15px' }} 
              required
            />
          </div>
          <button 
            type="submit"
            disabled={lockoutUntil !== null}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#12453D', color: '#fff', fontSize: '16px', fontWeight: '800', border: 'none', cursor: lockoutUntil !== null ? 'not-allowed' : 'pointer', opacity: lockoutUntil !== null ? 0.6 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(18, 69, 61, 0.2)' }}
          >
            تسجيل الدخول <ChevronLeft size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <button
        type="button"
        className={`sidebar-overlay ${isMobileSidebarOpen ? "visible" : ""}`}
        aria-label="إغلاق القائمة"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      {/* ═══ Sidebar ═══ */}
      <aside className={`sidebar ${isMobileSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <h1>معرفة</h1>
            <span>لوحة التحكم</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="إغلاق القائمة"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">القائمة</div>
          {NAV_ITEMS.map((item, i) => (
            <a 
              key={i} 
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              
            </a>
          ))}

          <div className="nav-section-label">النظام</div>
          {NAV_ITEMS_SYSTEM.map((item, i) => (
            <a 
              key={i} 
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">م</div>
            <div className="sidebar-user-info">
              <h4>المشرف العام</h4>
              <p onClick={() => setActiveTab("settings")} style={{ cursor: "pointer", color: "var(--gold)", fontSize: "0.65rem", fontWeight: "bold" }}>تعديل الملف الشخصي</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Main ═══ */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="فتح القائمة"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2>لوحة التحكم</h2>
            <p>مرحباً بعودتك، المشرف العام</p>
          </div>
          <div className="topbar-right">
            <div className="topbar-search">
              <Search size={16} color="#8A9E99" />
              <input type="text" placeholder="بحث..." />
            </div>
            <button className="btn-primary" onClick={() => setIsAddStudentOpen(true)}>
              <span style={{ fontSize: "1.2rem", fontWeight: "900" }}>+</span>
              إضافة طالب جديد
            </button>
            <button className="topbar-icon-btn">
              <Bell size={18} />
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <div className="page-body">
          {activeTab === "dashboard" ? (
            <>
              {/* Stats */}
              <div className="stats-grid">
                {STATS.map((stat, i) => (
                  <motion.div key={i} className="stat-card glass-card" {...fadeUp(i * 0.08)}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon" style={{ background: stat.bg }}>
                        <stat.icon size={22} color={stat.color} />
                      </div>
                      <div className={`stat-card-trend ${stat.up ? "up" : "down"}`}>
                        {stat.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {stat.trend}
                      </div>
                    </div>
                    <h3>{stat.value}</h3>
                    <p>{stat.title}</p>
                  </motion.div>
                ))}
              </div>

              {/* Content Grid */}
              <div className="content-grid">
                {/* Students Table */}
                <motion.div className="panel-card glass-card" {...fadeUp(0.3)}>
                  <div className="panel-header">
                    <h3>أحدث الطلاب</h3>
                    <span className="panel-header-action" onClick={() => setActiveTab("students")}>عرض الكل <ChevronLeft size={14} style={{ verticalAlign: "middle" }} /></span>
                  </div>
                  <div className="panel-body">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>الطالب</th>
                          <th>المادة</th>
                          <th>التقدم</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length > 0 ? students.slice(0, 5).map((s, i) => (
                          <tr key={s.id || i}>
                            <td>
                              <div className="table-user">
                                <div className="table-user-avatar" style={{ background: s.color || "#12453D" }}>{s.avatar || "ط"}</div>
                                <div className="table-user-info">
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <h4>{s.name}</h4>
                                    {(s.deviceChangeCount || 0) >= 3 && (
                                      <div title="نشاط مشبوه: تغييرات متكررة للجهاز" style={{ color: "#FF3B30", display: "flex", alignItems: "center" }}>
                                        <AlertTriangle size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <p>{s.email}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{s.subject}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 5, background: "#EAEFEE", borderRadius: 3, overflow: "hidden", maxWidth: 100 }}>
                                  <div style={{ width: `${s.progress}%`, height: 5, borderRadius: 3, background: s.progress >= 80 ? "#10B981" : "#E3A736" }} />
                                </div>
                                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5A7A74" }}>{s.progress}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${s.status}`}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }}></span>
                                {s.status === "active" ? "نشط" : s.status === "pending" ? "معلق" : "غير نشط"}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "#8A9E99" }}>لا يوجد طلاب بعد.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  {/* Activity Feed */}
                  <motion.div className="panel-card glass-card" {...fadeUp(0.4)}>
                    <div className="panel-header">
                      <h3>آخر النشاطات</h3>
                      <span className="panel-header-action">عرض الكل</span>
                    </div>
                    <div className="panel-body">
                      <div className="activity-list">
                        {ACTIVITIES.map((a, i) => (
                          <div key={i} className="activity-item">
                            <div className="activity-dot" style={{ background: a.color }} />
                            <div className="activity-content">
                              <h4>{a.text}</h4>
                              <p>{a.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Subjects Mini Grid */}
                  <motion.div className="panel-card glass-card" {...fadeUp(0.5)}>
                    <div className="panel-header">
                      <h3>المواد الدراسية</h3>
                      <span className="panel-header-action">إدارة</span>
                    </div>
                    <div className="panel-body">
                      <div className="subject-mini-grid">
                        {subjects.map((sub, i) => (
                          <div key={i} className="subject-mini-card">
                            <div 
                              className="subject-mini-card-icon" 
                              style={{ 
                                background: sub.bg, 
                                overflow: "hidden", 
                                borderRadius: "50%",
                                padding: 0,
                                border: `2px solid ${sub.color}`
                              }}
                            >
                              <img 
                                src={sub.teacherImage || "https://i.pravatar.cc/150"} 
                                alt={sub.teacherName || sub.professor || sub.title} 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                onError={(e) => { (e.target as any).src = "https://i.pravatar.cc/150?u=fallback" }}
                              />
                            </div>
                            <h4>{sub.title}</h4>
                            <p style={{ fontSize: "0.65rem", fontWeight: "700", marginBottom: "4px" }}>{sub.teacherName || sub.professor}</p>
                            <p>{sub.lessons || sub.lessonsCount} درس</p>
                            <div className="subject-mini-progress">
                              <div className="subject-mini-progress-track">
                                <div className="subject-mini-progress-fill" style={{ width: `${sub.progress}%`, background: sub.color }} />
                              </div>
                              <span>{sub.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </>
          ) : activeTab === "students" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh" }}>
              <div className="panel-header">
                <h3>قائمة الطلاب</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span className="panel-header-action">تصدير CSV</span>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>
              <div className="panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>المادة</th>
                      <th>تاريخ الانضمام</th>
                      <th>التقدم</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? students.map((s, i) => (
                      <tr key={s.id || i}>
                        <td>
                          <div className="table-user">
                            <div className="table-user-avatar" style={{ background: s.color || "#12453D" }}>{s.avatar || "ط"}</div>
                            <div className="table-user-info">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h4>{s.name}</h4>
                                {(s.deviceChangeCount || 0) >= 3 && (
                                  <div title="نشاط مشبوه: تغييرات متكررة للجهاز" style={{ color: "#FF3B30", display: "flex", alignItems: "center" }}>
                                    <AlertTriangle size={14} />
                                  </div>
                                )}
                              </div>
                              <p>{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.subject}</td>
                        <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 5, background: "#EAEFEE", borderRadius: 3, overflow: "hidden", maxWidth: 100 }}>
                              <div style={{ width: `${s.progress}%`, height: 5, borderRadius: 3, background: s.progress >= 80 ? "#10B981" : "#E3A736" }} />
                            </div>
                            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#5A7A74" }}>{s.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${s.status}`}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }}></span>
                            {s.status === "active" ? "نشط" : s.status === "pending" ? "معلق" : "غير نشط"}
                          </span>
                        </td>
                        <td>
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => handleManageClick('student', s)}>إدارة</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد طلاب مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : activeTab === "teachers" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh" }}>
              <div className="panel-header">
                <h3>قائمة المعلمين</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => setIsAddTeacherOpen(true)}>+ إضافة معلم</button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>
              <div className="panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المعلم</th>
                      <th>المادة</th>
                      <th>تاريخ الانضمام</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length > 0 ? teachers.map((t, i) => (
                      <tr key={t.id || i}>
                        <td>
                          <div className="table-user">
                            <div className="table-user-avatar" style={{ overflow: "hidden", padding: 0 }}>
                               <img src={t.image || `https://ui-avatars.com/api/?name=${t.name}&background=12453D&color=fff`} style={{ width: "100%", height: "100%", objectFit: "cover"}} />
                            </div>
                            <div className="table-user-info">
                              <h4>{t.name}</h4>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{t.subject}</td>
                        <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                        <td>
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => handleManageClick('teacher', t)}>إدارة</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : activeTab === "videos" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh" }}>
              <div className="panel-header">
                <h3>قائمة المحاضرات</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ background: "#E8EDEC", padding: "4px", borderRadius: "8px", display: "flex", gap: "4px" }}>
                    <button onClick={() => setVideosViewMode("all")} style={{ padding: "4px 12px", border: "none", borderRadius: "6px", background: videosViewMode === "all" ? "#fff" : "transparent", color: videosViewMode === "all" ? "#12453D" : "#8A9E99", fontSize: "0.85rem", cursor: "pointer", fontWeight: videosViewMode === "all" ? "bold" : "normal" }}>الكل</button>
                    <button onClick={() => setVideosViewMode("playlists")} style={{ padding: "4px 12px", border: "none", borderRadius: "6px", background: videosViewMode === "playlists" ? "#fff" : "transparent", color: videosViewMode === "playlists" ? "#12453D" : "#8A9E99", fontSize: "0.85rem", cursor: "pointer", fontWeight: videosViewMode === "playlists" ? "bold" : "normal" }}>قوائم التشغيل</button>
                  </div>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => setIsAddVideoOpen(true)}>+ رفع فيديو جديد</button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>
              <div className="panel-body">
                {videosViewMode === "all" ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>عنوان المحاضرة</th>
                        <th>المادة</th>
                        <th>الرابط / الملف</th>
                        <th>تاريخ الإضافة</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).length > 0 ? videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status).map((v, i) => (
                        <tr key={v.id || i}>
                          <td>
                            <div className="table-user">
                              <div className="table-user-avatar" style={{ background: "#E3A736" }}>
                                 <Video size={16} color="#fff" />
                              </div>
                              <div className="table-user-info">
                                <h4>{v.title}</h4>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{v.subject || v.duration || 'عام'}</td>
                          <td>
                            {v.videoUrl || v.link ? (
                              <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem" }}>عرض الفيديو</a>
                            ) : (
                              <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>لا يوجد رابط</span>
                            )}
                          </td>
                          <td>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
                          <td>
                            <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "none", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="حذف الفيديو">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد محاضرات مقبولة أو مسجلة مسبقاً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {(() => {
                      const validVids = videos.filter((v: any) => v.status === "accepted" || v.status === "active" || !v.status);
                      const groupMap: Record<string, any[]> = {};
                      validVids.forEach(v => {
                        const key = `${v.teacherId || 'unknown'}|${v.playlistName || 'بدون قائمة'}`;
                        if (!groupMap[key]) groupMap[key] = [];
                        groupMap[key].push(v);
                      });
                      const groups = Object.entries(groupMap);
                      if (groups.length === 0) return <div style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد قوائم تشغيل أو محاضرات.</div>;
                      
                      return groups.map(([key, list]) => {
                        const parts = key.split('|');
                        const tId = parts[0];
                        const pName = parts.slice(1).join('|');
                        const teacherName = teachers.find(t => t.uid === tId || t.id === tId)?.name || "مدرس غير معروف";
                        return (
                          <div key={key} style={{ background: "#F9FAFA", borderRadius: "12px", border: "1px solid #E8EDEC", overflow: "hidden" }}>
                            <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E8EDEC", background: "#fff" }}>
                              <div>
                                <h4 style={{ margin: "0 0 4px 0", color: "#12453D" }}>{pName} <span style={{ fontSize: "0.85rem", color: "#8A9E99", fontWeight: "normal" }}>({list.length} فيديو)</span></h4>
                                <div style={{ fontSize: "0.85rem", color: "#E3A736" }}>{teacherName}</div>
                              </div>
                              <button onClick={() => handleDeletePlaylist(tId, pName)} style={{ background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "1px solid rgba(255, 59, 48, 0.3)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
                                <Trash2 size={14} /> مسح القائمة
                              </button>
                            </div>
                            <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
                              {list.map(v => (
                                <div key={v.id} style={{ display: "flex", flexDirection: "column", background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #E8EDEC" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <h5 style={{ margin: 0, fontSize: "0.95rem", color: "#12453D" }}>{v.title}</h5>
                                    <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: "4px" }} title="حذف الفيديو"><Trash2 size={14} /></button>
                                  </div>
                                  <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginBottom: "8px" }}>{v.subject || 'عام'}</div>
                                  {v.videoUrl || v.link ? (
                                    <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem", marginTop: "auto" }}>عرض الفيديو</a>
                                  ) : (
                                    <span style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "auto" }}>لا يوجد رابط</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === "groups" ? (
            <GroupsPanel initialTeacherId={chatInitialTeacherId} />
          ) : activeTab === "finance" ? (
            <FinancePanel />
          ) : activeTab === "subscriptions" ? (
            <SubscriptionsPanel />
          ) : activeTab === "freeTrials" ? (
            <FreeTrialsPanel />
          ) : activeTab === "exams" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh" }}>
              <div className="panel-header">
                <h3>إدارة الاختبارات</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-primary" onClick={() => setIsAddQuizOpen(true)}>
                    <span style={{ fontSize: "1.2rem", fontWeight: "900" }}>+</span>
                    إضافة اختبار
                  </button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>

              <div className="panel-body" style={{ padding: "20px" }}>
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "20px" }}>
                  <div className="stat-card glass-card" style={{ cursor: "default" }}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon" style={{ background: "#EEF5F3" }}><GraduationCap size={22} color="#12453D" /></div>
                    </div>
                    <h3>{quizzes.length}</h3>
                    <p>إجمالي الاختبارات</p>
                  </div>
                  <div className="stat-card glass-card" style={{ cursor: "default" }}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon" style={{ background: "#ECFDF5" }}><Check size={22} color="#10B981" /></div>
                    </div>
                    <h3>{quizzes.filter((quiz: any) => quiz.status !== "finished").length}</h3>
                    <p>اختبارات نشطة</p>
                  </div>
                  <div className="stat-card glass-card" style={{ cursor: "default" }}>
                    <div className="stat-card-header">
                      <div className="stat-card-icon" style={{ background: "#FFF8E8" }}><Clock size={22} color="#E3A736" /></div>
                    </div>
                    <h3>{quizSubmissions.filter((submission: any) => !submission.graded).length}</h3>
                    <p>بانتظار التصحيح</p>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الاختبار</th>
                      <th>المعلم</th>
                      <th>المادة</th>
                      <th>الأسئلة</th>
                      <th>التسليمات</th>
                      <th>الحالة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizzes.length > 0 ? quizzes.map((quiz: any) => {
                      const quizTeacher = teachers.find((teacher: any) => teacher.id === quiz.teacherId || teacher.uid === quiz.teacherId);
                      const submissions = quizSubmissions.filter((submission: any) => submission.quizId === quiz.id);
                      const pending = submissions.filter((submission: any) => !submission.graded).length;
                      return (
                        <tr key={quiz.id}>
                          <td>
                            <div className="table-user">
                              <div className="table-user-avatar" style={{ background: quiz.status === "finished" ? "#8A9E99" : "#12453D" }}>
                                <GraduationCap size={16} color="#fff" />
                              </div>
                              <div className="table-user-info">
                                <h4>{quiz.title || "اختبار بدون عنوان"}</h4>
                                <p>{formatDashboardDate(quiz.createdAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{quiz.teacherName || quizTeacher?.name || "غير محدد"}</td>
                          <td>{quiz.subject || quiz.course || quizTeacher?.subject || "عام"}</td>
                          <td>{quiz.questions?.length || 0}</td>
                          <td>
                            <span className="status-badge pending">{submissions.length} تسليم</span>
                            {pending > 0 && <span style={{ marginRight: "8px", color: "#E3A736", fontWeight: 800, fontSize: "0.8rem" }}>{pending} جديد</span>}
                          </td>
                          <td>
                            <span className={`status-badge ${quiz.status === "finished" ? "inactive" : "active"}`}>
                              {quiz.status === "finished" ? "مغلق" : "نشط"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => setSelectedQuiz(quiz)}>
                                عرض
                              </button>
                              <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleToggleQuizStatus(quiz)}>
                                {quiz.status === "finished" ? "إعادة فتح" : "إغلاق"}
                              </button>
                              <button onClick={() => handleDeleteQuiz(quiz.id)} style={{ padding: "6px 10px", background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا توجد اختبارات حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {selectedQuiz && (
                  <div style={{ marginTop: "24px", background: "#F9FAFA", border: "1px solid #E8EDEC", borderRadius: "14px", overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: "1px solid #E8EDEC", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ margin: 0, color: "#12453D" }}>{selectedQuiz.title}</h3>
                        <p style={{ margin: "4px 0 0", color: "#8A9E99", fontSize: "0.85rem" }}>
                          الموعد النهائي: {selectedQuiz.deadline ? formatDashboardDate(selectedQuiz.deadline) : "بدون موعد"}
                        </p>
                      </div>
                      <button className="btn-secondary" onClick={() => setSelectedQuiz(null)}>إغلاق التفاصيل</button>
                    </div>

                    <div style={{ padding: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                      {selectedQuiz.questions?.map((question: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFullScreenQuizImage(question.questionImage || question.imageUrl)}
                          style={{ background: "#fff", border: "1px solid #E8EDEC", borderRadius: "12px", padding: "10px", textAlign: "right", cursor: "pointer" }}
                        >
                          <div style={{ fontWeight: 800, color: "#12453D", marginBottom: "8px" }}>السؤال {index + 1}</div>
                          {(question.questionImage || question.imageUrl) ? (
                            <img src={question.questionImage || question.imageUrl} alt={`السؤال ${index + 1}`} style={{ width: "100%", height: "150px", objectFit: "contain", borderRadius: "8px", background: "#F4F7F6" }} />
                          ) : (
                            <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A9E99", background: "#F4F7F6", borderRadius: "8px" }}>لا توجد صورة</div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: "0 18px 18px" }}>
                      <h4 style={{ margin: "0 0 12px", color: "#12453D" }}>تسليمات الطلاب</h4>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>الطالب</th>
                              <th>الإجابات</th>
                              <th>الحالة</th>
                              <th>الدرجة</th>
                              <th>الإجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quizSubmissions.filter((submission: any) => submission.quizId === selectedQuiz.id).map((submission: any) => (
                              <tr key={submission.id}>
                                <td>{submission.studentName || "طالب غير معروف"}</td>
                                <td>{submission.answers?.length || 0}</td>
                                <td><span className={`status-badge ${submission.graded ? "active" : "pending"}`}>{submission.graded ? "تم التصحيح" : "بانتظار التصحيح"}</span></td>
                                <td>{submission.score || "-"}</td>
                                <td>
                                  <button className="btn-primary" style={{ padding: "6px 12px" }} onClick={() => { setSelectedSubmission(submission); setGradeInput(submission.score || ""); }}>
                                    عرض وتصحيح
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {quizSubmissions.filter((submission: any) => submission.quizId === selectedQuiz.id).length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ textAlign: "center", padding: "28px", color: "#8A9E99" }}>لا توجد تسليمات لهذا الاختبار بعد.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === "requests" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh" }}>
              <div className="panel-header">
                <h3>طلبات المحاضرات</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>
              <div className="panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>عنوان المحاضرة</th>
                      <th>المعلم</th>
                      <th>المدة / المادة</th>
                      <th>الرابط</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.filter((v: any) => v.status === "pending").length > 0 ? videos.filter((v: any) => v.status === "pending").map((v, i) => (
                      <tr key={v.id || i}>
                        <td>
                          <div className="table-user">
                            <div className="table-user-avatar" style={{ background: "#F59E0B" }}>
                               <Video size={16} color="#fff" />
                            </div>
                            <div className="table-user-info">
                              <h4>{v.title}</h4>
                              <p>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{teachers.find(t => t.uid === v.teacherId)?.name || 'غير محدد'}</td>
                        <td>{v.subject || v.duration || 'عام'}</td>
                        <td>
                          {v.videoUrl || v.link ? (
                            <a href={v.videoUrl || v.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontSize: "0.85rem" }}>استعراض الرابط</a>
                          ) : (
                            <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>لا يوجد رابط</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleAcceptRequest(v.id)} style={{ padding: "6px", background: "#10B981", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleDeclineRequest(v.id)} style={{ padding: "6px", background: "#FF6B6B", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                              <XCircle size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد طلبات معلقة حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : activeTab === "settings" ? (
            <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ padding: "40px", minHeight: "70vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <h2>الإعدادات والمواد الدراسية</h2>
                <button 
                  onClick={async () => {
                    const { signOut } = await import("firebase/auth");
                    try {
                      await signOut(auth);
                      sessionStorage.removeItem('dashboard_auth');
                      setIsAuthenticated(false);
                    } catch {
                      console.error("Failed to sign out dashboard user");
                    }
                  }}
                  style={{
                    background: "#EF4444", color: "white", padding: "10px 20px", borderRadius: "10px", 
                    border: "none", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <LogOut size={18} />
                  تسجيل الخروج
                </button>
              </div>

              <div style={{ background: "#F9FAFB", padding: "20px", borderRadius: "16px", marginBottom: "30px", border: "1px solid #E5E7EB" }}>
                <h3>تحديث بيانات حساب المشرف</h3>
                {adminUpdateMsg && <div style={{ padding: "10px", marginBottom: "15px", background: adminUpdateMsg.includes("خطأ") ? "#FEE2E2" : "#D1FAE5", color: adminUpdateMsg.includes("خطأ") ? "#B91C1C" : "#065F46", borderRadius: "8px" }}>{adminUpdateMsg}</div>}
                <form onSubmit={handleUpdateAdmin} style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "15px" }}>
                  <input 
                    type="email" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="البريد الإلكتروني الجديد (اختياري)"
                    style={{ flex: "1 1 200px", padding: "12px 16px", borderRadius: "8px", border: "1px solid #D1D5DB", outline: "none" }}
                  />
                  <input 
                    type="password" 
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="كلمة المرور الجديدة (اختياري)"
                    style={{ flex: "1 1 200px", padding: "12px 16px", borderRadius: "8px", border: "1px solid #D1D5DB", outline: "none" }}
                  />
                  <button type="submit" style={{ padding: "12px 24px", background: "#F59E0B", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                    حفظ التعديلات
                  </button>
                </form>
              </div>

              <div style={{ background: "#F0FDF4", padding: "24px", borderRadius: "16px", marginBottom: "30px", border: "1px solid #BBF7D0" }}>
                <h3 style={{ color: "#166534", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Smartphone size={22} />
                  إعدادات التطبيق (وضع المراجعة)
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0", color: "#166534" }}>إخفاء تفاصيل الاشتراك والفترة التجريبية</h4>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#15803D" }}>عند تفعيل هذا الخيار، سيتم إخفاء أي ذكر للاشتراكات أو الفترات التجريبية في تطبيق الجوال (مفيد لمراجعة متجر التطبيقات).</p>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={appConfig.hideSubscriptionUI} 
                      onChange={(e) => handleUpdateAppConfig({ hideSubscriptionUI: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ background: "#F9FAFB", padding: "20px", borderRadius: "16px", marginBottom: "30px", border: "1px solid #E5E7EB" }}>
                <h3>إضافة مادة جديدة</h3>
                <form onSubmit={handleAddSubject} style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <input 
                    type="text" 
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="اسم المادة (مثال: رياضيات، فيزياء)"
                    style={{ flex: 1, padding: "12px 16px", borderRadius: "8px", border: "1px solid #D1D5DB", outline: "none" }}
                    required
                  />
                  <button type="submit" style={{ padding: "12px 24px", background: "#3B82F6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                    إضافة
                  </button>
                </form>
              </div>

              <h3>المواد الحالية ({subjects?.length || 0})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px", marginTop: "15px" }}>
                {subjects?.map(sub => (
                  <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "15px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                    {editingSubject?.id === sub.id ? (
                      <div style={{ display: "flex", width: "100%", gap: "8px" }}>
                        <input 
                          autoFocus
                          value={editingSubject?.name || ""} 
                          onChange={(e) => setEditingSubject(prev => prev ? {...prev, name: e.target.value} : null)}
                          style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #3B82F6" }}
                        />
                        <button onClick={() => { if(editingSubject) { handleUpdateSubject(sub.id, editingSubject.name); setEditingSubject(null); } }} style={{ background: "#10B981", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingSubject(null)} style={{ background: "#9CA3AF", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: "600", fontSize: "1.05rem" }}>{sub.name}</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setEditingSubject({id: sub.id, name: sub.name})} style={{ background: "#EFF6FF", color: "#3B82F6", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDeleteSubject(sub.id)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === "notifications" ? (
              <motion.div {...fadeUp()} style={{ background: "white", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                  <div style={{ padding: "16px", background: "#EFF6FF", borderRadius: "16px" }}>
                    <Bell size={32} color="#3B82F6" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#111827" }}>نظام الإشعارات المباشر</h2>
                    <p style={{ color: "#6B7280", margin: "4px 0 0 0" }}>أرسل إشعارات للتطبيق مباشرة إلى المستخدمين</p>
                  </div>
                </div>

                <form onSubmit={handleSendNotification} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>الجمهور المستهدف</label>
                    <div style={{ display: "flex", gap: "16px" }}>
                      {[{ id: "all", label: "الجميع" }, { id: "students", label: "الطلاب فقط" }, { id: "teachers", label: "المعلمون فقط" }].map(t => (
                        <label key={t.id} style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", cursor: "pointer", 
                          border: notificationTarget === t.id ? "2px solid #3B82F6" : "2px solid #E5E7EB", borderRadius: "12px", 
                          background: notificationTarget === t.id ? "#EFF6FF" : "white", fontWeight: "bold", color: notificationTarget === t.id ? "#1E40AF" : "#4B5563", transition: "all 0.2s"
                        }}>
                          <input type="radio" value={t.id} checked={notificationTarget === t.id} onChange={(e) => setNotificationTarget(e.target.value as any)} style={{ display: "none" }} />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>عنوان الإشعار</label>
                    <input
                      type="text"
                      style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid #D1D5DB", fontSize: "16px", background: "#F9FAFB", outline: "none" }}
                      placeholder="مثال: محاضرة جديدة في مادة الفيزياء"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>نص الإشعار</label>
                    <textarea
                      rows={4}
                      style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid #D1D5DB", fontSize: "16px", background: "#F9FAFB", outline: "none", resize: "none" }}
                      placeholder="أدخل رسالة الإشعار كاملة هنا..."
                      value={notificationBody}
                      onChange={(e) => setNotificationBody(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#4B5563" }}>{notificationStatus}</span>
                    <button
                      type="submit"
                      disabled={isSendingNotification}
                      style={{
                        padding: "16px 32px", background: "#3B82F6", color: "white", fontWeight: "bold", fontSize: "16px", borderRadius: "12px", border: "none", cursor: isSendingNotification ? "not-allowed" : "pointer", opacity: isSendingNotification ? 0.7 : 1, display: "flex", alignItems: "center", gap: "8px", transition: "transform 0.1s"
                      }}
                    >
                      {isSendingNotification ? "جاري الإرسال..." : <><Bell size={20} /> إرسال الإشعار</>}
                    </button>
                  </div>
                </form>
              </motion.div>
          ) : (
            <div style={{ textAlign: "center", padding: "50px", opacity: 0.5 }}>
              <h3>قريباً...</h3>
            </div>
          )}
        </div>
      </main>

      {/* Custom Add Student Modal */}
      {isAddQuizOpen && (
        <div className="modal-overlay">
          <motion.div
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            style={{ maxWidth: "620px" }}
          >
            <div className="modal-header">
              <h3>إضافة اختبار جديد</h3>
              <button className="close-modal-btn" onClick={() => setIsAddQuizOpen(false)} disabled={isAddingQuiz}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddQuiz} className="modal-form">
              <div className="form-group">
                <label>عنوان الاختبار</label>
                <input value={newQuizTitle} onChange={(e) => setNewQuizTitle(e.target.value)} placeholder="مثال: اختبار الفصل الأول" required />
              </div>

              <div className="form-group">
                <label>المعلم</label>
                <select
                  value={newQuizTeacherId}
                  onChange={(e) => {
                    const teacher = teachers.find((item: any) => item.id === e.target.value || item.uid === e.target.value);
                    setNewQuizTeacherId(e.target.value);
                    setNewQuizSubject(teacher?.subject || "");
                  }}
                  required
                >
                  <option value="">اختر المعلم...</option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id || teacher.uid} value={teacher.uid || teacher.id}>
                      {teacher.name} {teacher.subject ? `- ${teacher.subject}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>المادة</label>
                <select
                  value={newQuizSubject}
                  onChange={(e) => setNewQuizSubject(e.target.value)}
                >
                  <option value="">حسب مادة المعلم / عام</option>
                  {IRAQI_SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>موعد الإغلاق (اختياري)</label>
                <input type="datetime-local" value={newQuizDeadline} onChange={(e) => setNewQuizDeadline(e.target.value)} />
              </div>

              <div className="form-group">
                <label>صور الأسئلة</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setNewQuizFiles(Array.from(e.target.files || []))}
                  required
                />
                {newQuizFiles.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px", marginTop: "10px" }}>
                    {newQuizFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} style={{ background: "#F4F7F6", border: "1px solid #E8EDEC", borderRadius: "8px", padding: "8px", fontSize: "0.75rem", color: "#12453D" }}>
                        سؤال {index + 1}
                        <div style={{ color: "#8A9E99", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddQuizOpen(false)} disabled={isAddingQuiz}>إلغاء</button>
                <button type="submit" className="btn-primary" disabled={isAddingQuiz}>
                  <Save size={16} />
                  {isAddingQuiz ? "جاري رفع الاختبار..." : "نشر الاختبار"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {selectedSubmission && (
        <div className="modal-overlay">
          <motion.div
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            style={{ maxWidth: "760px" }}
          >
            <div className="modal-header">
              <div>
                <h3>تصحيح إجابة الطالب</h3>
                <p style={{ margin: "4px 0 0", color: "#8A9E99", fontSize: "0.85rem" }}>{selectedSubmission.studentName || "طالب غير معروف"}</p>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedSubmission(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                {selectedSubmission.answers?.map((answer: any, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => answer.answerImage && setFullScreenQuizImage(answer.answerImage)}
                    style={{ background: "#fff", border: "1px solid #E8EDEC", borderRadius: "12px", padding: "10px", textAlign: "right", cursor: answer.answerImage ? "pointer" : "default" }}
                  >
                    <div style={{ fontWeight: 800, color: "#12453D", marginBottom: "8px" }}>إجابة السؤال {index + 1}</div>
                    {answer.answerImage ? (
                      <img src={answer.answerImage} alt={`إجابة ${index + 1}`} style={{ width: "100%", height: "180px", objectFit: "contain", borderRadius: "8px", background: "#F4F7F6" }} />
                    ) : (
                      <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A9E99", background: "#F4F7F6", borderRadius: "8px" }}>لا توجد صورة إجابة</div>
                    )}
                  </button>
                ))}
                {(!selectedSubmission.answers || selectedSubmission.answers.length === 0) && (
                  <div style={{ color: "#8A9E99", padding: "24px" }}>لا توجد إجابات مرفقة.</div>
                )}
              </div>

              <form onSubmit={handleSaveGrade} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="الدرجة مثال: 10/10"
                  style={{ flex: "1 1 220px", padding: "12px 14px", border: "1px solid #D0D9D6", borderRadius: "12px", fontFamily: "inherit" }}
                  required
                />
                <button type="submit" className="btn-primary">
                  <Save size={16} />
                  حفظ الدرجة
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {fullScreenQuizImage && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: "rgba(0,0,0,0.86)" }} onClick={() => setFullScreenQuizImage(null)}>
          <button className="close-modal-btn" style={{ position: "fixed", top: 18, left: 18, color: "#fff", background: "rgba(255,255,255,0.12)" }} onClick={() => setFullScreenQuizImage(null)}>
            <X size={24} />
          </button>
          <img src={fullScreenQuizImage} alt="عرض الصورة" style={{ maxWidth: "94vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px" }} />
        </div>
      )}

      {isAddStudentOpen && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="modal-header">
              <h3>إضافة طالب جديد</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setIsAddStudentOpen(false)}
                disabled={isAddingStudent}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="modal-form">
              <div className="form-group">
                <label>اسم الطالب الكامل</label>
                <input 
                  type="text" 
                  value={newStudentName} 
                  onChange={(e) => setNewStudentName(e.target.value)} 
                  placeholder="مثال: أحمد محمد"
                  required
                  disabled={isAddingStudent}
                />
              </div>
              <div className="form-group">
                <label>اسم المستخدم</label>
                <input 
                  type="text" 
                  value={newStudentEmail} 
                  onChange={(e) => setNewStudentEmail(e.target.value)} 
                  placeholder="مثال: ahmed123"
                  required
                  disabled={isAddingStudent}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="form-group">
                <label>كلمة المرور (مؤقتة)</label>
                <input 
                  type="password" 
                  value={newStudentPassword} 
                  onChange={(e) => setNewStudentPassword(e.target.value)} 
                  placeholder="كلمة مرور مبدئية"
                  required
                  disabled={isAddingStudent}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="form-group">
                <label>الصورة الشخصية (اختياري)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setNewStudentImage(e.target.files ? e.target.files[0] : null)} 
                  disabled={isAddingStudent}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleGenerateTempStudent}
                  disabled={isAddingStudent}
                  style={{ marginRight: 'auto', background: "#E8EDEC", color: "#12453D" }}
                >
                  توليد حساب مؤقت
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsAddStudentOpen(false)}
                  disabled={isAddingStudent}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isAddingStudent}
                >
                  {isAddingStudent ? "جاري الإضافة..." : "حفظ وإضافة"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isAddTeacherOpen && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="modal-header">
              <h3>إضافة معلم جديد</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setIsAddTeacherOpen(false)}
                disabled={isAddingTeacher}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="modal-form">
              <div className="form-group">
                <label>اسم المعلم</label>
                <input 
                  type="text" 
                  value={newTeacherName} 
                  onChange={(e) => setNewTeacherName(e.target.value)} 
                  placeholder="مثال: أ. أحمد"
                  required
                  disabled={isAddingTeacher}
                />
              </div>
              <div className="form-group">
                <label>اسم المستخدم</label>
                <input 
                  type="text" 
                  value={newTeacherEmail} 
                  onChange={(e) => setNewTeacherEmail(e.target.value)} 
                  placeholder="مثال: teacher_ahmed"
                  required
                  disabled={isAddingTeacher}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="form-group">
                <label>كلمة المرور (مؤقتة)</label>
                <input 
                  type="password" 
                  value={newTeacherPassword} 
                  onChange={(e) => setNewTeacherPassword(e.target.value)} 
                  placeholder="******"
                  required
                  disabled={isAddingTeacher}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="form-group">
                <label>المادة (التخصص)</label>
                <select 
                  value={newTeacherSubject} 
                  onChange={(e) => setNewTeacherSubject(e.target.value)} 
                  required
                  disabled={isAddingTeacher}
                  style={{ textAlign: "right" }}
                >
                  <option value="" disabled>اختر المادة...</option>
                  {IRAQI_SUBJECTS.map((subject, idx) => (
                    <option key={idx} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>الصورة الشخصية (اختياري)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setNewTeacherImage(e.target.files ? e.target.files[0] : null)} 
                  disabled={isAddingTeacher}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsAddTeacherOpen(false)}
                  disabled={isAddingTeacher}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isAddingTeacher}
                >
                  {isAddingTeacher ? "جاري الإضافة..." : "حفظ وإضافة"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Add Video Modal */}
      {isAddVideoOpen && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="modal-header">
              <h3>رفع محاضرة جديدة</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setIsAddVideoOpen(false)}
                disabled={isAddingVideo}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddVideo} className="modal-form">
              <div className="form-group">
                <label>عنوان المحاضرة</label>
                <input 
                  type="text" 
                  value={newVideoTitle} 
                  onChange={(e) => setNewVideoTitle(e.target.value)} 
                  placeholder="مثال: مقدمة في الجبر"
                  required
                  disabled={isAddingVideo}
                />
              </div>
              <div className="form-group">
                <label>تفاصيل المحاضرة</label>
                <textarea 
                  value={newVideoDescription} 
                  onChange={(e) => setNewVideoDescription(e.target.value)} 
                  placeholder="وصف أو تفاصيل الدرس..."
                  rows={3}
                  disabled={isAddingVideo}
                />
              </div>
              <div className="form-group">
                <label>المعلم (الناشر)</label>
                <select 
                  value={newVideoTeacherId}
                  onChange={(e) => {
                    setNewVideoTeacherId(e.target.value);
                    const selectedT = teachers.find(t => t.uid === e.target.value || t.id === e.target.value);
                    if (selectedT && selectedT.subject) {
                      setNewVideoSubject(selectedT.subject);
                    }
                  }}
                  required
                  disabled={isAddingVideo}
                >
                  <option value="" disabled>اختر المعلم...</option>
                  {teachers.map(t => (
                    <option key={t.uid || t.id} value={t.uid || t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>المادة الدراسية</label>
                <input 
                  type="text" 
                  value={newVideoSubject} 
                  onChange={(e) => setNewVideoSubject(e.target.value)} 
                  placeholder="مثال: الرياضيات"
                  required
                  disabled={isAddingVideo}
                />
              </div>
              <div className="form-group">
                <label>قائمة التشغيل (Playlist)</label>
                <select 
                  value={isCreatingNewPlaylist ? "new_playlist_custom" : newVideoPlaylistName}
                  onChange={(e) => {
                    if (e.target.value === "new_playlist_custom") {
                      setIsCreatingNewPlaylist(true);
                      setNewVideoPlaylistName("");
                    } else {
                      setIsCreatingNewPlaylist(false);
                      setNewVideoPlaylistName(e.target.value);
                    }
                  }}
                  disabled={isAddingVideo || !newVideoTeacherId}
                  style={{ marginBottom: isCreatingNewPlaylist ? '10px' : '0' }}
                >
                  <option value="">بدون قائمة تشغيل (عام)</option>
                  {newVideoTeacherId && Array.from(new Set(
                    videos
                      .filter(v => (v.teacherId === newVideoTeacherId) && v.playlistName)
                      .map(v => v.playlistName)
                  )).map((pName: string) => (
                    <option key={pName} value={pName}>{pName}</option>
                  ))}
                  <option value="new_playlist_custom" style={{ color: "#E3A736", fontWeight: "bold" }}>+ إنشاء قائمة جديدة</option>
                </select>
                {isCreatingNewPlaylist && (
                  <input
                    type="text"
                    value={newPlaylistInput}
                    onChange={(e) => setNewPlaylistInput(e.target.value)}
                    placeholder="اسم القائمة الجديدة"
                    required={isCreatingNewPlaylist}
                    disabled={isAddingVideo}
                    style={{ marginTop: '10px' }}
                  />
                )}
              </div>
              <div className="form-group">
                <label>ملف الفيديو (MP4)</label>
                <input 
                  type="file" 
                  accept="video/mp4,video/x-m4v,video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewVideoFile(e.target.files[0]);
                    }
                  }} 
                  required
                  disabled={isAddingVideo}
                />
                {isAddingVideo && (
                  <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#E3A736", display: "flex", alignItems: "center", gap: 6 }}>
                     <div className="spinner" style={{ width: 14, height: 14, border: "2px solid #E3A736", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                     جاري رفع الفيديو إلى السحابة، يرجى الانتظار...
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsAddVideoOpen(false)}
                  disabled={isAddingVideo}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isAddingVideo}
                >
                  {isAddingVideo ? "جاري الرفع..." : "رفع وحفظ"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Target Manage / QR Code Modal */}
      {manageTarget && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <motion.div
            className="modal-content glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ maxWidth: "450px" }}
          >
            <div className="modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {manageTarget.type === 'student' ? <GraduationCap size={20} color="#12453D"/> : <BookOpen size={20} color="#12453D"/>}
                إدارة {manageTarget.type === 'student' ? 'الطالب' : 'المعلم'}
              </h3>
              <button
                className="close-modal-btn"
                onClick={() => { setManageTarget(null); setShowQR(false); setIsEditingUser(false); }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  background: manageTarget.data.color || "#12453D",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  overflow: "hidden"
                }}>
                  {manageTarget.data.image ? (
                     <img src={manageTarget.data.image} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover"}} />
                  ) : (
                    manageTarget.data.avatar || manageTarget.data.name?.charAt(0) || "U"
                  )}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h3 style={{ margin: "0 0 5px 0" }}>{manageTarget.data.name}</h3>
                  <span style={{ fontSize: "0.85rem", color: "#8A9E99" }}>
                    {manageTarget.type === 'student' ? 'طالب - ' + (manageTarget.data.subject || 'عام') : 'معلم - ' + manageTarget.data.subject}
                  </span>
                </div>
              </div>

              {!isEditingUser ? (
                <>

                  {manageTarget.type === 'teacher' && (
                    <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "2px solid #E8EDEC", paddingBottom: "10px", overflowX: "auto" }}>
                      <button onClick={() => setManageTargetTab('stats')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'stats' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'stats' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📊 الإحصائيات</button>
                      <button onClick={() => setManageTargetTab('videos')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'videos' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'videos' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>🎥 المحاضرات</button>
                      <button onClick={() => { setChatInitialTeacherId(manageTarget.data.id || manageTarget.data.uid); setActiveTab("groups"); setManageTarget(null); }} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: "#F4F7F6", color: "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>💬 الدردشة</button>
                      <button onClick={() => setManageTargetTab('settings')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'settings' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'settings' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>⚙️ الإعدادات</button>
                    </div>
                  )}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'stats' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId);
                     const teacherPlaylistsCount = new Set(teacherVideos.map((v: any) => v.playlistName).filter(Boolean)).size;
                     const subscribedStudents = students.filter((s: any) => {
                       if (!s.subscription) return false;
                       if (s.subscription.type === 'all') return true;
                       if (s.subscription.allowedTeachers && Array.isArray(s.subscription.allowedTeachers)) {
                         return s.subscription.allowedTeachers.includes(teacherId);
                       }
                       if (s.subject === manageTarget.data.subject) return true;
                       return false;
                     }).length;
                     
                     return (
                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                          <div style={{ background: "linear-gradient(135deg, #F0FFF4 0%, #E8F5E9 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", border: "1px solid #C8E6C9" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#12453D" }}>{subscribedStudents}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>طالب مشترك</div>
                          </div>
                          <div style={{ background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", border: "1px solid #FFE082" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#E3A736" }}>{teacherVideos.length}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>محاضرة مرفوعة</div>
                          </div>
                          <div style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)", padding: "20px 15px", borderRadius: "12px", textAlign: "center", gridColumn: "1 / -1", border: "1px solid #90CAF9" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1565C0" }}>{teacherPlaylistsCount}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99", marginTop: "4px" }}>قائمة تشغيل</div>
                          </div>
                       </div>
                     );
                  })()}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'videos' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId && (v.status === "accepted" || v.status === "active" || !v.status));
                     if (teacherVideos.length === 0) return <div style={{ textAlign: "center", padding: "30px", color: "#8A9E99", background: "#F9FAFA", borderRadius: "12px", marginBottom: "20px" }}>🎥 لا توجد محاضرات مرفوعة لهذا المعلم.</div>;
                     
                     return (
                       <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px", paddingRight: "5px" }}>
                          {teacherVideos.map((v: any) => (
                             <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F7F6", padding: "12px 14px", borderRadius: "10px", border: "1px solid #E8EDEC" }}>
                               <div style={{ flex: 1 }}>
                                 <h5 style={{ margin: "0 0 4px 0", color: "#12453D", fontSize: "0.9rem" }}>{v.title}</h5>
                                 <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>{v.playlistName || 'بدون قائمة'} • {v.subject || 'عام'}</div>
                               </div>
                               <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "rgba(255,59,48,0.1)", border: "none", color: "#FF3B30", cursor: "pointer", padding: "6px", borderRadius: "6px" }} title="حذف الفيديو"><Trash2 size={16} /></button>
                             </div>
                          ))}
                       </div>
                     );
                  })()}

                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || manageTarget.type === 'student') && (
                    <>
                  {manageTarget.type === 'teacher' && (
                    <div className="form-group">
                      <label>تحديث الصورة الشخصية للمعلّم</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUpdateTeacherImage(manageTarget.data.id || manageTarget.data.uid, e.target.files[0]);
                          }
                        }}
                      />
                      <small style={{ color: "#8A9E99" }}>سيتم رفعها وتحديثها فورياً.</small>
                    </div>
                  )}

                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "20px" }}>
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>اسم المستخدم</span>
                      <strong>{manageTarget.data.username || manageTarget.data.email || 'غير متوفر'}</strong>
                    </div>
                    {manageTarget.data.password && (
                      <div style={{ marginBottom: "0", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>كلمة المرور المؤقتة</span>
                        <strong style={{ fontFamily: "monospace" }}>{manageTarget.data.password}</strong>
                      </div>
                    )}
                  </div>
                    </>
                  )}

                  {manageTarget.type === 'student' && (
                    <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "2px solid #E8EDEC", paddingBottom: "10px", overflowX: "auto" }}>
                      <button onClick={() => setManageTargetTab('stats')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'stats' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'stats' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📊 الإحصائيات</button>
                      <button onClick={() => setManageTargetTab('videos')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'videos' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'videos' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>📋 الاشتراك</button>
                      <button onClick={() => setManageTargetTab('settings')} style={{ padding: "8px 14px", border: "none", borderRadius: "8px", background: manageTargetTab === 'settings' ? "#12453D" : "#F4F7F6", color: manageTargetTab === 'settings' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>⚙️ الإعدادات</button>
                    </div>
                  )}

                  {manageTarget.type === 'student' && manageTargetTab === 'stats' && (() => {
                     const sub = manageTarget.data.subscription || { type: 'none' };
                     const ft = manageTarget.data.freeTrial || {};
                     const isSubActive = sub.endDate ? new Date() < new Date(sub.endDate) : sub.type === 'full';
                     const isFreeTrialActive = ft.isActive && ft.endDate && new Date() < new Date(ft.endDate);
                     const subStatus = isSubActive ? '✅ مشترك فعال' : isFreeTrialActive ? '🎁 تجربة مجانية' : '❌ غير مشترك';
                     const subColor = isSubActive ? '#34C759' : isFreeTrialActive ? '#E3A736' : '#FF3B30';
                     
                     let remainingDays = 0;
                     if (sub.endDate) {
                       remainingDays = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000*60*60*24)));
                     } else if (isFreeTrialActive && ft.endDate) {
                       remainingDays = Math.max(0, Math.ceil((new Date(ft.endDate).getTime() - Date.now()) / (1000*60*60*24)));
                     }

                     const createdAt = manageTarget.data.createdAt ? new Date(manageTarget.data.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر';
                     
                     return (
                       <div style={{ marginBottom: "20px" }}>
                          {/* Subscription Status Banner */}
                          <div style={{ background: subColor + '15', padding: "16px", borderRadius: "14px", marginBottom: "14px", border: "1px solid " + subColor + "30", textAlign: "center" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: subColor, marginBottom: "4px" }}>{subStatus}</div>
                            {remainingDays > 0 && <div style={{ fontSize: "0.8rem", color: "#8A9E99" }}>متبقي {remainingDays} يوم</div>}
                          </div>

                          {/* Stats Grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                            <div style={{ background: "linear-gradient(135deg, #F0FFF4, #E8F5E9)", padding: "14px 10px", borderRadius: "12px", textAlign: "center", border: "1px solid #C8E6C9" }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#12453D" }}>{manageTarget.data.userId || '---'}</div>
                              <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>رقم الطالب</div>
                            </div>
                            <div style={{ background: "linear-gradient(135deg, #E3F2FD, #BBDEFB)", padding: "14px 10px", borderRadius: "12px", textAlign: "center", border: "1px solid #90CAF9" }}>
                              <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#1565C0" }}>{manageTarget.data.progress || 0}%</div>
                              <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>التقدم</div>
                            </div>
                          </div>

                          {/* Detail Rows */}
                          <div style={{ background: "#F9FAFA", padding: "14px", borderRadius: "12px", border: "1px solid #E8EDEC" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>تاريخ الإنشاء</span>
                              <strong style={{ fontSize: "0.85rem" }}>{createdAt}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>نوع الاشتراك</span>
                              <strong style={{ fontSize: "0.85rem" }}>{sub.type === 'full' ? 'كامل' : sub.type === 'none' ? 'بدون اشتراك' : sub.type}</strong>
                            </div>
                            {sub.startDate && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>بداية الاشتراك</span>
                                <strong style={{ fontSize: "0.85rem" }}>{new Date(sub.startDate).toLocaleDateString('ar-EG')}</strong>
                              </div>
                            )}
                            {sub.endDate && (
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>نهاية الاشتراك</span>
                                <strong style={{ fontSize: "0.85rem", color: remainingDays <= 3 ? '#FF3B30' : 'inherit' }}>{new Date(sub.endDate).toLocaleDateString('ar-EG')}</strong>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>الجهاز</span>
                              <strong style={{ fontSize: "0.85rem" }}>{manageTarget.data.boundDeviceId ? (manageTarget.data.boundDeviceOS || 'مربوط') : 'غير مربوط'}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#8A9E99", fontSize: "0.85rem" }}>تغييرات الجهاز</span>
                              <strong style={{ fontSize: "0.85rem", color: (manageTarget.data.deviceChangeCount || 0) >= 3 ? "#FF3B30" : "inherit" }}>{manageTarget.data.deviceChangeCount || 0}</strong>
                            </div>
                          </div>
                       </div>
                     );
                  })()}

                  {manageTarget.type === 'student' && manageTargetTab === 'videos' && (() => {
                     const sub = manageTarget.data.subscription || { type: 'none' };
                     const studentId = manageTarget.data.id || manageTarget.data.uid;
                     return (
                       <div style={{ marginBottom: "20px" }}>
                          {/* Quick Subscribe */}
                          <div style={{ background: "#F9FAFA", padding: "16px", borderRadius: "14px", marginBottom: "14px", border: "1px solid #E8EDEC" }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#12453D" }}>⚡ إدارة الاشتراك</h4>
                            
                            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                              <button 
                                onClick={async () => {
                                  const days = prompt('عدد أيام الاشتراك:');
                                  if (!days) return;
                                  const endDate = new Date(); endDate.setDate(endDate.getDate() + parseInt(days));
                                  const subData = { type: 'full', startDate: new Date().toISOString(), endDate: endDate.toISOString(), allowedTeachers: teachers.map((t: any) => t.id || t.uid), allowedSubjects: [] };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم تفعيل الاشتراك بنجاح ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ flex: 1, padding: "10px", background: "#12453D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >✅ تفعيل اشتراك</button>
                              <button
                                onClick={async () => {
                                  if (!confirm('هل أنت متأكد من إلغاء اشتراك هذا الطالب؟')) return;
                                  const subData = { type: 'none', allowedTeachers: [], allowedSubjects: [] };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم إلغاء الاشتراك ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ flex: 1, padding: "10px", background: "rgba(255,59,48,0.1)", color: "#FF3B30", border: "1px solid rgba(255,59,48,0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >❌ إلغاء اشتراك</button>
                            </div>

                            {/* Extend existing subscription */}
                            {sub.endDate && (
                              <button
                                onClick={async () => {
                                  const days = prompt('عدد أيام التمديد:');
                                  if (!days) return;
                                  const currentEnd = new Date(sub.endDate) > new Date() ? new Date(sub.endDate) : new Date();
                                  currentEnd.setDate(currentEnd.getDate() + parseInt(days));
                                  const subData = { ...sub, endDate: currentEnd.toISOString() };
                                  try {
                                    const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                    await u(d(db, 'students', studentId), { subscription: subData });
                                    setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                    alert('تم تمديد الاشتراك بنجاح ✅');
                                  } catch(e: any) { alert('خطأ: ' + e.message); }
                                }}
                                style={{ width: "100%", padding: "10px", background: "#F4F7F6", color: "#12453D", border: "1px solid #E8EDEC", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                              >📅 تمديد الاشتراك الحالي</button>
                            )}
                          </div>

                          {/* Select teachers */}
                          <div style={{ background: "#F9FAFA", padding: "16px", borderRadius: "14px", border: "1px solid #E8EDEC" }}>
                            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#12453D" }}>🎓 المعلمين المسموح بهم</h4>
                            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                              {teachers.map((t: any) => {
                                const tid = t.id || t.uid;
                                const allowed = sub.allowedTeachers || [];
                                const isAllowed = allowed.includes(tid);
                                return (
                                  <label key={tid} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: isAllowed ? "rgba(18,69,61,0.08)" : "#fff", borderRadius: "8px", cursor: "pointer", border: isAllowed ? "1px solid rgba(18,69,61,0.2)" : "1px solid #E8EDEC" }}>
                                    <input type="checkbox" checked={isAllowed} onChange={async () => {
                                      const newAllowed = isAllowed ? allowed.filter((id: string) => id !== tid) : [...allowed, tid];
                                      const subData = { ...sub, allowedTeachers: newAllowed };
                                      try {
                                        const { doc: d, updateDoc: u } = await import('firebase/firestore');
                                        await u(d(db, 'students', studentId), { subscription: subData });
                                        setManageTarget({ ...manageTarget, data: { ...manageTarget.data, subscription: subData } });
                                      } catch(e: any) { alert('خطأ: ' + e.message); }
                                    }} />
                                    <span style={{ fontSize: "0.85rem", fontWeight: isAllowed ? "bold" : "normal", color: "#12453D" }}>{t.name} - {t.subject}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                       </div>
                     );
                  })()}
                  {manageTarget.type === 'student' && manageTargetTab === 'settings' && (
                    <>
                    <div style={{ background: "rgba(18, 69, 61, 0.05)", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid rgba(18, 69, 61, 0.1)" }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#12453D", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Smartphone size={16} />
                        ربط الجهاز (الأمان)
                      </h4>
                      <div style={{ fontSize: "0.85rem", color: "#4A5D59" }}>
                        {manageTarget.data.boundDeviceId ? (
                          <>
                            <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                              <span>الجهاز المرتبط:</span>
                              <strong style={{ textTransform: 'capitalize' }}>{manageTarget.data.boundDeviceOS || 'غير معروف'}</strong>
                            </div>
                            <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                              <span>تاريخ الربط:</span>
                              <strong>{manageTarget.data.boundAt ? new Date(manageTarget.data.boundAt).toLocaleDateString('ar-EG') : 'غير متوفر'}</strong>
                            </div>
                            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                              <span>تغييرات الجهاز:</span>
                              <strong style={{ color: (manageTarget.data.deviceChangeCount || 0) >= 3 ? "#FF3B30" : "inherit" }}>
                                {manageTarget.data.deviceChangeCount || 0}
                                {(manageTarget.data.deviceChangeCount || 0) >= 3 && " (نشاط مشبوه ⚠️)"}
                              </strong>
                            </div>
                            <button 
                              onClick={handleResetDevice}
                              className="btn-secondary"
                              style={{ width: "100%", fontSize: "0.85rem", padding: "8px", background: "rgba(255,255,255,0.8)" }}
                              disabled={isSavingUser}
                            >
                              إعادة تعيين ربط الجهاز
                            </button>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, color: "#8A9E99", fontStyle: "italic" }}>لا يوجد جهاز مرتبط حالياً. سيتم الربط عند أول تسجيل دخول.</p>
                            <button 
                              onClick={handleSimulateDeviceBind}
                              className="btn-secondary"
                              style={{ width: "100%", fontSize: "0.85rem", padding: "8px", marginTop: "12px", background: "rgba(255,255,255,0.8)" }}
                              disabled={isSavingUser}
                            >
                              محاكاة ربط جهاز (للاختبار)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || (manageTarget.type === 'student' && manageTargetTab === 'settings')) && (
                    <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}
                        onClick={handleEditUserToggle}
                      >
                        <Edit2 size={16} />
                        تعديل البيانات
                      </button>
                      <button 
                        style={{ flex: 1, display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", background: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "8px", cursor: "pointer", padding: "10px", fontWeight: "600" }}
                        onClick={handleDeleteTargetUser}
                        disabled={isSavingUser}
                      >
                        <Trash2 size={16} />
                        {isSavingUser ? "..." : "حذف الحساب"}
                      </button>
                    </div>
                  )}

                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || (manageTarget.type === 'student' && manageTargetTab === 'settings')) && (
                    <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                      {(manageTarget.data.username || manageTarget.data.email) && manageTarget.data.password ? (
                      <>
                        {!showQR ? (
                          <button
                            className="btn-primary"
                            style={{ width: "100%" }}
                            onClick={() => setShowQR(true)}
                          >
                            رمز الدخول (QR Code)
                          </button>
                        ) : (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <h4 style={{ marginBottom: "16px" }}>رمز الدخول (QR Code)</h4>
                            <div
                              id="qr-print-area"
                              style={{ display: "inline-block", background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                            >
                              <QRCode
                                value={(manageTarget.data.username || manageTarget.data.email) + '|' + manageTarget.data.password}
                                size={180}
                                bgColor="#ffffff"
                                fgColor="#0B2923"
                                level="M"
                              />
                              <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#333", fontWeight: 600 }}>
                                {manageTarget.data.name}
                              </div>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "16px", lineHeight: "1.5" }}>
                              للتسجيل مباشرة دون الحاجة لكتابة اسم المستخدم وكلمة المرور.
                            </p>
                            <button
                              className="btn-secondary"
                              style={{ marginTop: "12px", width: "100%" }}
                              onClick={() => {
                                const el = document.getElementById("qr-print-area");
                                if (!el) return;
                                const win = window.open("", "_blank", "width=400,height=500");
                                if (!win) return;
                                win.document.write(`
                                  <html><head><title>رمز دخول - ${manageTarget.data.name}</title>
                                  <style>
                                    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #fff; }
                                    .wrap { text-align: center; padding: 32px; border: 2px solid #0B2923; border-radius: 16px; display: inline-block; }
                                    h2 { color: #0B2923; margin-bottom: 8px; font-size: 18px; }
                                    p { color: #555; font-size: 13px; margin-top: 12px; }
                                  </style></head><body>
                                  <div class="wrap">
                                    <h2>${manageTarget.data.name}</h2>
                                    ${el.querySelector("svg")?.outerHTML ?? ""}
                                    <p>امسح الرمز للدخول إلى التطبيق</p>
                                  </div>
                                  <script>window.onload = () => { window.print(); window.close(); }</script>
                                  </body></html>
                                `);
                                win.document.close();
                              }}
                            >
                              طباعة الرمز
                            </button>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: "#E3A736", background: "rgba(227, 167, 54, 0.1)", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        لا يمكن توليد رمز استجابة سريعة، تنقص بيانات الدخول أو كلمة المرور.
                      </div>
                    )}
                  </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleUpdateTargetUser} className="modal-form">
                  <div className="form-group">
                    <label>الاسم الكامل</label>
                    <input 
                      type="text" 
                      value={editFormData.name} 
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  {manageTarget.type === 'teacher' && (
                    <>
                      <div className="form-group">
                        <label>المادة (التخصص)</label>
                        <select 
                          value={editFormData.subject} 
                          onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                          required
                          style={{ textAlign: "right", padding: "12px", borderRadius: "10px", border: "1px solid #E8EDEC", backgroundColor: "#FAFBFA", width: "100%", fontSize: "0.95rem" }}
                        >
                          <option value="" disabled>اختر المادة...</option>
                          {IRAQI_SUBJECTS.map((subject, idx) => (
                            <option key={idx} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flexDirection: 'row-reverse', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          id="canUploadLectures"
                          checked={editFormData.canUploadLectures}
                          onChange={e => setEditFormData({ ...editFormData, canUploadLectures: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <label htmlFor="canUploadLectures" style={{ marginBottom: 0, cursor: 'pointer' }}>السماح برفع المحاضرات (رفع الفيديوهات)</label>
                      </div>
                    </>
                  )}
                  <p style={{ fontSize: "0.8rem", color: "#8A9E99", marginBottom: "20px" }}>
                    ملاحظة: لتغيير البريد الإلكتروني أو كلمة المرور بشكل كامل يجب استخدام لوحة تحكم Firebase Auth للحفاظ على أمان المنصة.
                  </p>
                  <div className="modal-actions" style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditingUser(false)}
                      disabled={isSavingUser}
                    >
                      إلغاء التعديل
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}
                      disabled={isSavingUser}
                    >
                      <Save size={16} />
                      {isSavingUser ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;
