import { collection, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Search, ShieldAlert, X, Settings } from 'lucide-react';
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

export function SubscriptionsPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Modal state
  const [subType, setSubType] = useState<"full" | "limited" | "none">("full");
  const [subEndDate, setSubEndDate] = useState<string>("");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Pricing Modal state
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [fullPrice, setFullPrice] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), snap => {
      setStudents(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), snap => {
      setTeachers(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'subscription_price'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setFullPrice(d.fullPrice || 0);
        setItemPrice(d.itemPrice || 0);
      }
    });
    return () => { unsubStudents(); unsubTeachers(); unsubSettings(); };
  }, []);

  const handleOpenModal = (student: any) => {
    setSelectedStudent(student);
    const sub = student.subscription || { type: 'none', allowedTeachers: [], allowedSubjects: [] };
    setSubType((sub.type === 'limited' || sub.type === 'full') ? sub.type : 'none');
    setSelectedTeachers(sub.allowedTeachers || []);
    setSelectedSubjects(sub.allowedSubjects || []);
    setSubEndDate(sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : "");
  };

  const generateMissingId = async (student: any) => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    await updateDoc(doc(db, 'students', student.id), {
       userId: newId,
       subscription: student.subscription || { type: 'full', allowedTeachers: [], allowedSubjects: [] }
    });
  };

  const handleSaveSubscription = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        subscription: {
          type: subType,
          allowedTeachers: subType === 'limited' ? selectedTeachers : [],
          allowedSubjects: subType === 'limited' ? selectedSubjects : [],
          endDate: subEndDate ? new Date(subEndDate).toISOString() : null,
        }
      });
      setSelectedStudent(null);
    } catch (err: any) {
      alert("خطأ في حفظ الاشتراك: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTeacher = (id: string) => {
    setSelectedTeachers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrices(true);
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, 'settings', 'subscription_price'), {
         fullPrice: Number(fullPrice),
         itemPrice: Number(itemPrice)
      }, { merge: true });
      alert("تم حفظ الأسعار بنجاح");
      setIsPricingModalOpen(false);
    } catch(err: any) {
      alert("خطأ في الحفظ: " + err.message);
    } finally {
      setIsSavingPrices(false);
    }
  };

  const patchLegacyUsers = async () => {
    if(!confirm("سيتم تعيين معرف 6 أرقام للطلاب الذين لا يملكون واحداً واشتراك شامل. هل توافق؟")) return;
    try {
      const batch = writeBatch(db);
      let count = 0;
      students.forEach(s => {
        if (!s.userId) {
          const newId = Math.floor(100000 + Math.random() * 900000).toString();
          batch.update(doc(db, 'students', s.id), {
            userId: newId,
            subscription: s.subscription || { type: 'full', allowedTeachers: [], allowedSubjects: [] }
          });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        alert(`تم ترحيل ${count} طالب بنجاح!`);
      } else {
        alert("جميع الطلاب يملكون معرف مستخدم بالفعل.");
      }
    } catch(err: any) {
      alert("خطأ في الترحيل: " + err.message);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.includes(search) || 
    (s.userId && s.userId.includes(search))
  );

  return (<>
    <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <h3>إدارة الاشتراكات</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
             onClick={() => setIsPricingModalOpen(true)}
             style={{ background: "var(--bg-body)", color: "var(--text-primary)", border: "1px solid var(--border-light)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Settings size={16} /> إعدادات الأسعار
          </button>
          <button 
             onClick={patchLegacyUsers}
             style={{ background: "var(--emerald-main-main)", color: "white", padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
          >
            ترقية الطلاب الجدد
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
              <th>نوع الاشتراك</th>
              <th>خيارات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => {
              const sub = student.subscription || { type: 'full' };
              const idString = student.userId || '—';
              
              return (
                <tr key={student.id}>
                  <td>
                    <span style={{ fontWeight: "800", background: "var(--bg-body)", padding: "4px 8px", borderRadius: "6px" }}>
                      {idString}
                    </span>
                    {!student.userId && (
                      <button onClick={() => generateMissingId(student)} style={{ marginRight: 8, fontSize: "0.75rem", background: "var(--gold)", color: "white", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}>
                         توليد معرف
                      </button>
                    )}
                  </td>
                  <td>{student.name}</td>
                  <td>
                    {sub.type === 'limited' ? (
                       <span style={{ color: "var(--gold)", fontWeight: "bold", background: "var(--gold-soft)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem" }}>مخصص</span>
                    ) : sub.type === 'full' ? (
                       <span style={{ color: "var(--emerald-main-main)", fontWeight: "bold", background: "var(--emerald-main-soft)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem" }}>شامل</span>
                    ) : (
                       <span style={{ color: "#EF4444", fontWeight: "bold", background: "#FEF2F2", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem" }}>بدون اشتراك</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleOpenModal(student)} title="إدارة الاشتراك">
                      <ShieldAlert size={18} color="var(--emerald-main-main)" />
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
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", direction: "rtl", fontFamily: "Cairo", overflowY: "auto", padding: "40px 20px" }}
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", boxSizing: "border-box", margin: "auto 0" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem" }}>إدارة اشتراك: {selectedStudent.name}</h3>
                <button onClick={() => setSelectedStudent(null)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  <X size={20} color="var(--text-tertiary)" />
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setSubType("full")}
                    style={{ flex: 1, padding: "10px", borderRadius: "12px", border: subType === "full" ? "2px solid var(--emerald-main-main)" : "1px solid var(--border-light)", background: subType === "full" ? "var(--emerald-main-soft)" : "white", fontWeight: "bold", color: subType === "full" ? "var(--emerald-main-main)" : "var(--text-secondary)", cursor: "pointer" }}
                  >
                    اشتراك شامل
                  </button>
                  <button
                    onClick={() => setSubType("limited")}
                    style={{ flex: 1, padding: "10px", borderRadius: "12px", border: subType === "limited" ? "2px solid var(--gold)" : "1px solid var(--border-light)", background: subType === "limited" ? "var(--gold-soft)" : "white", fontWeight: "bold", color: subType === "limited" ? "var(--gold)" : "var(--text-secondary)", cursor: "pointer" }}
                  >
                    تخصيص
                  </button>
                  <button
                    onClick={() => setSubType("none")}
                    style={{ flex: 1, padding: "10px", borderRadius: "12px", border: subType === "none" ? "2px solid #EF4444" : "1px solid var(--border-light)", background: subType === "none" ? "#FEF2F2" : "white", fontWeight: "bold", color: subType === "none" ? "#EF4444" : "var(--text-secondary)", cursor: "pointer" }}
                  >
                    بدون اشتراك
                  </button>
                </div>

                {subType !== "none" && (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "var(--text-primary)" }}>تاريخ إنهاء الاشتراك (اختياري)</label>
                    <input
                      type="date"
                      value={subEndDate}
                      onChange={(e) => setSubEndDate(e.target.value)}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-light)", background: "white", boxSizing: "border-box" }}
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>اترك الحقل فارغاً إذا كان الاشتراك غير محدد المدة.</p>
                  </div>
                )}

                {subType === "limited" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <h4 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>المعلمين المسموحين</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {teachers.map(t => {
                          const isSelected = selectedTeachers.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTeacher(t.id)}
                              style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid", borderColor: isSelected ? "var(--gold)" : "var(--border-light)", background: isSelected ? "var(--gold)" : "white", color: isSelected ? "white" : "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              {isSelected && <Check size={12} />} {t.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>المواد المسموحة</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {IRAQI_SUBJECTS.map(subName => {
                          const isSelected = selectedSubjects.includes(subName);
                          return (
                            <div
                              key={subName}
                              onClick={() => toggleSubject(subName)}
                              style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid", borderColor: isSelected ? "var(--emerald-main-main)" : "var(--border-light)", background: isSelected ? "var(--emerald-main-main)" : "white", color: isSelected ? "white" : "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              {isSelected && <Check size={12} />} {subName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveSubscription}
                  disabled={isSaving}
                  style={{ width: "100%", marginTop: "24px", padding: "14px", background: "var(--emerald-main-main)", color: "white", borderRadius: "12px", border: "none", fontWeight: "bold", cursor: isSaving ? "not-allowed" : "pointer" }}
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
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
        {isPricingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", direction: "rtl", fontFamily: "Cairo", overflowY: "auto", padding: "40px 20px" }}
            onClick={() => setIsPricingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "400px", padding: "24px", boxSizing: "border-box", margin: "auto 0" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>تحديد أسعار الاشتراكات</h3>
                <button onClick={() => setIsPricingModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={20} color="var(--text-tertiary)" />
                </button>
              </div>

              <form onSubmit={handleSavePrices}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    سعر الاشتراك الشامل (IQD)
                  </label>
                  <input
                    type="number"
                    value={fullPrice}
                    onChange={(e) => setFullPrice(Number(e.target.value))}
                    min="0"
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-light)", background: "var(--bg-body)", boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>السعر المطبق على الطلاب أصحاب الوصول المفتوح لجميع المواد والمعلمين.</p>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    سعر الاشتراك المخصص (للمادة / المعلم) (IQD)
                  </label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    min="0"
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-light)", background: "var(--bg-body)", boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>السعر المطبق لكل معلم أو مادة يتم تحديدها في الاشتراك المخصص.</p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setIsPricingModalOpen(false)}
                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid var(--border-light)", background: "white", color: "var(--text-secondary)", fontWeight: "bold", cursor: "pointer" }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPrices}
                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "var(--emerald-main-main)", color: "white", fontWeight: "bold", cursor: isSavingPrices ? "not-allowed" : "pointer" }}
                  >
                    {isSavingPrices ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>);
}
