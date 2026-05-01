import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, ChevronLeft, MessageCircle, Search, Shield, User, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

const fadeUp = (delay = 0): any => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.8, 0.25, 1] }
});

export function GroupsPanel({ initialTeacherId }: { initialTeacherId?: string }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  useEffect(() => {
    if (initialTeacherId && teachers.length > 0) {
      const t = teachers.find((x: any) => x.id === initialTeacherId || x.uid === initialTeacherId);
      if (t && (!selectedTeacher || selectedTeacher.id !== t.id)) {
        setSelectedTeacher(t);
      }
    }
  }, [initialTeacherId, teachers]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mutedStudents, setMutedStudents] = useState<any>({});
  const [isGroupMuted, setIsGroupMuted] = useState(false);
  const [search, setSearch] = useState("");
  // State for the student modal
  const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string, isMuted: boolean } | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'teachers'), snap => {
      setTeachers(snap.docs.map(t => ({ id: t.id, ...t.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedTeacher) return;
    
    // Group settings
    const groupRef = doc(db, 'groups', selectedTeacher.id);
    const unsubSettings = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsGroupMuted(!!data.isMuted);
        setMutedStudents(data.mutedStudents || {});
      } else {
        setIsGroupMuted(false);
        setMutedStudents({});
      }
    });

    // Group messages
    const msgsRef = collection(db, 'groups', selectedTeacher.id, 'group_messages');
    const unsubMsgs = onSnapshot(msgsRef, (snap) => {
       const msgs = snap.docs.map(x => ({ id: x.id, ...x.data() })) as any[];
       msgs.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
       setMessages(msgs);
    });

    return () => { unsubSettings(); unsubMsgs(); };
  }, [selectedTeacher]);

  const toggleGroupMute = async () => {
    if (!selectedTeacher) return;
    await updateDoc(doc(db, 'groups', selectedTeacher.id), {
      isMuted: !isGroupMuted
    }).catch(async (e) => {
       console.log(e);
       alert("لم يتم إنشاء هذه المجموعة بعد، يجب على المعلم إرسال رسالة أولاً");
    });
  };

  const toggleStudentMute = async (studentId: string, currentStatus: boolean) => {
    if (!selectedTeacher) return;
    await updateDoc(doc(db, 'groups', selectedTeacher.id), {
       [`mutedStudents.${studentId}`]: !currentStatus
    });
    
    // Update local modal state if open
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, isMuted: !currentStatus } : null);
    }
  };

  const filteredTeachers = teachers.filter(t => t.name?.includes(search) || t.subject?.includes(search));

  return (
    <motion.div className="panel-card glass-card" {...fadeUp(0.1)} style={{ minHeight: "60vh", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <h3>مجموعات النقاش</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <span className="panel-header-action" onClick={() => setSelectedTeacher(null)}><ChevronLeft size={14} style={{ verticalAlign: "middle" }} /> رجوع</span>
        </div>
      </div>

      <div className="panel-body" style={{ flex: 1, display: "flex", gap: "20px", padding: "10px", height: "600px", position: "relative" }}>
        
        {/* Teachers List Sidebar */}
        <div style={{ width: "300px", borderLeft: "1px solid var(--border-light)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0 0 15px 15px" }}>
            <div className="topbar-search" style={{ width: "100%", margin: 0, padding: "8px 12px" }}>
               <Search size={14} color="#8A9E99" />
               <input 
                 type="text" 
                 placeholder="بحث عن معلم..." 
                 value={search} 
                 onChange={e => setSearch(e.target.value)} 
               />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingLeft: "15px" }}>
            {filteredTeachers.map(t => (
              <div 
                key={t.id}
                onClick={() => setSelectedTeacher(t)}
                style={{ 
                   display: "flex", 
                   alignItems: "center", 
                   gap: "10px", 
                   padding: "12px", 
                   borderRadius: "8px", 
                   marginBottom: "8px",
                   cursor: "pointer",
                   background: selectedTeacher?.id === t.id ? "var(--emerald-main-main)" : "#F4F7F6",
                   color: selectedTeacher?.id === t.id ? "white" : "inherit",
                   transition: "all 0.2s ease"
                }}
              >
                <div style={{
                   width: "36px", height: "36px", borderRadius: "50%", 
                   background: selectedTeacher?.id === t.id ? "var(--gold)" : "white",
                   display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                   <MessageCircle size={18} color={selectedTeacher?.id === t.id ? "white" : "var(--emerald-main-main)"} />
                </div>
                <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{t.name}</div>
                   <div style={{ fontSize: "0.75rem", opacity: selectedTeacher?.id === t.id ? 0.8 : 0.6 }}>{t.subject || 'عام'}</div>
                </div>
              </div>
            ))}
            {filteredTeachers.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-tertiary)" }}>
                لا يوجد نتائج
              </div>
            )}
          </div>
        </div>

        {/* Selected Group details */}
        {selectedTeacher ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8faf9", borderRadius: "12px", overflow: "hidden" }}>
             
             {/* Chat App Style Header */}
             <div 
               onClick={() => setShowGroupInfo(true)}
               style={{ 
                 padding: "15px 20px", background: "white", borderBottom: "1px solid var(--border-light)", 
                 display: "flex", justifyContent: "space-between", alignItems: "center",
                 cursor: "pointer", transition: "background 0.2s"
               }}
               onMouseEnter={(e) => e.currentTarget.style.background = "#f4f7f6"}
               onMouseLeave={(e) => e.currentTarget.style.background = "white"}
               title="عرض معلومات المجموعة"
             >
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                   <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--emerald-main-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MessageCircle size={22} color="white" />
                   </div>
                   <div>
                      <h3 style={{ fontSize: "1.1rem", margin: "0 0 2px 0", color: "var(--text-primary)" }}>{selectedTeacher.name}</h3>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}>
                         <User size={12} /> انقر لعرض معلومات وإعدادات المجموعة
                      </div>
                   </div>
                </div>
                <div>
                   <ChevronLeft size={20} color="var(--text-tertiary)" style={{ transform: "rotate(180deg)" }} />
                </div>
             </div>

             {/* Messages Log */}
             <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: "10px" }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                    <MessageCircle size={48} style={{ opacity: 0.3, margin: "0 auto 10px auto" }} />
                    <p>لا توجد رسائل في هذه المجموعة بعد</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isTeacher = msg.senderId === selectedTeacher.id;
                    const isMuted = mutedStudents[msg.senderId];

                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isTeacher ? "flex-start" : "flex-end" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            {isTeacher && <Shield size={12} color="var(--gold)" />}
                            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: "bold" }}>
                               {msg.senderName} {isTeacher ? '(المعلم)' : ''}
                            </span>
                            
                            {/* NEW: Small circle for Student Info / Settings */}
                            {!isTeacher && (
                               <div 
                                 onClick={() => setSelectedStudent({ id: msg.senderId, name: msg.senderName, isMuted })}
                                 style={{ 
                                   width: "20px", height: "20px", borderRadius: "50%", 
                                   background: isMuted ? "var(--red-danger-bg)" : "#e2e8f0", 
                                   display: "flex", alignItems: "center", justifyContent: "center",
                                   cursor: "pointer", marginRight: "6px",
                                   border: "1px solid", borderColor: isMuted ? "var(--red-danger)" : "transparent"
                                 }}
                                 title="خيارات الطالب"
                               >
                                 {isMuted ? <Ban size={10} color="var(--red-danger)" /> : <User size={12} color="var(--text-secondary)" />}
                               </div>
                            )}
                         </div>
                         <div style={{ 
                            padding: "10px 15px", borderRadius: "12px", maxWidth: "75%", fontSize: "0.9rem",
                            background: isTeacher ? "var(--emerald-main-soft)" : "white",
                            color: isTeacher ? "white" : "var(--text-primary)",
                            border: isTeacher ? "none" : "1px solid var(--border-light)",
                            borderTopRightRadius: isTeacher ? "0" : "12px",
                            borderTopLeftRadius: isTeacher ? "12px" : "0"
                         }}>
                            {msg.text}
                         </div>
                      </div>
                    );
                  })
                )}
             </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", background: "#f8faf9", borderRadius: "12px" }}>
             <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: "15px" }} />
             <p style={{ fontSize: "1.1rem" }}>الرجاء اختيار مجموعة من القائمة للمعلم</p>
          </div>
        )}

        {/* Student Settings Modal */}
        <AnimatePresence>
          {selectedStudent && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.5)", zIndex: 100,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "12px"
              }}
              onClick={() => setSelectedStudent(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "white", padding: "24px", borderRadius: "16px",
                  width: "320px", boxShadow: "var(--shadow-lg)",
                  position: "relative"
                }}
              >
                <button 
                  onClick={() => setSelectedStudent(null)}
                  style={{ position: "absolute", top: "15px", left: "15px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
                >
                  <X size={18} />
                </button>
                
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "var(--bg-body)", color: "var(--emerald-main-main)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px auto" }}>
                    <User size={28} />
                  </div>
                  <h3 style={{ margin: "0 0 5px 0", color: "var(--text-primary)" }}>{selectedStudent.name}</h3>
                  <span style={{ fontSize: "0.75rem", background: "var(--bg-body)", padding: "4px 8px", borderRadius: "6px", color: "var(--text-secondary)" }}>
                    ID: {selectedStudent.id.substring(0, 6)}...
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button 
                    onClick={() => toggleStudentMute(selectedStudent.id, selectedStudent.isMuted)}
                    style={{
                      width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: "bold",
                      background: selectedStudent.isMuted ? "var(--bg-body)" : "var(--red-danger-bg)",
                      color: selectedStudent.isMuted ? "var(--text-secondary)" : "var(--red-danger)"
                    }}
                  >
                    <Ban size={16} />
                    {selectedStudent.isMuted ? "إلغاء حظر المراسلة" : "منع من المراسلة"}
                  </button>
                  
                  {/* Future admin actions can go here */}
                  <button style={{
                     width: "100%", padding: "10px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-light)",
                     color: "var(--text-secondary)", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                  }}>
                    <Shield size={16} /> ترقية كمشرف (قريباً)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Settings / Info Modal */}
        <AnimatePresence>
          {showGroupInfo && selectedTeacher && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.5)", zIndex: 100,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "12px"
              }}
              onClick={() => setShowGroupInfo(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "white", padding: "30px", borderRadius: "16px",
                  width: "360px", boxShadow: "var(--shadow-lg)",
                  position: "relative"
                }}
              >
                <button 
                  onClick={() => setShowGroupInfo(false)}
                  style={{ position: "absolute", top: "15px", left: "15px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
                >
                  <X size={18} />
                </button>
                
                <div style={{ textAlign: "center", marginBottom: "25px" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--emerald-main-main)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto" }}>
                    <MessageCircle size={36} />
                  </div>
                  <h3 style={{ margin: "0 0 5px 0", color: "var(--text-primary)", fontSize: "1.3rem" }}>{selectedTeacher.name}</h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", background: "var(--bg-body)", padding: "4px 10px", borderRadius: "8px", display: "inline-block" }}>
                    مادة: {selectedTeacher.subject || 'عام'}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-body)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                      <Shield size={16} /> عدد الرسائل
                    </div>
                    <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{messages.length}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-body)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                      <Ban size={16} /> الطلاب المحظورين
                    </div>
                    <span style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{Object.keys(mutedStudents).filter(k => mutedStudents[k]).length}</span>
                  </div>

                  <button 
                    onClick={toggleGroupMute}
                    style={{
                      width: "100%", padding: "14px", borderRadius: "8px", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: "bold", marginTop: "10px",
                      background: isGroupMuted ? "var(--bg-body)" : "var(--red-danger-bg)",
                      color: isGroupMuted ? "var(--text-secondary)" : "var(--red-danger)"
                    }}
                  >
                    {isGroupMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    {isGroupMuted ? "إلغاء حظر المجموعة بالكامل" : "حظر المجموعة بالكامل"}
                  </button>
                  
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
