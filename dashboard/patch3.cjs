const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add manageTargetTab state
const stateTarget = `  const [manageTarget, setManageTarget] = useState<{ type: 'student' | 'teacher', data: any } | null>(null);`;
const stateReplacement = `  const [manageTarget, setManageTarget] = useState<{ type: 'student' | 'teacher', data: any } | null>(null);
  const [manageTargetTab, setManageTargetTab] = useState<'stats'|'videos'|'chat'|'settings'>('stats');`;

content = content.replace(stateTarget, stateReplacement);

// 2. Add handleManageClick helper
const helperTarget = `  const [newAdminPassword, setNewAdminPassword] = useState("");`;
const helperReplacement = `  const [newAdminPassword, setNewAdminPassword] = useState("");

  const handleManageClick = (type: 'student' | 'teacher', data: any) => {
    setManageTarget({ type, data });
    setManageTargetTab('stats');
    setShowQR(false);
    setIsEditingUser(false);
  };`;

content = content.replace(helperTarget, helperReplacement);

// 3. Replace all onClick handlers that open manage modal
content = content.replace(
  /onClick=\{\(\) => \{ setManageTarget\(\{ type: 'teacher', data: t \}\); setShowQR\(false\); setIsEditingUser\(false\); \}\}/g,
  `onClick={() => handleManageClick('teacher', t)}`
);

content = content.replace(
  /onClick=\{\(\) => \{ setManageTarget\(\{ type: 'student', data: s \}\); setShowQR\(false\); setIsEditingUser\(false\); \}\}/g,
  `onClick={() => handleManageClick('student', s)}`
);


// 4. Update the Teacher modal content
// I will locate the block from `{!isEditingUser ? (` and replace the inside conditionally.
// For student, keep existing. For teacher, use manageTargetTab.

const modalTarget = `              {!isEditingUser ? (
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
                  </div>`;

// Note: I only grab up to the password div, then the student device bind starts.
// I will replace this section with the new Teacher UI and preserve the Student UI.

const modalReplacement = `              {!isEditingUser ? (
                <>
                  {manageTarget.type === 'teacher' && (
                    <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "1px solid #E8EDEC", paddingBottom: "10px", overflowX: "auto" }}>
                       <button onClick={() => setManageTargetTab('stats')} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", background: manageTargetTab === 'stats' ? "#12453D" : "transparent", color: manageTargetTab === 'stats' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap" }}>الإحصائيات</button>
                       <button onClick={() => setManageTargetTab('videos')} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", background: manageTargetTab === 'videos' ? "#12453D" : "transparent", color: manageTargetTab === 'videos' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap" }}>المحاضرات</button>
                       <button onClick={() => { setActiveTab("groups"); setManageTarget(null); }} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", background: "transparent", color: "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap" }}>الدردشة</button>
                       <button onClick={() => setManageTargetTab('settings')} style={{ padding: "8px 12px", border: "none", borderRadius: "8px", background: manageTargetTab === 'settings' ? "#12453D" : "transparent", color: manageTargetTab === 'settings' ? "#fff" : "#8A9E99", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap" }}>الإعدادات</button>
                    </div>
                  )}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'stats' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId);
                     const teacherPlaylistsCount = new Set(teacherVideos.map((v: any) => v.playlistName).filter(Boolean)).size;
                     const subscribedStudents = students.filter(s => studentCanReceiveSubjectNotification(s, manageTarget.data.subject, [manageTarget.data])).length;
                     
                     return (
                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                          <div style={{ background: "#F4F7F6", padding: "15px", borderRadius: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#12453D" }}>{subscribedStudents}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99" }}>طالب مشترك</div>
                          </div>
                          <div style={{ background: "#F4F7F6", padding: "15px", borderRadius: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#12453D" }}>{teacherVideos.length}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99" }}>محاضرة مرفوعة</div>
                          </div>
                          <div style={{ background: "#F4F7F6", padding: "15px", borderRadius: "12px", textAlign: "center", gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#12453D" }}>{teacherPlaylistsCount}</div>
                            <div style={{ fontSize: "0.8rem", color: "#8A9E99" }}>قائمة تشغيل</div>
                          </div>
                       </div>
                     );
                  })()}

                  {manageTarget.type === 'teacher' && manageTargetTab === 'videos' && (() => {
                     const teacherId = manageTarget.data.id || manageTarget.data.uid;
                     const teacherVideos = videos.filter((v: any) => v.teacherId === teacherId && (v.status === "accepted" || v.status === "active" || !v.status));
                     if (teacherVideos.length === 0) return <div style={{ textAlign: "center", padding: "20px", color: "#8A9E99" }}>لا توجد محاضرات.</div>;
                     
                     return (
                       <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", paddingRight: "5px" }}>
                          {teacherVideos.map((v: any) => (
                             <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F7F6", padding: "12px", borderRadius: "8px" }}>
                               <div>
                                 <h5 style={{ margin: "0 0 4px 0", color: "#12453D" }}>{v.title}</h5>
                                 <div style={{ fontSize: "0.75rem", color: "#8A9E99" }}>{v.playlistName || 'بدون قائمة'}</div>
                               </div>
                               <button onClick={() => handleDeleteVideo(v.id)} style={{ background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: "4px" }}><Trash2 size={16} /></button>
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

                      <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid #E8EDEC" }}>
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
                  )}`;


// Since `modalTarget` string matching might fail because of whitespace, let's use a regex replace or just replace a smaller chunk.
// I will carefully replace the parts.
content = content.replace(modalTarget.replace(/\r\n/g, '\n'), modalReplacement);
content = content.replace(modalTarget, modalReplacement);

// We need to hide the action buttons when in 'videos' or 'stats' tab (if it's a teacher).
// Look for `<div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>` and ` <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>`
const actionButtonsTarget = `                  <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
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
                  </div>`;

const actionButtonsReplacement = `                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || manageTarget.type === 'student') && (
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
                  )}`;

content = content.replace(actionButtonsTarget, actionButtonsReplacement);
content = content.replace(actionButtonsTarget.replace(/\n/g, '\r\n'), actionButtonsReplacement);

const qrCodeTarget = `                  <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                    {(manageTarget.data.username || manageTarget.data.email) && manageTarget.data.password ? (`;

const qrCodeReplacement = `                  {((manageTarget.type === 'teacher' && manageTargetTab === 'settings') || manageTarget.type === 'student') && (
                    <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                      {(manageTarget.data.username || manageTarget.data.email) && manageTarget.data.password ? (`

content = content.replace(qrCodeTarget, qrCodeReplacement);
content = content.replace(qrCodeTarget.replace(/\n/g, '\r\n'), qrCodeReplacement);

// To close the new block we added above:
const qrCodeEndTarget = `                      <div style={{ color: "#E3A736", background: "rgba(227, 167, 54, 0.1)", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        لا يمكن توليد رمز استجابة سريعة، تنقص بيانات الدخول أو كلمة المرور.
                      </div>
                    )}
                  </div>`;

const qrCodeEndReplacement = `                      <div style={{ color: "#E3A736", background: "rgba(227, 167, 54, 0.1)", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        لا يمكن توليد رمز استجابة سريعة، تنقص بيانات الدخول أو كلمة المرور.
                      </div>
                    )}
                  </div>
                  )}`;

content = content.replace(qrCodeEndTarget, qrCodeEndReplacement);
content = content.replace(qrCodeEndTarget.replace(/\n/g, '\r\n'), qrCodeEndReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Patch 3 done');
