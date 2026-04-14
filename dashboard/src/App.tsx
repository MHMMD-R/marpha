import { motion } from "framer-motion";
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
} from "lucide-react";
import { GroupsPanel } from "./GroupsPanel";
import "./index.css";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { uploadToR2 } from "./r2";

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
  { icon: Bell, label: "الإشعارات الذكية", id: "notifications" },
];

const NAV_ITEMS_SYSTEM = [
  { icon: Bell, label: "الإشعارات", id: "notifications" },
  { icon: Settings, label: "الإعدادات", id: "settings" },
];

// ─── Animation helpers ──────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

// ─── App ────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('dashboard_auth') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
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
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  const [manageTarget, setManageTarget] = useState<{ type: 'student' | 'teacher', data: any } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminUpdateMsg, setAdminUpdateMsg] = useState("");
  const [editingSubject, setEditingSubject] = useState<{id: string, name: string} | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", subject: "" });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleEditUserToggle = () => {
    if (manageTarget) {
      setEditFormData({
        name: manageTarget.data.name || "",
        subject: manageTarget.data.subject || ""
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
        ...(manageTarget.type === 'teacher' ? { subject: editFormData.subject } : {})
      });
      
      setManageTarget({
        ...manageTarget,
        data: { ...manageTarget.data, name: editFormData.name, subject: editFormData.subject }
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
    setNotificationStatus("جاري استخراج بيانات المستخدمين...");

    try {
      let targetTokens: string[] = [];

      if (notificationTarget === "students" || notificationTarget === "all") {
        targetTokens = [...targetTokens, ...students.map(s => s.expoPushToken).filter(Boolean)];
      }
      if (notificationTarget === "teachers" || notificationTarget === "all") {
        targetTokens = [...targetTokens, ...teachers.map(t => t.expoPushToken).filter(Boolean)];
      }

      if (targetTokens.length === 0) {
        setNotificationStatus("خطأ: لم يتم العثور على أجهزة مسجلة لتلقي الإشعارات.");
        setIsSendingNotification(false);
        return;
      }

      setNotificationStatus(`جاري إرسال الإشعار إلى ${targetTokens.length} جهاز...`);

      const messages = targetTokens.map(token => ({
        to: token,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: { route: 'notification' },
      }));

      const res = await fetch('/expo-push-api/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) throw new Error("Failed to send notification");

      setNotificationStatus("تم الإرسال بنجاح!");
      setNotificationTitle("");
      setNotificationBody("");
      setTimeout(() => setNotificationStatus(""), 3000);
    } catch (error: any) {
      setNotificationStatus(`حدث خطأ: ${error.message}`);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherSubject || !newTeacherEmail || !newTeacherPassword) return;
    
    setIsAddingTeacher(true);
    try {
      let finalTeacherName = newTeacherName.trim();
      if (!finalTeacherName.startsWith("استاذ ") && !finalTeacherName.startsWith("أستاذ ")) {
        finalTeacherName = "استاذ " + finalTeacherName;
      }

      // Use secondaryAuth so the dashboard user (admin) doesn't get logged out!
      const { secondaryAuth } = await import("./firebase");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newTeacherEmail, newTeacherPassword);
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

      // Save to firestore using the primary db instance (since admin has rights)
      await setDoc(doc(db, "teachers", user.uid), {
        uid: user.uid,
        name: finalTeacherName,
        email: newTeacherEmail,
        password: newTeacherPassword, // saved for barcode sign-in
        subject: newTeacherSubject,
        image: profileImage,
        createdAt: new Date().toISOString()
      });

      // Quick logout from the secondary instance to clear its session completely
      await secondaryAuth.signOut();

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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentPassword) return;
    
    setIsAddingStudent(true);
    try {
      const { secondaryAuth } = await import("./firebase");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudentEmail, newStudentPassword);
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

      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        name: newStudentName,
        email: newStudentEmail,
        password: newStudentPassword,
        subject: "عام",
        progress: 0,
        status: "active",
        image: profileImage,
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
    if (!newVideoTitle || !newVideoSubject || !newVideoFile) return;
    
    setIsAddingVideo(true);
    try {
      // 1. Upload video to Cloudflare R2
      // Using subject name for the folder keeps things organized
      const folderPath = newVideoSubject.replace(/[^a-zA-Z0-9]/g, "_"); 
      const publicUrl = await uploadToR2(newVideoFile, "LECTURES", folderPath);
      
      // 2. Save metadata to Firestore
      await addDoc(collection(db, "lectures"), {
        title: newVideoTitle,
        description: newVideoDescription,
        subject: newVideoSubject,
        videoUrl: publicUrl,
        createdAt: new Date().toISOString()
      });

      // 3. Send Push Notification to all students
      const targetTokens = students.map(s => s.expoPushToken).filter(Boolean);
      if (targetTokens.length > 0) {
        const messages = targetTokens.map(token => ({
          to: token,
          sound: 'default',
          title: `محاضرة جديدة: ${newVideoSubject}`,
          body: `تمت إضافة محاضرة جديدة بعنوان "${newVideoTitle}"`,
          data: { route: 'lectures' },
        }));

        fetch('/expo-push-api/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        }).catch(err => console.error("Push notification error:", err));
      }

      // Reset form
      setNewVideoTitle("");
      setNewVideoDescription("");
      setNewVideoSubject("");
      setNewVideoFile(null);
      setIsAddVideoOpen(false);
    } catch (err: any) {
      alert("حدث خطأ أثناء الرفع: " + err.message);
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "lectures", id), { status: "accepted" });
    } catch(err: any) {
      alert("خطأ في القبول: " + err.message);
    }
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "lectures", id), { status: "declined" });
    } catch(err: any) {
      alert("خطأ في الرفض: " + err.message);
    }
  };


  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newSubjectName.trim()) return;
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "subjects"), { name: newSubjectName.trim(), createdAt: new Date().toISOString() });
      setNewSubjectName("");
      alert("تمت الإضافة بنجاح");
    } catch(err: any) { alert(err.message); }
  };

  const handleDeleteSubject = async (id: string) => {
    if(!confirm("تأكيد الحذف؟")) return;
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "subjects", id));
      alert("تم الحذف بنجاح");
    } catch(err: any) { alert(err.message); }
  };


  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newAdminEmail && !newAdminPassword) return;
    try {
      const { auth } = await import("./firebase");
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
      const { doc, updateDoc } = await import("firebase/firestore");
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

      return () => {
        unsubSubjects();
        unsubStudents();
        unsubTeachers();
        
        unsubVideos();
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
    const email = loginUsername.includes('@') ? loginUsername : `${loginUsername}@marpha.app`;
    try {
      await signInWithEmailAndPassword(auth, email, loginPassword);
      setIsAuthenticated(true);
      sessionStorage.setItem('dashboard_auth', 'true');
      setLoginError("");
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setLoginError("بيانات الدخول غير صحيحة");
      } else {
        setLoginError(`حدث خطأ أثناء تسجيل الدخول: ${err.message}`);
      }
    }
  };

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
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#12453D', color: '#fff', fontSize: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(18, 69, 61, 0.2)' }}
          >
            تسجيل الدخول <ChevronLeft size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* ═══ Sidebar ═══ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <h1>معرفى</h1>
            <span>لوحة التحكم</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">القائمة</div>
          {NAV_ITEMS.map((item, i) => (
            <a 
              key={i} 
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
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
              onClick={() => setActiveTab(item.id)}
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
                                  <h4>{s.name}</h4>
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
                              <h4>{s.name}</h4>
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
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => { setManageTarget({ type: 'student', data: s }); setShowQR(false); setIsEditingUser(false); }}>إدارة</button>
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
                          <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }} onClick={() => { setManageTarget({ type: 'teacher', data: t }); setShowQR(false); setIsEditingUser(false); }}>إدارة</button>
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
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => setIsAddVideoOpen(true)}>+ رفع فيديو جديد</button>
                  <span className="panel-header-action" onClick={() => setActiveTab("dashboard")}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
                </div>
              </div>
              <div className="panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>عنوان المحاضرة</th>
                      <th>المادة</th>
                      <th>الرابط / الملف</th>
                      <th>تاريخ الإضافة</th>
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
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد محاضرات مقبولة أو مسجلة مسبقاً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : activeTab === "groups" ? (
            <GroupsPanel />
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
                    } catch(e) {}
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
                <label>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={newStudentEmail} 
                  onChange={(e) => setNewStudentEmail(e.target.value)} 
                  placeholder="example@mail.com"
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
                <label>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={newTeacherEmail} 
                  onChange={(e) => setNewTeacherEmail(e.target.value)} 
                  placeholder="teacher@mail.com"
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
                      <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>البريد الإلكتروني</span>
                      <strong>{manageTarget.data.email || 'غير متوفر'}</strong>
                    </div>
                    {manageTarget.data.password && (
                      <div style={{ marginBottom: "0", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#8A9E99", fontSize: "0.9rem" }}>كلمة المرور المؤقتة</span>
                        <strong style={{ fontFamily: "monospace" }}>{manageTarget.data.password}</strong>
                      </div>
                    )}
                  </div>
                  
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

                  <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                    {manageTarget.data.email && manageTarget.data.password ? (      
                      <>
                        {!showQR ? (
                          <button 
                            className="btn-primary" 
                            style={{ width: "100%" }}
                            onClick={() => setShowQR(true)}
                          >
                            عرض رمز الاستجابة السريعة (QR Code) الدخول
                          </button>
                        ) : (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <h4 style={{ marginBottom: "16px" }}>رمز الدخول (QR Code)</h4>
                            <div style={{ display: "inline-block", background: "#fff", padding: "12px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(manageTarget.data.email + '|' + manageTarget.data.password)}`}
                                alt="QR Code"
                                style={{ width: "180px", height: "180px", display: "block" }}
                              />
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#8A9E99", marginTop: "16px", lineHeight: "1.5" }}>
                              للتسجيل مباشرة دون الحاجة لكتابة البريد الإلكتروني وكلمة المرور.
                            </p>
                            <button
                              className="btn-secondary"
                              style={{ marginTop: "12px", width: "100%" }}
                              onClick={() => window.print()}
                            >
                              طباعة الرمز
                            </button>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: "#E3A736", background: "rgba(227, 167, 54, 0.1)", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        لا يمكن توليد رمز استجابة سريعة، تنقص بيانات الدخول أو كلمة المرور المؤقتة.
                      </div>
                    )}
                  </div>
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
