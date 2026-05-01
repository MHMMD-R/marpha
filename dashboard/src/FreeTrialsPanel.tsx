import { collection, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Search, X, Clock, Settings, Power } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from './firebase';

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.8, 0.25, 1] }
});

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

export function FreeTrialsPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ defaultLengthDays: 7, defaultAccess: { allowedTeachers: [], allowedSubjects: [] } });
  
  const [search, setSearch] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings State
  const [editDays, setEditDays] = useState(7);
  const [editTeachers, setEditTeachers] = useState<string[]>([]);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);

  // Manual Grant Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualFoundStudent, setManualFoundStudent] = useState<any>(null);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [customTrialEndDate, setCustomTrialEndDate] = useState<string>("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), snap => {
      setStudents(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), snap => {
      setTeachers(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'freeTrial'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        setEditDays(data.defaultLengthDays || 7);
        setEditTeachers(data.defaultAccess?.allowedTeachers || []);
        setEditSubjects(data.defaultAccess?.allowedSubjects || []);
      }
    });
    return () => { unsubStudents(); unsubTeachers(); unsubSettings(); };
  }, []);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'freeTrial'), {
        defaultLengthDays: editDays,
        defaultAccess: {
          allowedTeachers: editTeachers,
          allowedSubjects: editSubjects,
        }
      });
      setIsSettingsOpen(false);
    } catch (err: any) {
      alert("خطأ في حفظ الإعدادات: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleSettingTeacher = (id: string) => {
    setEditTeachers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSettingSubject = (name: string) => {
    setEditSubjects(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const toggleUserFreeTrial = async (student: any) => {
    const currentTrial = student.freeTrial || {};
    const isActive = currentTrial.isActive || false;

    try {
      if (isActive) {
        // Revoke
        if (!confirm(`هل أنت متأكد من تعطيل الفترة التجريبية لـ ${student.name}؟`)) return;
        await updateDoc(doc(db, 'students', student.id), {
          "freeTrial.isActive": false
        });
      } else {
        // Grant
        if (!confirm(`هل أنت متأكد من تفعيل فترة تجريبية جديدة لـ ${student.name} بمدة ${settings.defaultLengthDays || 7} أيام؟`)) return;
        
        const lengthDays = settings.defaultLengthDays || 7;
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + lengthDays);

        await updateDoc(doc(db, 'students', student.id), {
          freeTrial: {
            isActive: true,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            access: settings.defaultAccess || { allowedTeachers: [], allowedSubjects: [] }
          }
        });
      }
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    }
  };

  const handleSearchManual = async () => {
    if (!manualId) return;
    setIsSearchingManual(true);
    try {
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'students'), where('userId', '==', manualId.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("لم يتم العثور على طالب بهذا المعرف");
        setManualFoundStudent(null);
      } else {
        setManualFoundStudent({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (err: any) {
      alert("خطأ في البحث: " + err.message);
    } finally {
      setIsSearchingManual(false);
    }
  };

  const handleGrantManualTrial = async () => {
    if (!manualFoundStudent) return;
    setIsSavingManual(true);
    try {
      let endDate: string;
      if (customTrialEndDate) {
        endDate = new Date(customTrialEndDate).toISOString();
      } else {
        const lengthDays = settings.defaultLengthDays || 7;
        const d = new Date();
        d.setDate(d.getDate() + lengthDays);
        endDate = d.toISOString();
      }

      await updateDoc(doc(db, 'students', manualFoundStudent.id), {
        freeTrial: {
          isActive: true,
          startDate: new Date().toISOString(),
          endDate: endDate,
          access: settings.defaultAccess || { allowedTeachers: [], allowedSubjects: [] }
        }
      });
      alert("تم تفعيل التجربة بنجاح");
      setIsManualModalOpen(false);
      setManualFoundStudent(null);
      setManualId("");
    } catch (err: any) {
      alert("خطأ في تفعيل التجربة: " + err.message);
    } finally {
      setIsSavingManual(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.includes(search) || 
    (s.userId && s.userId.includes(search))
  );

  return (<>
    <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <h3>إدارة الفترات التجريبية (Free Trials)</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
             onClick={() => setIsManualModalOpen(true)}
             style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--gold)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}
          >
            تفعيل تجربة يدوية
          </button>
          <button 
             onClick={handleOpenSettings}
             style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--emerald-main-main)", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}
          >
            <Settings size={16} />
            إعدادات التجربة
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ padding: "20px" }}>
        
        <div className="topbar-search" style={{ width: "100%", maxWidth: "400px", marginBottom: "20px" }}>
           <Search size={16} color="#8A9E99" />
           <input 
             type="text" 
             placeholder="بحث برقم المعرف أو الاسم..." 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
           />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف (ID)</th>
              <th>اسم الطالب</th>
              <th>حالة التجربة</th>
              <th>تاريخ الانتهاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => {
              const trial = student.freeTrial || {};
              const isActive = trial.isActive;
              const hasExpired = trial.endDate && new Date(trial.endDate) < new Date();
              const displayActive = isActive && !hasExpired;

              return (
                <tr key={student.id}>
                  <td>
                    <span style={{ fontWeight: "800", background: "var(--bg-body)", padding: "4px 8px", borderRadius: "6px" }}>
                      {student.userId || '—'}
                    </span>
                  </td>
                  <td>{student.name}</td>
                  <td>
                    {displayActive ? (
                       <span style={{ color: "var(--emerald-main-main)", fontWeight: "bold", background: "var(--emerald-main-lightest)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                         <Check size={12} /> فعالة
                       </span>
                    ) : isActive && hasExpired ? (
                       <span style={{ color: "var(--danger)", fontWeight: "bold", background: "rgba(255, 59, 48, 0.1)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                         <Clock size={12} /> منتهية
                       </span>
                    ) : (
                       <span style={{ color: "var(--text-tertiary)", fontWeight: "bold", background: "var(--border-light)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem" }}>
                         غير مفعلة
                       </span>
                    )}
                  </td>
                  <td style={{ color: trial.endDate ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                    {trial.endDate ? new Date(trial.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button 
                       className="btn-icon" 
                       onClick={() => toggleUserFreeTrial(student)} 
                       title={displayActive ? "إلغاء التفعيل" : "تفعيل فترة تجريبية"}
                       style={{ background: displayActive ? "rgba(255, 59, 48, 0.1)" : "var(--emerald-main-lightest)", color: displayActive ? "var(--danger)" : "var(--emerald-main-main)" }}
                    >
                      <Power size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
            لا يوجد نتائج
          </div>
        )}
      </div>

    </motion.div>
    {createPortal(
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", direction: "rtl", fontFamily: "Cairo", overflowY: "auto", padding: "40px 20px" }}
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", boxSizing: "border-box", margin: "auto 0" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem" }}>إعدادات الفترة التجريبية الافتراضية</h3>
                <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  <X size={20} color="var(--text-tertiary)" />
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "0.9rem" }}>مدة التجربة (بالأيام)</label>
                  <input
                    type="number"
                    value={editDays}
                    onChange={e => setEditDays(Number(e.target.value))}
                    style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid var(--border-light)", fontSize: "1rem", boxSizing: "border-box" }}
                    min={1}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <h4 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>المعلمين المسموحين في التجربة</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {teachers.map(t => {
                        const isSelected = editTeachers.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleSettingTeacher(t.id)}
                            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid", borderColor: isSelected ? "var(--gold)" : "var(--border-light)", background: isSelected ? "var(--gold-soft)" : "white", color: isSelected ? "var(--emerald-main-main)" : "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            {isSelected && <Check size={12} color="var(--emerald-main-main)" />} {t.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>المواد المسموحة في التجربة</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {IRAQI_SUBJECTS.map(subName => {
                        const isSelected = editSubjects.includes(subName);
                        return (
                          <div
                            key={subName}
                            onClick={() => toggleSettingSubject(subName)}
                            style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid", borderColor: isSelected ? "var(--emerald-main-main)" : "var(--border-light)", background: isSelected ? "var(--emerald-main-lightest)" : "white", color: isSelected ? "var(--emerald-main-main)" : "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            {isSelected && <Check size={12} color="var(--emerald-main-main)" />} {subName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  style={{ width: "100%", marginTop: "32px", padding: "14px", background: "var(--emerald-main-main)", color: "white", borderRadius: "12px", border: "none", fontWeight: "bold", cursor: isSavingSettings ? "not-allowed" : "pointer" }}
                >
                  {isSavingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    {createPortal(
      <AnimatePresence>
        {isManualModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", direction: "rtl", fontFamily: "Cairo", overflowY: "auto", padding: "40px 20px" }}
            onClick={() => { setIsManualModalOpen(false); setManualFoundStudent(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", boxSizing: "border-box", margin: "auto 0" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem" }}>تفعيل تجربة لطالب يدوياً</h3>
                <button onClick={() => { setIsManualModalOpen(false); setManualFoundStudent(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={20} color="var(--text-tertiary)" />
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <input 
                    type="text" 
                    placeholder="أدخل معرف الطالب (6 أرقام)..." 
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid var(--border-light)", fontSize: "1rem" }}
                  />
                  <button 
                    onClick={handleSearchManual}
                    disabled={isSearchingManual}
                    style={{ padding: "0 20px", background: "var(--emerald-main-main)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    {isSearchingManual ? "جاري البحث..." : "بحث"}
                  </button>
                </div>

                {manualFoundStudent && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ padding: "12px", background: "var(--bg-body)", borderRadius: "8px", marginBottom: "20px", border: "1px solid var(--border-light)" }}>
                      <p style={{ margin: 0, fontWeight: "bold", color: "var(--text-primary)" }}>الطالب: {manualFoundStudent.name}</p>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>تاريخ الانتهاء (اختياري)</label>
                      <input
                        type="date"
                        value={customTrialEndDate}
                        onChange={(e) => setCustomTrialEndDate(e.target.value)}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-light)", boxSizing: "border-box" }}
                      />
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "6px" }}>
                        اترك فارغاً لاستخدام المدة الافتراضية ({settings.defaultLengthDays} أيام).
                      </p>
                    </div>

                    <button
                      onClick={handleGrantManualTrial}
                      disabled={isSavingManual}
                      style={{ width: "100%", padding: "14px", background: "var(--emerald-main-main)", color: "white", borderRadius: "12px", border: "none", fontWeight: "bold", cursor: "pointer" }}
                    >
                      {isSavingManual ? "جاري التفعيل..." : "تفعيل التجربة الآن"}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>);
}
