import { motion } from "framer-motion";
import {
    Bell,
    BookOpen,
    Check,
    ChevronLeft,
    GraduationCap,
    LayoutDashboard,
    Search,
    Settings,
    TrendingDown,
    TrendingUp,
    Users,
    Video,
    X,
    XCircle,
} from "lucide-react";
import "./index.css";

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { uploadToR2 } from "./r2";

// ─── Data ───────────────────────────────────────────────────────
const STATS = [
  { title: "إجمالي الطلاب", value: "1,247", trend: "+12%", up: true, icon: Users, color: "#12453D", bg: "#EEF5F3" },
  { title: "المحاضرات", value: "186", trend: "+8%", up: true, icon: Video, color: "#E3A736", bg: "#FFF8E8" },
  { title: "المواد الدراسية", value: "7", trend: "—", up: true, icon: BookOpen, color: "#3B82F6", bg: "#EFF6FF" },
  { title: "نسبة الإنجاز", value: "73%", trend: "+5%", up: true, icon: TrendingUp, color: "#10B981", bg: "#ECFDF5" },
];

const ACTIVITIES = [
  { text: "تم رفع محاضرة جديدة في الفيزياء", time: "منذ 5 دقائق", color: "#12453D" },
  { text: "أحمد محمد أكمل اختبار الكيمياء", time: "منذ 15 دقيقة", color: "#10B981" },
  { text: "تم تحديث منهج الرياضيات", time: "منذ ساعة", color: "#E3A736" },
  { text: "فاطمة علي بدأت مشاهدة محاضرة جديدة", time: "منذ ساعتين", color: "#3B82F6" },
  { text: "تم إضافة 12 طالب جديد", time: "منذ 3 ساعات", color: "#CD713C" },
];

const FALLBACK_SUBJECTS = [
  { title: "الفيزياء", lessons: 35, progress: 55, color: "#12453D", bg: "#EEF5F3", teacherName: "أ. عبدالكريم", teacherImage: "https://i.pravatar.cc/150?u=physics" },
  { title: "الكيمياء", lessons: 33, progress: 45, color: "#E3A736", bg: "#FFF8E8", teacherName: "أ. سعد", teacherImage: "https://i.pravatar.cc/150?u=chemistry" },
  { title: "الرياضيات", lessons: 40, progress: 90, color: "#3B82F6", bg: "#EFF6FF", teacherName: "أ. حيدر", teacherImage: "https://i.pravatar.cc/150?u=math" },
  { title: "الأحياء", lessons: 38, progress: 85, color: "#10B981", bg: "#ECFDF5", teacherName: "أ. مريم", teacherImage: "https://i.pravatar.cc/150?u=bio" },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "لوحة التحكم", id: "dashboard" },
  { icon: Users, label: "الطلاب", badge: "1.2K", id: "students" },
  { icon: Users, label: "المعلمون", id: "teachers" },
  { icon: BookOpen, label: "المواد", id: "subjects" },
  { icon: Video, label: "المحاضرات", id: "videos" },
  { icon: Bell, label: "طلبات الرفع", id: "requests" },
  { icon: GraduationCap, label: "الاختبارات", id: "exams" },
];

const NAV_ITEMS_SYSTEM = [
  { icon: Bell, label: "الإشعارات", badge: "3" },
  { icon: Settings, label: "الإعدادات" },
];

// ─── Animation helpers ──────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
});

// ─── App ────────────────────────────────────────────────────────
function App() {
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
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoSubject, setNewVideoSubject] = useState("");
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherSubject || !newTeacherEmail || !newTeacherPassword) return;
    
    setIsAddingTeacher(true);
    try {
      // Use secondaryAuth so the dashboard user (admin) doesn't get logged out!
      const { secondaryAuth } = await import("./firebase");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newTeacherEmail, newTeacherPassword);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: newTeacherName });

      // Save to firestore using the primary db instance (since admin has rights)
      await setDoc(doc(db, "teachers", user.uid), {
        uid: user.uid,
        name: newTeacherName,
        email: newTeacherEmail,
        subject: newTeacherSubject,
        image: "https://i.pravatar.cc/150?u=" + user.uid,
        createdAt: new Date().toISOString()
      });

      // Quick logout from the secondary instance to clear its session completely
      await secondaryAuth.signOut();

      // Reset form and close modal
      setNewTeacherName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
      setNewTeacherSubject("");
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
      const userCredential = await createUserWithEmailAndPassword(auth, newStudentEmail, newStudentPassword);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: newStudentName });

      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        name: newStudentName,
        email: newStudentEmail,
        subject: "عام",
        progress: 0,
        status: "active",
        createdAt: new Date().toISOString()
      });

      // Reset form and close modal
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
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
        subject: newVideoSubject,
        videoUrl: publicUrl,
        createdAt: new Date().toISOString()
      });

      // Reset form
      setNewVideoTitle("");
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
          setSubjects(FALLBACK_SUBJECTS);
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

  return (
    <div className="app-layout">
      {/* ═══ Sidebar ═══ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <GraduationCap size={22} color="#fff" />
          </div>
          <div>
            <h1>مرفأ</h1>
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
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}

          <div className="nav-section-label">النظام</div>
          {NAV_ITEMS_SYSTEM.map((item, i) => (
            <a key={i} className="nav-item">
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">م</div>
            <div className="sidebar-user-info">
              <h4>المشرف العام</h4>
              <p style={{ cursor: "pointer", color: "var(--gold)", fontSize: "0.65rem", fontWeight: "bold" }}>تعديل الملف الشخصي</p>
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
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد طلاب مسجلين.</td>
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
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", padding: "40px", color: "#8A9E99" }}>لا يوجد معلمين مسجلين.</td>
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
                <input 
                  type="text" 
                  value={newTeacherSubject} 
                  onChange={(e) => setNewTeacherSubject(e.target.value)} 
                  placeholder="مثال: الرياضيات"
                  required
                  disabled={isAddingTeacher}
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
    </div>
  );
}

export default App;
